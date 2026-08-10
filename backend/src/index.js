import http from 'http';
import express from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

import { env } from './config/env.js';
import connectDB from './lib/db.js';
import logger from './lib/logger.js';

import conversationRoutes from './routes/conversation.route.js';
import messageRoutes from './routes/message.route.js';
import webhookRoutes from './routes/webhook.route.js';
import userRoutes from './routes/user.route.js';

import { initializeSocket } from './sockets/index.js';

const app = express();

/* -------------------- CORS -------------------- */

app.use(
  cors({
    origin: env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

/* -------------------- Clerk -------------------- */

/*
 * Must be registered before any middleware that uses getAuth().
 */
app.use(clerkMiddleware());

/* -------------------- Clerk Webhooks -------------------- */

/*
 * IMPORTANT:
 * This MUST come before express.json().
 *
 * Clerk/Svix needs the raw request body to verify
 * the webhook signature.
 *
 * This route does NOT use protectRoute.
 */
app.use('/webhooks', webhookRoutes);

/* -------------------- Body Parsers -------------------- */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* -------------------- Health Check -------------------- */

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Talkora backend is running',
  });
});

/* -------------------- API Routes -------------------- */

app.use('/api/users', userRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

/* -------------------- HTTP + Socket.IO -------------------- */

const server = http.createServer(app);

initializeSocket(server);

/* -------------------- Start Server -------------------- */

async function startServer() {
  try {
    await connectDB();

    server.listen(env.PORT || 3000, () => {
      logger.info(`Server running on port ${env.PORT || 3000}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);

    logger.error(
      { err: error },
      'MongoDB connection error'
    );

    process.exit(1);
  }
}

startServer();
