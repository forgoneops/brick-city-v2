import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default(''),
  JWT_SECRET: z.string().default('dev-only-secret-change-me'),
  PORT: z.coerce.number().default(3001),
  // Uploads storage: 'local' driver writes to UPLOADS_DIR served at /uploads.
  // S3-compatible drivers can be added behind the same StorageDriver interface.
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  UPLOADS_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().default(15),
  // Cloudflare Turnstile anti-bot. Empty = disabled (dev default); when set,
  // auth.register requires and verifies a turnstileToken. See lib/turnstile.ts
  // and docs/DECISIONS.md ("Phase 5").
  TURNSTILE_SECRET_KEY: z.string().default(''),
});

export const env = envSchema.parse(process.env);
