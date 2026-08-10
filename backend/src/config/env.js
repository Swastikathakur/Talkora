import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

// Every env var the app actually depends on, validated once at boot.
// If anything required is missing, the server refuses to start with a
// clear message instead of failing unpredictably mid-request later.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  MONGO_URI: z
    .string()
    .min(1, 'MONGO_URI is required')
    .trim()
    .transform((uri) => uri.trim()),

  CLERK_SECRET_KEY: z.string().min(1, 'CLERK_SECRET_KEY is required'),
  CLERK_WEBHOOK_SECRET: z.string().min(1, 'CLERK_WEBHOOK_SECRET is required'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment variables:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

// Single validated, typed source of truth for config — every other file
// should import `env` from here instead of reading process.env directly.
export const env = parsed.data;
