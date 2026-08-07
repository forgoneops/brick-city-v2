import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';
import { P24, Currency as P24Currency, Country as P24Country, Language as P24Language, Encoding as P24Encoding, Status as P24Status } from '@mrboombastic/node-przelewy24';
import type { NotificationRequest as P24NotificationRequest } from '@mrboombastic/node-przelewy24';
import { getDb } from '../../db/index.js';
import { paymentProviderIdValues, paymentProviders, users } from '../../db/schema.js';

export type PaymentProviderId = (typeof paymentProviderIdValues)[number];

export interface CheckoutResult {
  providerRef: string;
  amountCents: number;
  // Present only when the browser must actually complete payment on the
  // provider's own hosted page (real Stripe/P24 checkouts). When set, the
  // caller (subscriptions/router.ts's topUp) must NOT credit the wallet yet
  // — the webhook credits it once the provider confirms money actually
  // moved. Absent for the synchronous mock flow, which still completes and
  // credits immediately as before.
  redirectUrl?: string;
}

export interface WebhookResult {
  providerRef: string;
  amountCents: number;
  userId: string;
}

// All three provider ids (stripe/przelewy24/paypal) fall back to MOCK until
// real keys are configured — see docs/DECISIONS.md ("Subscriptions + wallet"
// and "Real payment provider adapters"). No real API keys are ever read,
// stored, or referenced by this interface beyond process.env at the deploy
// target; never the DB or this repo.
export interface PaymentProvider {
  id: PaymentProviderId;
  createCheckout(params: { userId: string; amountCents: number; returnUrl?: string }): Promise<CheckoutResult>;
  handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult | null>;
  verify(providerRef: string): Promise<boolean>;
}

class MockPaymentProvider implements PaymentProvider {
  constructor(public readonly id: PaymentProviderId) {}

  // Resolves synchronously — no real redirect/checkout session, since there's
  // nothing to redirect to without real provider keys.
  async createCheckout(params: { userId: string; amountCents: number }): Promise<CheckoutResult> {
    return { providerRef: `mock_${randomUUID()}`, amountCents: params.amountCents };
  }

  // Unused by the synchronous mock topUp flow (see subscriptions/router.ts),
  // but implemented so the real /webhooks/:provider route has something to
  // call — this is the shape a real Stripe/P24 adapter would fill in later.
  async handleWebhook(): Promise<WebhookResult | null> {
    return null;
  }

  async verify(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Stripe — official `stripe` Node SDK. Fully real once STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET are both set (see getProvider() below); until then,
// getProvider('stripe') keeps returning MockPaymentProvider so nothing in
// the app can reach this code path in the current deploy (no keys exist).
// ---------------------------------------------------------------------------

function hasStripeKeys(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

class StripeProvider implements PaymentProvider {
  readonly id = 'stripe' as const;
  private readonly client: Stripe;
  private readonly webhookSecret: string;

  constructor() {
    // Only ever constructed by getProvider() after hasStripeKeys() passed —
    // the `!` assertions below are safe given that call order.
    this.client = new Stripe(process.env.STRIPE_SECRET_KEY!);
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  }

  async createCheckout(params: { userId: string; amountCents: number; returnUrl?: string }): Promise<CheckoutResult> {
    const redirect = params.returnUrl ?? 'http://localhost:5173/profile';
    const session = await this.client.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'pln',
            product_data: { name: "Brick City Mashin' wallet top-up" },
            unit_amount: params.amountCents,
          },
          quantity: 1,
        },
      ],
      // Round-trips back to us on the webhook (checkout.session.completed)
      // — this is how handleWebhook below knows which user to credit.
      metadata: { userId: params.userId },
      success_url: redirect,
      cancel_url: redirect,
    });
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return { providerRef: session.id, amountCents: params.amountCents, redirectUrl: session.url };
  }

  async handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult | null> {
    const signature = headers['stripe-signature'];
    if (!signature) return null;

    let event: Stripe.Event;
    try {
      // constructEvent needs the exact raw request bytes — re-serialized
      // JSON would break the HMAC signature check. See webhook.ts, which
      // passes the untouched body text through for this reason.
      event = this.client.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch {
      return null;
    }

    if (event.type !== 'checkout.session.completed') return null;
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const amountCents = session.amount_total;
    if (!userId || amountCents == null) return null;

    return { providerRef: session.id, amountCents, userId };
  }

  async verify(providerRef: string): Promise<boolean> {
    const session = await this.client.checkout.sessions.retrieve(providerRef);
    return session.payment_status === 'paid';
  }
}

// ---------------------------------------------------------------------------
// Przelewy24 — @mrboombastic/node-przelewy24 (actively maintained TS client;
// verified against its actual published API, not invented — see
// docs/DECISIONS.md). Fully real once all four P24_* env vars are set.
// ---------------------------------------------------------------------------

function hasP24Keys(): boolean {
  return Boolean(
    process.env.P24_MERCHANT_ID && process.env.P24_POS_ID && process.env.P24_CRC && process.env.P24_API_KEY
  );
}

// P24's Order/NotificationRequest have no free-form metadata field (unlike
// Stripe), but sessionId is entirely ours to choose — encoding the userId
// into it is the simplest way to recover who to credit on the webhook,
// with no new DB table for a pending-checkout mapping.
function makeP24SessionId(userId: string): string {
  return `topup_${userId}_${randomUUID()}`;
}

function parseP24UserId(sessionId: string): string | null {
  const match = /^topup_([0-9a-f-]{36})_/.exec(sessionId);
  return match ? match[1] : null;
}

class Przelewy24Provider implements PaymentProvider {
  readonly id = 'przelewy24' as const;
  private readonly client: P24;

  constructor() {
    this.client = new P24({
      merchantId: Number(process.env.P24_MERCHANT_ID),
      posId: Number(process.env.P24_POS_ID),
      apiKey: process.env.P24_API_KEY!,
      crcKey: process.env.P24_CRC!,
      sandbox: false,
    });
  }

  async createCheckout(params: { userId: string; amountCents: number; returnUrl?: string }): Promise<CheckoutResult> {
    const returnUrl = params.returnUrl ?? 'http://localhost:5173/profile';
    const origin = new URL(returnUrl).origin;
    const sessionId = makeP24SessionId(params.userId);

    const db = getDb();
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, params.userId));

    const result = await this.client.createTransaction({
      sessionId,
      amount: params.amountCents,
      currency: P24Currency.PLN,
      description: "Brick City Mashin' wallet top-up",
      email: user?.email ?? '',
      country: P24Country.Poland,
      language: P24Language.PL,
      urlReturn: returnUrl,
      // Fixed webhook path (see webhook.ts) — same-origin deploy topology
      // (docs/deploy.md) means the frontend's own origin also reaches it.
      urlStatus: `${origin}/webhooks/przelewy24`,
      encoding: P24Encoding.UTF8,
    });

    return { providerRef: sessionId, amountCents: params.amountCents, redirectUrl: result.link };
  }

  async handleWebhook(rawBody: string): Promise<WebhookResult | null> {
    let notification: P24NotificationRequest;
    try {
      notification = JSON.parse(rawBody) as P24NotificationRequest;
    } catch {
      return null;
    }

    if (!this.client.verifyNotification(notification)) return null;

    // Required beyond signature verification — until this call, P24 hasn't
    // actually settled the funds to the merchant account.
    const confirmed = await this.client
      .verifyTransaction({
        sessionId: notification.sessionId,
        amount: notification.amount,
        currency: notification.currency,
        orderId: notification.orderId,
      })
      .catch(() => false);
    if (!confirmed) return null;

    const userId = parseP24UserId(notification.sessionId);
    if (!userId) return null;

    return { providerRef: notification.sessionId, amountCents: notification.amount, userId };
  }

  async verify(providerRef: string): Promise<boolean> {
    const data = await this.client.getTransaction(providerRef);
    return data.status === P24Status.SUCCESS;
  }
}

const instances = new Map<PaymentProviderId, PaymentProvider>();

export function getProvider(id: PaymentProviderId): PaymentProvider {
  let provider = instances.get(id);
  if (!provider) {
    if (id === 'stripe' && hasStripeKeys()) {
      provider = new StripeProvider();
    } else if (id === 'przelewy24' && hasP24Keys()) {
      provider = new Przelewy24Provider();
    } else {
      provider = new MockPaymentProvider(id);
    }
    instances.set(id, provider);
  }
  return provider;
}

// ---------------------------------------------------------------------------
// On/off switch state (payment_providers table). The table starts empty — a
// missing row means DISABLED, so the admin panel can render all three known
// providers even before the first toggle is ever saved.
// ---------------------------------------------------------------------------

export interface ProviderState {
  id: PaymentProviderId;
  enabled: boolean;
}

export async function listProviderStates(): Promise<ProviderState[]> {
  const db = getDb();
  const rows = await db.select().from(paymentProviders);
  const stateById = new Map(rows.map((r) => [r.id, r.enabled]));
  return paymentProviderIdValues.map((id) => ({ id, enabled: stateById.get(id) ?? false }));
}

export async function listEnabledProviderIds(): Promise<PaymentProviderId[]> {
  const states = await listProviderStates();
  return states.filter((s) => s.enabled).map((s) => s.id);
}

export async function isProviderEnabled(id: PaymentProviderId): Promise<boolean> {
  const db = getDb();
  const [row] = await db.select().from(paymentProviders).where(eq(paymentProviders.id, id));
  return row?.enabled ?? false;
}
