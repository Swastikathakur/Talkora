import { verifyToken } from '@clerk/backend';
import User from '../models/user.model.js';
import { env } from '../config/env.js';
import logger from '../lib/logger.js';

export async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error('Unauthorized: no token provided'));
    }

    const { sub: clerkId } = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });

    const user = await User.findOne({ clerkId })
      .select('_id fullname profilePic');

    if (!user) {
      return next(new Error('Unauthorized: user not found'));
    }

    socket.data.user = user;

    next();
  } catch (error) {
    logger.warn({ err: error }, 'Socket authentication failed');
    next(new Error('Unauthorized: invalid token'));
  }
}