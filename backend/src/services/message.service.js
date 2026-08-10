import mongoose from 'mongoose';
import Message from '../models/message.model.js';
import { AppError } from '../lib/AppError.js';
import { assertParticipant, touchLastMessage } from './conversation.service.js';

// Groups at or under this size get full per-user "seen by"/delivery lists.
// Larger groups fall back to the lastReadMessageId-only model.
// See architecture doc §10/§11 for the reasoning.
const SEEN_LIST_MAX_GROUP_SIZE = 8;

export async function sendMessage({ conversationId, senderId, text, attachments = [], replyTo = null }) {
  const conversation = await assertParticipant(conversationId, senderId);

  if (!text?.trim() && attachments.length === 0) {
    throw new AppError('Message must contain text or at least one attachment', 400);
  }

  if (replyTo) {
    const original = await Message.findOne({ _id: replyTo, conversationId });
    if (!original) {
      throw new AppError('Message being replied to was not found in this conversation', 400);
    }
  }

  const message = await Message.create({
    conversationId,
    senderId,
    text: text?.trim() || '',
    attachments,
    replyTo,
  });

  await touchLastMessage(conversationId, message);

  return { message, conversation };
}

export async function getMessages({ conversationId, userId, limit = 50, before = null }) {
  await assertParticipant(conversationId, userId);

  const cappedLimit = Math.min(limit, 100);

  const filter = {
    conversationId,
    isDeleted: false,
    deletedFor: { $ne: userId }, // hide messages this user deleted "for me"
  };

  if (before) {
    const beforeDate = new Date(before);
    if (!isNaN(beforeDate.getTime())) {
      filter.createdAt = { $lt: beforeDate };
    }
  }

  const messages = await Message.find(filter)
    .sort({ createdAt: -1 })
    .limit(cappedLimit);

  return messages.reverse(); // oldest-first for client rendering
}

export async function editMessage({ messageId, userId, text }) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);

  if (message.senderId.toString() !== userId.toString()) {
    throw new AppError('You can only edit your own messages', 403);
  }
  if (message.isDeleted) {
    throw new AppError('Cannot edit a deleted message', 400);
  }
  if (!text?.trim()) {
    throw new AppError('Message text cannot be empty', 400);
  }

  message.text = text.trim();
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  return message;
}

export async function deleteMessage({ messageId, userId, forEveryone }) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);

  await assertParticipant(message.conversationId, userId);

  if (forEveryone) {
    if (message.senderId.toString() !== userId.toString()) {
      throw new AppError('Only the sender can delete a message for everyone', 403);
    }
    message.isDeleted = true;
    message.text = '';
    message.attachments = [];
  } else {
    if (!message.deletedFor.some((id) => id.toString() === userId.toString())) {
      message.deletedFor.push(userId);
    }
  }

  await message.save();
  return message;
}

export async function addReaction({ messageId, userId, emoji }) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);

  await assertParticipant(message.conversationId, userId);

  // One reaction per user per message — replace existing rather than stack.
  message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId.toString());
  message.reactions.push({ userId, emoji });

  await message.save();
  return message;
}

export async function removeReaction({ messageId, userId }) {
  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found', 404);

  await assertParticipant(message.conversationId, userId);

  message.reactions = message.reactions.filter((r) => r.userId.toString() !== userId.toString());
  await message.save();
  return message;
}

/**
 * Marks a message delivered/read for a given user, respecting the
 * group-size threshold — see SEEN_LIST_MAX_GROUP_SIZE above.
 */
export async function markMessageSeen({ messageId, userId, kind }) {
  // kind: 'delivered' | 'read'
  const message = await Message.findById(messageId).populate('conversationId');
  if (!message) throw new AppError('Message not found', 404);

  const conversation = message.conversationId;
  const participantCount = conversation.participants?.length ?? conversation.participants.length;

  if (participantCount > SEEN_LIST_MAX_GROUP_SIZE) {
    // Large group: skip per-message tracking entirely, rely on
    // Conversation.participants[].lastReadMessageId instead.
    return message;
  }

  const list = kind === 'read' ? message.readBy : message.deliveredTo;
  const alreadyTracked = list.some((entry) => entry.userId.toString() === userId.toString());

  if (!alreadyTracked) {
    list.push({ userId, [kind === 'read' ? 'readAt' : 'deliveredAt']: new Date() });
    await message.save();
  }

  return message;
}

export { SEEN_LIST_MAX_GROUP_SIZE };