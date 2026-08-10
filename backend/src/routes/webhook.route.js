import express from 'express';
import { handleClerkWebhook } from '../webhooks/clerk.webhook.js';

const router = express.Router();

router.post(
  '/clerk',
  express.raw({ type: 'application/json' }),
  handleClerkWebhook
);

export default router;