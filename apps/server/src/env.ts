import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default(''),
  JWT_SECRET: z.string().default('dev-only-secret-change-me'),
  PORT: z.coerce.number().default(3001),
});

export const env = envSchema.parse(process.env);
