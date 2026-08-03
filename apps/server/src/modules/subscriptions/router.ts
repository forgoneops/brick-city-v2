import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import {
  CMS_KEY_PAYWALL_ENABLED,
  CMS_KEY_SUBSCRIPTION_PRICE_CENTS,
  PAYWALL_ENABLED_DEFAULT,
  SUBSCRIPTION_PRICE_CENTS_DEFAULT,
} from '@bcm/shared';
import { getDb } from '../../db/index.js';
import { siteContent, users, walletTransactions } from '../../db/schema.js';
import { adminProcedure, protectedProcedure, publicProcedure, router } from '../../trpc/trpc.js';
import { isPaywallEnabled, setPaywallEnabledCache } from './paywall.js';

/**
 * Subscriptions / wallet module — STUB (Phase 3c).
 * Model: invite -> 7-day full-access trial -> subscription (~25 PLN/month,
 * price set in admin). The ENTIRE paywall is toggled from the admin panel.
 * TODO(phase-3c): payments via Stripe/Przelewy24 (skeleton + mock first),
 * subscription status table, MRR stats for admin.
 */
export const subscriptionsRouter = router({
  /** Current wallet balance of the caller (cents). */
  balance: protectedProcedure.query(({ ctx }) => ({
    balanceCents: ctx.user.walletBalanceCents,
  })),

  /**
   * Wallet top-up — STUB. Records a ledger row and credits the balance
   * without any real payment; replace with a real payment intent in 3c.
   */
  topUp: protectedProcedure
    .input(z.object({ amountCents: z.number().int().positive().max(1_000_000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.transaction(async (tx) => {
        await tx.insert(walletTransactions).values({
          id: randomUUID(),
          userId: ctx.user.id,
          amountCents: input.amountCents,
          reason: 'stub-topup',
        });
        await tx
          .update(users)
          .set({ walletBalanceCents: sql`${users.walletBalanceCents} + ${input.amountCents}` })
          .where(eq(users.id, ctx.user.id));
      });
      return { creditedCents: input.amountCents, note: 'STUB — no real payment processed' };
    }),

  /** Public paywall status so the web app can render the paywall state. */
  paywallStatus: publicProcedure.query(async () => ({
    paywallEnabled: await isPaywallEnabled(),
  })),

  /** Admin: read paywall + price configuration. */
  getPaywallConfig: adminProcedure.query(async () => {
    const db = getDb();
    const rows = await db.select().from(siteContent);
    const get = (key: string) => rows.find((r) => r.key === key)?.value;
    return {
      paywallEnabled: get(CMS_KEY_PAYWALL_ENABLED)
        ? get(CMS_KEY_PAYWALL_ENABLED) === 'true'
        : PAYWALL_ENABLED_DEFAULT,
      subscriptionPriceCents: get(CMS_KEY_SUBSCRIPTION_PRICE_CENTS)
        ? Number(get(CMS_KEY_SUBSCRIPTION_PRICE_CENTS))
        : SUBSCRIPTION_PRICE_CENTS_DEFAULT,
    };
  }),

  /** Admin: toggle the entire paywall on/off and set the monthly price. */
  setPaywallConfig: adminProcedure
    .input(
      z.object({
        paywallEnabled: z.boolean().optional(),
        // Plan: ~25 PLN/month, allowed range 20-30 PLN (see docs/plan.md).
        subscriptionPriceCents: z.number().int().min(2000).max(3000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const put = async (key: string, value: string) => {
        await db
          .insert(siteContent)
          .values({ key, value, updatedBy: ctx.user.id })
          .onDuplicateKeyUpdate({ set: { value, updatedBy: ctx.user.id } });
      };
      if (input.paywallEnabled !== undefined) {
        await put(CMS_KEY_PAYWALL_ENABLED, String(input.paywallEnabled));
        setPaywallEnabledCache(input.paywallEnabled);
      }
      if (input.subscriptionPriceCents !== undefined) {
        await put(CMS_KEY_SUBSCRIPTION_PRICE_CENTS, String(input.subscriptionPriceCents));
      }
      return { ok: true as const };
    }),
});
