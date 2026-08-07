import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { paymentProviderIdValues, paymentProviders } from '../../db/schema.js';

export type PaymentProviderId = (typeof paymentProviderIdValues)[number];

export interface CheckoutResult {
  providerRef: string;
  amountCents: number;
}

export interface WebhookResult {
  providerRef: string;
  amountCents: number;
  userId: string;
}

// All three provider ids (stripe/przelewy24/paypal) are MOCK until real keys
// are configured — see docs/DECISIONS.md ("Subscriptions + wallet"). No real
// API keys are ever read, stored, or referenced by this interface; a real
// adapter would take its keys from env vars at the deploy target, never from
// the DB or this repo.
export interface PaymentProvider {
  id: PaymentProviderId;
  createCheckout(params: { userId: string; amountCents: number }): Promise<CheckoutResult>;
  handleWebhook(payload: unknown): Promise<WebhookResult | null>;
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

const instances = new Map<PaymentProviderId, PaymentProvider>();

export function getProvider(id: PaymentProviderId): PaymentProvider {
  let provider = instances.get(id);
  if (!provider) {
    provider = new MockPaymentProvider(id);
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
