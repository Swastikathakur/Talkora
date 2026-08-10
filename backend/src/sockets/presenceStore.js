// In-memory presence tracking. Single-process only.
// If Talkora later runs multiple Node instances, move this to Redis.

const onlineUsers = new Map(); // userId -> Set<socketId>

export function addConnection(userId, socketId) {
  const key = userId.toString();

  if (!onlineUsers.has(key)) {
    onlineUsers.set(key, new Set());
  }

  onlineUsers.get(key).add(socketId);

  // true = user's first active connection
  return onlineUsers.get(key).size === 1;
}

export function removeConnection(userId, socketId) {
  const key = userId.toString();
  const sockets = onlineUsers.get(key);

  if (!sockets) return false;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(key);
    return true; // user went fully offline
  }

  return false;
}

export function isOnline(userId) {
  return onlineUsers.has(userId.toString());
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}