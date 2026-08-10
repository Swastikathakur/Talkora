import mongoose from 'mongoose';
import { env } from '../config/env.js';
import logger from './logger.js';

async function connectDB() {
  try {
    // Set strictQuery to reduce deprecation warnings.
    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // wait up to 30s to find/authenticate the server
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // NOTE: do NOT hardcode authSource here unless you know the user's
      // auth database in Atlas. If auth keeps failing, try adding
      // `?authSource=admin` to MONGO_URI in .env instead.
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    throw error; // re-throw so index.js startServer() can handle it cleanly
  }
}

export default connectDB;
