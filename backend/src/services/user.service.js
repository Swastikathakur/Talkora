
import User from '../models/user.model.js';
import { AppError } from '../lib/AppError.js';
import logger from '../lib/logger.js';

/**
 * Creates or updates a User record from Clerk account data.
 * Idempotent by design: safe to call multiple times with the same data
 * (Clerk/Svix guarantees at-least-once delivery, so duplicate webhook
 * events for the same user.created/updated are expected, not exceptional).
 */
export async function syncUserFromClerk({ clerkId, email, fullname, profilePic }) {
  if (!clerkId) {
    throw new AppError('clerkId is required to sync a user', 400);
  }
  if (!email) {
    // Not fatal to the whole webhook — the caller decides whether to skip
    // or fail loudly. Logging here so it's visible regardless.
    logger.warn({ clerkId }, 'syncUserFromClerk called without an email — skipping');
    return null;
  }

  const user = await User.findOneAndUpdate(
    { clerkId },
    {
      clerkId,
      email,
      fullname: fullname || 'Unnamed User',
      profilePic: profilePic || '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return user;
}

/**
 * Removes a User record when the Clerk account is deleted.
 * Deliberately silent (no error) if the user was already gone — deletion
 * is idempotent for the same at-least-once-delivery reason as above.
 */
export async function deleteUserByClerkId(clerkId) {
  if (!clerkId) {
    throw new AppError('clerkId is required to delete a user', 400);
  }

  const result = await User.deleteOne({ clerkId });
  return result.deletedCount > 0;
}
/**
 * Searches users by name or email, excluding the current authenticated user.
 */
export async function searchUsers({ query, currentUserId }) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return [];
  }

  const cleanQuery = query.trim();
  const searchRegex = new RegExp(cleanQuery, 'i');

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { fullname: searchRegex },
      { email: searchRegex }
    ]
  })
    .select('_id clerkId email fullname profilePic')
    .limit(20)
    .lean();

  return users;
}
