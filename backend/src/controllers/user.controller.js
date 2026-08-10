import { AppError } from '../lib/AppError.js';
import { searchUsers as searchUsersService } from '../services/user.service.js';

export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      throw new AppError('Search query parameter "q" is required', 400);
    }

    const users = await searchUsersService({
      query: q,
      currentUserId: req.user._id,
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};
