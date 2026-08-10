import {
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markMessageSeen,
} from '../../services/message.service.js';

import { markRead as markConversationRead } from '../../services/conversation.service.js';
import { AppError } from '../../lib/AppError.js';
import logger from '../../lib/logger.js';

// Sends successful results or errors through the Socket.IO acknowledgement.
function withAck(fn) {
  return async (payload = {}, callback) => {
    try {
      const result = await fn(payload);

      if (typeof callback === 'function') {
        callback({
          ok: true,
          data: result,
        });
      }
    } catch (error) {
      const status = error instanceof AppError ? error.status : 500;

      if (status >= 500) {
        logger.error(
          { err: error },
          'Socket message handler error'
        );
      }

      if (typeof callback === 'function') {
        callback({
          ok: false,
          error: error.message,
          status,
        });
      }
    }
  };
}

export function registerMessageHandlers(io, socket) {
  const userId = socket.data.user._id;

  // Send a new message
  socket.on(
    'message:send',
    withAck(async ({ conversationId, text, attachments, replyTo }) => {
      const { message } = await sendMessage({
        conversationId,
        senderId: userId,
        text,
        attachments,
        replyTo,
      });

      io.to(`conversation:${conversationId}`).emit(
        'message:new',
        message
      );

      return message;
    })
  );

  // Edit a message
  socket.on(
    'message:edit',
    withAck(async ({ messageId, text }) => {
      const message = await editMessage({
        messageId,
        userId,
        text,
      });

      io.to(`conversation:${message.conversationId}`).emit(
        'message:updated',
        message
      );

      return message;
    })
  );

  // Delete a message
  socket.on(
    'message:delete',
    withAck(async ({ messageId, forEveryone }) => {
      const message = await deleteMessage({
        messageId,
        userId,
        forEveryone,
      });

      io.to(`conversation:${message.conversationId}`).emit(
        'message:updated',
        message
      );

      return message;
    })
  );

  // Add reaction
  socket.on(
    'reaction:add',
    withAck(async ({ messageId, emoji }) => {
      const message = await addReaction({
        messageId,
        userId,
        emoji,
      });

      io.to(`conversation:${message.conversationId}`).emit(
        'message:updated',
        message
      );

      return message;
    })
  );

  // Remove reaction
  socket.on(
    'reaction:remove',
    withAck(async ({ messageId }) => {
      const message = await removeReaction({
        messageId,
        userId,
      });

      io.to(`conversation:${message.conversationId}`).emit(
        'message:updated',
        message
      );

      return message;
    })
  );

  // Mark message as read
  socket.on(
    'message:read',
    withAck(async ({ conversationId, messageId }) => {
      await markConversationRead(
        conversationId,
        userId,
        messageId
      );

      await markMessageSeen({
        messageId,
        userId,
        kind: 'read',
      });

      socket
        .to(`conversation:${conversationId}`)
        .emit('message:read:ack', {
          conversationId,
          userId,
          messageId,
        });

      return {
        conversationId,
        messageId,
      };
    })
  );
}