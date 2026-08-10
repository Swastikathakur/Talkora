import {
  sendMessage as sendMessageService,
  getMessages as getMessagesService,
  editMessage as editMessageService,
  deleteMessage as deleteMessageService,
  addReaction as addReactionService,
  removeReaction as removeReactionService,
  markMessageSeen,
} from '../services/message.service.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const sendMessage = asyncHandler(async (req, res) => {
  const { text, attachments, replyTo } = req.body;

  const { message } = await sendMessageService({
    conversationId: req.params.id,
    senderId: req.user._id,
    text,
    attachments,
    replyTo,
  });

  res.status(201).json(message);
});

export const getMessages = asyncHandler(async (req, res) => {
  const { limit, before } = req.query;

  const messages = await getMessagesService({
    conversationId: req.params.id,
    userId: req.user._id,
    limit,
    before,
  });

  res.status(200).json(messages);
});

export const editMessage = asyncHandler(async (req, res) => {
  const message = await editMessageService({
    messageId: req.params.id,
    userId: req.user._id,
    text: req.body.text,
  });

  res.status(200).json(message);
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await deleteMessageService({
    messageId: req.params.id,
    userId: req.user._id,
    forEveryone: req.query.forEveryone,
  });

  res.status(200).json(message);
});

export const addReaction = asyncHandler(async (req, res) => {
  const message = await addReactionService({
    messageId: req.params.id,
    userId: req.user._id,
    emoji: req.body.emoji,
  });

  res.status(200).json(message);
});

export const removeReaction = asyncHandler(async (req, res) => {
  const message = await removeReactionService({
    messageId: req.params.id,
    userId: req.user._id,
  });

  res.status(200).json(message);
});

export const markRead = asyncHandler(async (req, res) => {
  const message = await markMessageSeen({
    messageId: req.params.id,
    userId: req.user._id,
    kind: 'read',
  });

  res.status(200).json(message);
});

export const markDelivered = asyncHandler(async (req, res) => {
  const message = await markMessageSeen({
    messageId: req.params.id,
    userId: req.user._id,
    kind: 'delivered',
  });

  res.status(200).json(message);
});