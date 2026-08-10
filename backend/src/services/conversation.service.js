import mongoose from 'mongoose';
import Conversation from '../models/conversation.model.js';
import { AppError } from '../lib/AppError.js';

/**
 * Authorization primitive — every controller and socket handler that
 * touches a conversation must call this first. Never trust a client-
 * supplied conversationId as proof of membership.
 */
export async function assertParticipant(conversationId, userId) {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw new AppError('Invalid conversation id', 400);
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    'participants.userId': userId,
  });

  if (!conversation) {
    throw new AppError('Conversation not found', 404);
  }

  return conversation;
}

function getParticipant(conversation, userId) {
  return conversation.participants.find((p) => p.userId.toString() === userId.toString());
}

/**
 * Exported at your request. Note: this assumes the caller already has a
 * conversation and userId that's known to be a participant (e.g. via
 * assertParticipant) — it throws generically if not, without distinguishing
 * "not a participant at all" from "participant but not admin". If you need
 * that distinction later, call assertParticipant first, then this.
 */
export function assertAdmin(conversation, userId) {
  const participant = getParticipant(conversation, userId);
  if (!participant || participant.role !== 'admin') {
    throw new AppError('Admin permission required', 403);
  }
  return participant;
}

export async function findOrCreatePrivateConversation(userIdA, userIdB) {
  if (userIdA.toString() === userIdB.toString()) {
    throw new AppError('Cannot create a conversation with yourself', 400);
  }

  const existing = await Conversation.findOne({
    isGroup: false,
    'participants.userId': { $all: [userIdA, userIdB] },
  });

  if (existing) return existing;

  const conversation = await Conversation.create({
    isGroup: false,
    participants: [{ userId: userIdA }, { userId: userIdB }],
  });

  return conversation;
}

export async function createGroupConversation({ creatorId, groupName, groupDescription, participantIds }) {
  if (!groupName || !groupName.trim()) {
    throw new AppError('Group name is required', 400);
  }

  const uniqueMemberIds = new Set([creatorId.toString(), ...participantIds.map(String)]);

  if (uniqueMemberIds.size < 2) {
    throw new AppError('A group needs at least 2 participants', 400);
  }

  const participants = Array.from(uniqueMemberIds).map((userId) => ({
    userId,
    role: userId === creatorId.toString() ? 'admin' : 'member',
  }));

  const conversation = await Conversation.create({
    isGroup: true,
    groupName: groupName.trim(),
    groupDescription: groupDescription?.trim() || '',
    createdBy: creatorId,
    participants,
  });

  return conversation;
}

export async function listConversationsForUser(userId) {
  return Conversation.find({ 'participants.userId': userId })
    .sort({ 'lastMessage.createdAt': -1, updatedAt: -1 })
    .populate('participants.userId', 'fullname email profilePic');
}

export async function getConversationById(conversationId, userId) {
  const conversation = await assertParticipant(conversationId, userId);
  await conversation.populate('participants.userId', 'fullname email profilePic');
  return conversation;
}

export async function updateGroupInfo(conversationId, actingUserId, updates) {
  const conversation = await assertParticipant(conversationId, actingUserId);

  if (!conversation.isGroup) {
    throw new AppError('Cannot update info on a private conversation', 400);
  }
  assertAdmin(conversation, actingUserId);

  if (updates.groupName !== undefined) conversation.groupName = updates.groupName;
  if (updates.groupDescription !== undefined) conversation.groupDescription = updates.groupDescription;
  if (updates.groupAvatar !== undefined) conversation.groupAvatar = updates.groupAvatar;

  await conversation.save();
  return conversation;
}

export async function addMember(conversationId, actingUserId, newUserId) {
  const conversation = await assertParticipant(conversationId, actingUserId);

  if (!conversation.isGroup) {
    throw new AppError('Cannot add members to a private conversation', 400);
  }
  assertAdmin(conversation, actingUserId);

  const alreadyMember = getParticipant(conversation, newUserId);
  if (alreadyMember) {
    throw new AppError('User is already a member', 409);
  }

  conversation.participants.push({ userId: newUserId, role: 'member' });
  await conversation.save();
  return conversation;
}

export async function removeMember(conversationId, actingUserId, targetUserId) {
  const conversation = await assertParticipant(conversationId, actingUserId);

  if (!conversation.isGroup) {
    throw new AppError('Cannot remove members from a private conversation', 400);
  }

  const isSelfRemoval = actingUserId.toString() === targetUserId.toString();
  if (!isSelfRemoval) {
    assertAdmin(conversation, actingUserId);
  }

  const target = getParticipant(conversation, targetUserId);
  if (!target) {
    throw new AppError('User is not a member of this conversation', 404);
  }

  const remainingAdmins = conversation.participants.filter(
    (p) => p.role === 'admin' && p.userId.toString() !== targetUserId.toString()
  );
  if (target.role === 'admin' && remainingAdmins.length === 0 && conversation.participants.length > 1) {
    throw new AppError('Cannot remove the last remaining admin. Promote another member first.', 400);
  }

  conversation.participants = conversation.participants.filter(
    (p) => p.userId.toString() !== targetUserId.toString()
  );
  await conversation.save();
  return conversation;
}

export async function setMemberRole(conversationId, actingUserId, targetUserId, role) {
  if (!['member', 'admin'].includes(role)) {
    throw new AppError('Invalid role', 400);
  }

  const conversation = await assertParticipant(conversationId, actingUserId);
  assertAdmin(conversation, actingUserId);

  const target = getParticipant(conversation, targetUserId);
  if (!target) {
    throw new AppError('User is not a member of this conversation', 404);
  }

  if (target.role === 'admin' && role === 'member') {
    const remainingAdmins = conversation.participants.filter(
      (p) => p.role === 'admin' && p.userId.toString() !== targetUserId.toString()
    );
    if (remainingAdmins.length === 0) {
      throw new AppError('Cannot demote the last remaining admin. Promote another member first.', 400);
    }
  }

  target.role = role;
  await conversation.save();
  return conversation;
}

/**
 * Updates the denormalized lastMessage snapshot. Called by message.service.js
 * right after a message is created.
 */
export async function touchLastMessage(conversationId, message) {
  await Conversation.findByIdAndUpdate(conversationId, {
    lastMessage: {
      messageId: message._id,
      text: message.text || (message.attachments[0] ? `[${message.attachments[0].type}]` : ''),
      senderId: message.senderId,
      createdAt: message.createdAt,
    },
  });
}

/**
 * Updates a participant's read pointer — O(1) unread-count basis.
 * Called by message.service.js / socket read-receipt handlers.
 */
export async function markRead(conversationId, userId, messageId) {
  const conversation = await assertParticipant(conversationId, userId);

  const participant = getParticipant(conversation, userId);
  participant.lastReadMessageId = messageId;
  participant.lastReadAt = new Date();
  await conversation.save();

  return conversation;
}