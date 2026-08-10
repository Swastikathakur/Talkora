import pino from 'pino';
import { env } from '../config/env.js';

// Structured logging: readable/colorized in dev, plain JSON in production
// (so a log aggregator like Datadog/CloudWatch can parse it).
const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'production'
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});

export default logger;