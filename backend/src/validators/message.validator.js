import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Must be a valid ObjectId',
  });

const attachmentSchema = z.object({
  url: z.string().min(1, 'Attachment URL is required'),
  type: z.enum(['image', 'video', 'file', 'voice']),
  mimeType: z.string().optional(),
  size: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
  fileName: z.string().optional(),
});

/**
 * POST /api/conversations/:id/messages
 *
 * conversationId comes from req.params.id, NOT req.body.
 */
export const sendMessageSchema = z
  .object({
    text: z.string().trim().max(5000).optional().default(''),

    attachments: z
      .array(attachmentSchema)
      .max(10)
      .optional()
      .default([]),

    replyTo: objectIdSchema
      .nullable()
      .optional()
      .default(null),
  })
  .refine(
    (data) =>
      data.text.length > 0 ||
      data.attachments.length > 0,
    {
      message: 'Message must contain text or at least one attachment',
      path: ['text'],
    }
  );

/**
 * PATCH /api/messages/:id
 */
export const editMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Message text cannot be empty')
    .max(5000),
});

/**
 * DELETE /api/messages/:id?forEveryone=true
 */
export const deleteMessageQuerySchema = z.object({
  forEveryone: z
    .string()
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
});

/**
 * POST /api/messages/:id/reactions
 */
export const addReactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1, 'Emoji is required')
    .max(8),
});

/**
 * /api/messages/:id
 *
 * IMPORTANT:
 * The route uses :id, so the schema validates "id",
 * not "messageId".
 */
export const messageIdParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * /api/conversations/:id/messages
 *
 * The route uses :id as the conversation ID.
 */
export const conversationIdParamSchema = z.object({
  id: objectIdSchema,
});

/**
 * GET /api/conversations/:id/messages?limit=50&before=...
 */
export const getMessagesQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),

  before: z
    .string()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;

        return !Number.isNaN(
          new Date(value).getTime()
        );
      },
      {
        message: 'before must be a valid date',
      }
    ),
});

/**
 * Kept for compatibility with any existing code
 * that uses conversation message parameters separately.
 */
export const conversationMessageParamsSchema = z.object({
  conversationId: objectIdSchema,
});

/**
 * Pagination validation.
 */
export const messagePaginationSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50),
});

/**
 * Reaction validation.
 */
export const reactionSchema = z.object({
  emoji: z
    .string()
    .trim()
    .min(1, 'Emoji is required')
    .max(8),
});

/**
 * Read/delivery receipt validation.
 */
export const messageReceiptSchema = z.object({
  messageId: objectIdSchema,
});