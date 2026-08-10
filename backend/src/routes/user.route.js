import { Router } from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { getMe, searchUsers } from '../controllers/user.controller.js';

const router = Router();

router.use(protectRoute);

router.get('/me', getMe);
router.get('/search', searchUsers);

export default router;
