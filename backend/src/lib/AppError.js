// A typed error carrying an HTTP status, so any layer (REST controller,
// Socket.IO handler) can decide what to do with it without the service
// layer knowing anything about HTTP or sockets.
export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}