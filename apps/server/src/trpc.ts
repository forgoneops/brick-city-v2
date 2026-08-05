import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { verifySessionToken } from './lib/jwt.js';
import type { Role } from '@bcv2/shared';
import { requireAccessOrThrow } from './modules/subscriptions/access.js';

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
export const moderatorProcedure = protectedProcedure.use(roleGuard('admin', 'moderator'));

/**
 * Verifies the current user still has active access under the persisted
 * paywall configuration (trial, active subscription, wallet auto-debit, or
 * paywall off) — delegates to modules/subscriptions/access.ts, which also
 * grants a staff (admin/moderator) bypass. See docs/DECISIONS.md for which
 * endpoints this is actually wired onto.
 */
export const requireActiveAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  await requireAccessOrThrow(ctx.user.id, ctx.user.role);
  return next({ ctx: { user: ctx.user } });
});

export const activeAccessProcedure = protectedProcedure.use(requireActiveAccess);
