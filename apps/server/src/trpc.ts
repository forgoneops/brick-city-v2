import { initTRPC, TRPCError } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { verifySessionToken } from './lib/jwt.js';
import { checkRateLimit } from './lib/rateLimit.js';
import type { Role } from '@bcv2/shared';
import { requireAccessOrThrow } from './modules/subscriptions/access.js';

export interface Context extends Record<string, unknown> {
  user: { id: string; role: Role } | null;
  ip: string;
}

function extractIp(req: Request): string {
  // Standard reverse-proxy header (see docs/deploy.md) — the raw socket IP
  // isn't reachable through the Fetch API Request the trpc adapter hands us.
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

export async function createContext(opts: FetchCreateContextFnOptions): Promise<Context> {
  const ip = extractIp(opts.req);
  const auth = opts.req.headers.get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { user: null, ip };

  const payload = await verifySessionToken(token);
  if (!payload) return { user: null, ip };

  return {
    user: { id: payload.sub, role: payload.role },
    ip,
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

/**
 * Fixed-window rate limit, keyed by user id when authenticated (so shared
 * IPs like NAT/office networks don't collide) or by IP otherwise. `name`
 * namespaces the bucket per call site — reuse across unrelated procedures
 * would let one endpoint's traffic exhaust another's budget.
 */
export function rateLimited(name: string, opts: { windowMs: number; max: number }) {
  return t.middleware(({ ctx, next }) => {
    const key = `${name}:${ctx.user?.id ?? ctx.ip}`;
    if (!checkRateLimit(key, opts)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Too many requests — slow down.' });
    }
    return next();
  });
}
