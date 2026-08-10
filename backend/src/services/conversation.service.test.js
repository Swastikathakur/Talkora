import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Conversation from '../models/conversation.model.js';
import {
  findOrCreatePrivateConversation,
  createGroupConversation,
  removeMember,
  assertParticipant,
} from './conversation.service.js';

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Conversation.deleteMany({});
});

describe('findOrCreatePrivateConversation', () => {
  it('does not create duplicate DM threads between the same two users', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();

    const first = await findOrCreatePrivateConversation(userA, userB);
    const second = await findOrCreatePrivateConversation(userB, userA); // reversed order

    expect(first._id.toString()).toBe(second._id.toString());

    const count = await Conversation.countDocuments({});
    expect(count).toBe(1);
  });
});

describe('removeMember', () => {
  it('prevents removing the last remaining admin', async () => {
    const creator = new mongoose.Types.ObjectId();
    const member = new mongoose.Types.ObjectId();

    const conversation = await createGroupConversation({
      creatorId: creator,
      groupName: 'Test Group',
      participantIds: [member],
    });

    await expect(
      removeMember(conversation._id, creator, creator)
    ).rejects.toThrow(/last remaining admin/i);
  });
});

describe('assertParticipant', () => {
  it('throws 404 for a non-participant, without leaking whether the conversation exists', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    const stranger = new mongoose.Types.ObjectId();

    const conversation = await findOrCreatePrivateConversation(userA, userB);

    await expect(assertParticipant(conversation._id, stranger)).rejects.toMatchObject({
      status: 404,
    });
  });
});