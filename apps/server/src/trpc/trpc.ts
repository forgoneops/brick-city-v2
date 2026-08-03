import { initTRPC, TRPCError } from '@trpc/server';
import { hasRoleAtLeast, type UserRole } from '@bcm/shared';
import { isPaywallEnabled } from '../modules/subscriptions/paywall.js';
import type { TrpcContext } from './context.js';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

/** Requires a valid Bearer token; narrows ctx.user to non-null. */
export const requireAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  return next({ ctx: { user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireAuth);

/**
 * Role guard factory — roleGuard('moderator') allows moderators and admins.
 * Usage: protectedProcedure.use(roleGuard('admin')) or adminProcedure below.
 */
export const roleGuard = (minimum: UserRole) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    }
    if (!hasRoleAtLeast(ctx.user.role, minimum)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: `Requires role: ${minimum}` });
    }
    return next({ ctx: { user: ctx.user } });
  });

export const moderatorProcedure = t.procedure.use(roleGuard('moderator'));
export const adminProcedure = t.procedure.use(roleGuard('admin'));

// ---------------------------------------------------------------------------
// Paywall middleware (stub — Phase 3c)
// ---------------------------------------------------------------------------

/**
 * Requires an account with active access: trial not expired OR an active
 * subscription. No-op when the paywall feature flag is disabled in admin.
 *
 * TODO(phase-3c): check real subscription status once payments land
 * (Stripe/Przelewy24 skeleton + mock first, production after keys).
 */
export const requireActiveAccess = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentication required' });
  }
  const paywallEnabled = await isPaywallEnabled();
  if (!paywallEnabled) {
    return next({ ctx: { user: ctx.user } });
  }
  const trialActive = ctx.user.trialEndsAt !== null && new Date(ctx.user.trialEndsAt) > new Date();
  if (!trialActive) {
    // TODO(phase-3c): also allow users with an active paid subscription.
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Trial expired — subscription required',
    });
  }
  return next({ ctx: { user: ctx.user } });
});
