import 'dotenv/config';

/**
 * Central runtime configuration. Everything env-driven lives here.
 */
export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'mysql://bcm:bcm@localhost:3306/brickcity',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-insecure-secret',
  port: Number(process.env.PORT ?? 8787),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
} as const;

/** Lifetime of a JWT access token. */
export const ACCESS_TOKEN_TTL = '7d';
