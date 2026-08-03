import type { Context as HonoContext } from 'hono';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import type { SessionUser } from '@bcm/shared';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { env } from '../env.js';

export interface TokenPayload {
  sub: string;
  role: SessionUser['role'];
}

// NOTE: a type alias (not interface) so it is assignable to
// Record<string, unknown>, which @hono/trpc-server's createContext requires.
export type TrpcContext = {
  /** Authenticated user resolved from the Bearer token, or null. */
  user: SessionUser | null;
};

function toSessionUser(row: typeof users.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    nick: row.nick,
    role: row.role,
    walletBalanceCents: row.walletBalanceCents,
    trialEndsAt: row.trialEndsAt ? row.trialEndsAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Resolve a user id to a fresh SessionUser row. */
export async function loadUserById(id: string): Promise<SessionUser | null> {
  const rows = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ? toSessionUser(rows[0]) : null;
}

/**
 * tRPC context factory for the @hono/trpc-server adapter.
 * Parses `Authorization: Bearer <jwt>` and resolves the caller's user.
 */
export async function createTrpcContext(c: HonoContext): Promise<TrpcContext> {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) return { user: null };

  try {
    const payload = jwt.verify(header.slice(7), env.jwtSecret) as TokenPayload;
    const user = await loadUserById(payload.sub);
    return { user };
  } catch {
    // Invalid/expired token or unreachable DB — treat as anonymous.
    return { user: null };
  }
}
