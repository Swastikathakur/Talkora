import { Server } from 'socket.io';
import { authenticateSocket } from './socket.auth.js';
import {
  handlePresenceConnect,
  handlePresenceDisconnect,
} from './handlers/presence.handler.js';
import { registerTypingHandlers } from './handlers/typing.handler.js';
import { registerMessageHandlers } from './handlers/message.handler.js';
import logger from '../lib/logger.js';

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
origin: process.env.FRONTEND_URL || 'http://localhost:5173',      credentials: true,
    },
  });

  // Authenticate every Socket.IO connection before allowing handlers.
  io.use(authenticateSocket);

  io.on('connection', async (socket) => {
    try {
      await handlePresenceConnect(io, socket);

      registerTypingHandlers(io, socket);
      registerMessageHandlers(io, socket);

      socket.on('disconnect', () => {
        handlePresenceDisconnect(io, socket);
      });

      logger.info(
        {
          socketId: socket.id,
          userId: socket.data.user._id,
        },
        'Socket.IO connection established'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
          socketId: socket.id,
        },
        'Failed to initialize socket connection'
      );

      socket.disconnect(true);
    }
  });

  logger.info('Socket.IO initialized');

  return io;
}