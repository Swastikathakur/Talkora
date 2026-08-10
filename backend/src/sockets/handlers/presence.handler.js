import { listConversationsForUser } from '../../services/conversation.service.js';
import { addConnection, removeConnection } from '../presenceStore.js';
import logger from '../../lib/logger.js';

const DISCONNECT_GRACE_MS = 5000;
const pendingOfflineTimers = new Map(); // userId -> Timeout

export async function handlePresenceConnect(io, socket) {
  const userId = socket.data.user._id.toString();

  // Cancel any pending "went offline" broadcast if this is a reconnect
  // within the grace window (e.g. brief network blip, page navigation).
  if (pendingOfflineTimers.has(userId)) {
    clearTimeout(pendingOfflineTimers.get(userId));
    pendingOfflineTimers.delete(userId);
  }

  const justCameOnline = addConnection(userId, socket.id);

  socket.join(`user:${userId}`);

  const conversations = await listConversationsForUser(userId);
  const conversationRooms = conversations.map((c) => `conversation:${c._id}`);
  conversationRooms.forEach((room) => socket.join(room));

  if (justCameOnline) {
    conversationRooms.forEach((room) => {
      socket.to(room).emit('presence:update', {
        userId,
        status: 'online',
        lastSeen: null,
      });
    });
  }

  logger.info({ userId, socketId: socket.id }, 'Socket connected');
}

export function handlePresenceDisconnect(io, socket) {
  const userId = socket.data.user._id.toString();
  const wentOffline = removeConnection(userId, socket.id);

  if (!wentOffline) return; // user still has other active connections

  // Debounce: only broadcast "offline" if they don't reconnect quickly.
  const timer = setTimeout(async () => {
    pendingOfflineTimers.delete(userId);

    const conversations = await listConversationsForUser(userId);
    conversations.forEach((c) => {
      io.to(`conversation:${c._id}`).emit('presence:update', {
        userId,
        status: 'offline',
        lastSeen: new Date().toISOString(),
      });
    });
  }, DISCONNECT_GRACE_MS);

  pendingOfflineTimers.set(userId, timer);
  logger.info({ userId, socketId: socket.id }, 'Socket disconnected');
}