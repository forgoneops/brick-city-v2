import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { DEFAULT_PRICE_PLN, PAYWALL_DEFAULT_ON, type PaywallConfig, type Role } from '@bcv2/shared';
import { getDb } from '../../db/index.js';
import { siteContent, subscriptions, users } from '../../db/schema.js';
import { spendFromWallet } from './ledger.js';

const PAYWALL_ENABLED_KEY = 'paywall_enabled';
const PAYWALL_PRICE_CENTS_KEY = 'paywall_price_cents';
const SUBSCRIPTION_PERIOD_DAYS = 30;

export async function getPersistedPaywallConfig(): Promise<PaywallConfig> {
  const db = getDb();
  const rows = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.key, PAYWALL_ENABLED_KEY));
  const priceRows = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.key, PAYWALL_PRICE_CENTS_KEY));

  const enabledRow = rows[0];
  const priceRow = priceRows[0];

  return {
    paywallEnabled: enabledRow ? enabledRow.value === 'true' : PAYWALL_DEFAULT_ON,
    pricePln: priceRow ? Number(priceRow.value) / 100 : DEFAULT_PRICE_PLN,
  };
}

export async function setPersistedPaywallConfig(config: PaywallConfig): Promise<void> {
  const db = getDb();
  await db
    .insert(siteContent)
    .values({ key: PAYWALL_ENABLED_KEY, value: String(config.paywallEnabled) })
    .onDuplicateKeyUpdate({ set: { value: String(config.paywallEnabled) } });
  await db
    .insert(siteContent)
    .values({ key: PAYWALL_PRICE_CENTS_KEY, value: String(Math.round(config.pricePln * 100)) })
    .onDuplicateKeyUpdate({ set: { value: String(Math.round(config.pricePln * 100)) } });
}

export type AccessReason = 'paywall-off' | 'staff' | 'trialing' | 'active' | 'auto-debited' | 'blocked';

export interface AccessResult {
  allowed: boolean;
  reason: AccessReason;
}

// Order of checks: paywall off -> staff bypass -> active trial -> active
// subscription -> attempt auto-debit -> blocked. Staff bypass (admin +
// moderator) is a deliberate addition beyond the literal brief so seeded/real
// staff accounts aren't locked out of the portal they moderate — see
// docs/DECISIONS.md.
export async function evaluateAccess(userId: string, role: Role): Promise<AccessResult> {
  const config = await getPersistedPaywallConfig();
  if (!config.paywallEnabled) {
    return { allowed: true, reason: 'paywall-off' };
  }
  if (role === 'admin' || role === 'moderator') {
    return { allowed: true, reason: 'staff' };
  }

  const db = getDb();
  const now = new Date();
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

  if (subscription?.status === 'trialing' && subscription.trialEndsAt && subscription.trialEndsAt > now) {
    return { allowed: true, reason: 'trialing' };
  }
  if (subscription?.status === 'active' && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
    return { allowed: true, reason: 'active' };
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const priceCents = Math.round(config.pricePln * 100);
  if (user && user.walletBalanceCents >= priceCents) {
    await spendFromWallet({ userId, amountCents: priceCents, type: 'subscription', reason: 'subscription-auto-debit' });
    const currentPeriodEnd = new Date(now.getTime() + SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    if (subscription) {
      await db
        .update(subscriptions)
        .set({ status: 'active', currentPeriodEnd, priceCents })
        .where(eq(subscriptions.userId, userId));
    } else {
      await db.insert(subscriptions).values({
        id: randomUUID(),
        userId,
        status: 'active',
        currentPeriodEnd,
        priceCents,
      });
    }
    return { allowed: true, reason: 'auto-debited' };
  }

  if (subscription && subscription.status !== 'expired') {
    await db.update(subscriptions).set({ status: 'expired' }).where(eq(subscriptions.userId, userId));
  }
  return { allowed: false, reason: 'blocked' };
}

export async function requireAccessOrThrow(userId: string, role: Role): Promise<void> {
  const result = await evaluateAccess(userId, role);
  if (!result.allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'PAYWALL' });
  }
}
