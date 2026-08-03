import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { verifySessionToken } from './lib/jwt.js';
import { getDb } from './db/index.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import {
  PAYWALL_DEFAULT_ON,
  type Role,
} from '@bcv2/shared';

export interface Context extends Record<string, unknown> {
  user: { id: string; role: Role } | null;
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const auth = opts.req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { user: null };

  const payload = await verifySessionToken(token);
  if (!payload) return { user: null };

  return {
    user: { id: payload.sub, role: payload.role },
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireAuth);

export const roleGuard = (...allowed: Role[]) => {
  return t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (!allowed.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    }
    return next({ ctx: { user: ctx.user } });
  });
};

export const adminProcedure = protectedProcedure.use(roleGuard('admin'));

/**
 * Phase 0 stub: verifies the current user still has active access under the
 * current paywall configuration (trial, wallet balance, or paywall off).
 * Requires a database connection. NOT wired into public smoke tests.
 */
export const requireActiveAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }

  // TODO(phase-1): read persisted paywall config from site_content kv store
  // instead of the compile-time default.
  if (!PAYWALL_DEFAULT_ON) {
    return next({ ctx: { user: ctx.user } });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id));
  if (!user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' });
  }

  const now = new Date();
  const trialActive = user.trialEndsAt && user.trialEndsAt > now;
  const hasBalance = user.walletBalanceCents > 0;

  if (!trialActive && !hasBalance) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'PAYWALL' });
  }

  return next({ ctx: { user: ctx.user } });
});
