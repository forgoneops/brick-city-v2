import { randomUUID } from 'node:crypto';
import type { paymentProviderIdValues } from '../../db/schema.js';

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
