import { z } from 'zod';
import mongoose from 'mongoose';

// Reused wherever a MongoDB ObjectId is expected — centralizes the "is this
// actually a valid ObjectId" check so it's not repeated ad hoc per schema.
const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Must be a valid ObjectId',
  });

export const createPrivateConversationSchema = z.object({
  participantId: objectIdSchema,
});

export const createGroupConversationSchema = z.object({
  groupName: z.string().trim().min(1, 'Group name is required').max(100),
  groupDescription: z.string().trim().max(500).optional(),
  participantIds: z
    .array(objectIdSchema)
    .min(1, 'At least one other participant is required'),
});

export const updateGroupInfoSchema = z.object({
  groupName: z.string().trim().min(1).max(100).optional(),
  groupDescription: z.string().trim().max(500).optional(),
  groupAvatar: z.string().url().optional(),
});

export const addMemberSchema = z.object({
  userId: objectIdSchema,
});

export const setMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin']),
});

export const conversationIdParamSchema = z.object({
  id: objectIdSchema,
});

export const memberIdParamsSchema = z.object({
  id: objectIdSchema, // conversation id
  userId: objectIdSchema,
});