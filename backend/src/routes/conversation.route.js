import express from 'express';
import { protectRoute } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createPrivateConversation,
  createGroupConversation,
  listConversations,
  getConversation,
  updateConversationInfo,
  addConversationMember,
  removeConversationMember,
  updateMemberRole,
} from '../controllers/conversation.controller.js';
import {
  createPrivateConversationSchema,
  createGroupConversationSchema,
  updateGroupInfoSchema,
  addMemberSchema,
  setMemberRoleSchema,
  conversationIdParamSchema,
  memberIdParamsSchema,
} from '../validators/conversation.validator.js';

const router = express.Router();

// Every conversation route requires a resolved, synced user.
router.use(protectRoute);

router.get('/', listConversations);

router.post('/', validate(createPrivateConversationSchema), createPrivateConversation);
router.post('/group', validate(createGroupConversationSchema), createGroupConversation);

router.get('/:id', validate(conversationIdParamSchema, 'params'), getConversation);
router.patch(
  '/:id',
  validate(conversationIdParamSchema, 'params'),
  validate(updateGroupInfoSchema),
  updateConversationInfo
);

router.post(
  '/:id/members',
  validate(conversationIdParamSchema, 'params'),
  validate(addMemberSchema),
  addConversationMember
);
router.delete(
  '/:id/members/:userId',
  validate(memberIdParamsSchema, 'params'),
  removeConversationMember
);
router.patch(
  '/:id/members/:userId/role',
  validate(memberIdParamsSchema, 'params'),
  validate(setMemberRoleSchema),
  updateMemberRole
);

export default router;