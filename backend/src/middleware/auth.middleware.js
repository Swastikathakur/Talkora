import { getAuth } from '@clerk/express';
import User from '../models/user.model.js';
import logger from '../lib/logger.js';

// Resolves the Clerk session on req into our Mongo User document,
// and attaches it as req.user for downstream controllers.
export const protectRoute = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized - no active session' });
    }

    const user = await User.findOne({ clerkId: userId }).select(
      '_id clerkId email fullname profilePic'
    );

    if (!user) {
      // Clerk auth succeeded but no matching local record exists.
      // Almost always means the sign-up webhook hasn't synced this user yet.
      return res.status(404).json({
        message: 'User profile not found. Account sync may still be in progress.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error({ err: error }, 'protectRoute error');
    next(error); // flows into the centralized errorHandler
  }
};