import type { Context } from 'hono';
import { paymentProviderIdValues } from '../../db/schema.js';
import { creditWallet } from './ledger.js';
import { getProvider, type PaymentProviderId } from './providers.js';

function isKnownProvider(id: string | undefined): id is PaymentProviderId {
  return !!id && (paymentProviderIdValues as readonly string[]).includes(id);
}

// POST /webhooks/:provider — the real completion path for a non-mock
// provider. Real Stripe/Przelewy24 adapters exist (modules/subscriptions/
// providers.ts) but stay unreachable until their env vars are set and the
// admin panel's switch is flipped (docs/deploy.md); PayPal and any
// unconfigured provider fall back to MockPaymentProvider, whose synchronous
// topUp flow never calls this route at all.
export async function handleWebhook(c: Context) {
  const provider = c.req.param('provider');
  if (!isKnownProvider(provider)) {
    return c.json({ error: 'Unknown provider' }, 400);
  }

  // Raw body text, not pre-parsed JSON — Stripe's signature verification
  // (constructEvent) is an HMAC over the exact request bytes, which
  // re-serializing a parsed object would silently break.
  const rawBody = await c.req.text();
  const headers = Object.fromEntries(c.req.raw.headers.entries());

  const result = await getProvider(provider).handleWebhook(rawBody, headers).catch(() => null);
  if (!result) {
    return c.json({ error: 'Unrecognized payload' }, 400);
  }

  await creditWallet({
    userId: result.userId,
    amountCents: result.amountCents,
    type: 'topup',
    provider,
    providerRef: result.providerRef,
    reason: 'webhook-topup',
  });

  return c.json({ ok: true });
}
