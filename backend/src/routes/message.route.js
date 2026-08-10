import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markRead,
  markDelivered,
} from '../controllers/message.controller.js';
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageQuerySchema,
  addReactionSchema,
  messageIdParamSchema,
  conversationIdParamSchema,
  getMessagesQuerySchema,
} from '../validators/message.validator.js';

const router = express.Router();

// Every message route requires a resolved, synced user.
router.use(protectRoute);

// Conversation-scoped message routes (req.params.id = conversationId)
router.post(
  '/api/conversations/:id/messages',
  validate(conversationIdParamSchema, 'params'),
  validate(sendMessageSchema),
  sendMessage
);
router.get(
  '/api/conversations/:id/messages',
  validate(conversationIdParamSchema, 'params'),
  validate(getMessagesQuerySchema, 'query'),
  getMessages
);

// Message-scoped routes (req.params.id = messageId)
router.patch(
  '/api/messages/:id',
  validate(messageIdParamSchema, 'params'),
  validate(editMessageSchema),
  editMessage
);
router.delete(
  '/api/messages/:id',
  validate(messageIdParamSchema, 'params'),
  validate(deleteMessageQuerySchema, 'query'),
  deleteMessage
);
router.post(
  '/api/messages/:id/reactions',
  validate(messageIdParamSchema, 'params'),
  validate(addReactionSchema),
  addReaction
);
router.delete(
  '/api/messages/:id/reactions',
  validate(messageIdParamSchema, 'params'),
  removeReaction
);
router.post('/api/messages/:id/read', validate(messageIdParamSchema, 'params'), markRead);
router.post(
  '/api/messages/:id/delivered',
  validate(messageIdParamSchema, 'params'),
  markDelivered
);

export default router;
