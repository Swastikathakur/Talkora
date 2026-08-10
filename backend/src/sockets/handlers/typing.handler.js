export function registerTypingHandlers(io, socket) {
  socket.on('typing:start', ({ conversationId }) => {
    if (!conversationId) return;

    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.data.user._id,
      isTyping: true,
    });
  });

  socket.on('typing:stop', ({ conversationId }) => {
    if (!conversationId) return;

    socket.to(`conversation:${conversationId}`).emit('typing:update', {
      conversationId,
      userId: socket.data.user._id,
      isTyping: false,
    });
  });
}