import type { Context } from 'hono';
import { paymentProviderIdValues } from '../../db/schema.js';
import { creditWallet } from './ledger.js';
import { getProvider, type PaymentProviderId } from './providers.js';

function isKnownProvider(id: string | undefined): id is PaymentProviderId {
  return !!id && (paymentProviderIdValues as readonly string[]).includes(id);
}

// POST /webhooks/:provider — the real completion path for a non-mock
// provider (Stripe/P24/PayPal). Unused by the current mock topUp flow
// (which completes synchronously), but runs the same ledger code path so
// swapping in a real adapter later doesn't touch the credit logic at all.
export async function handleWebhook(c: Context) {
  const provider = c.req.param('provider');
  if (!isKnownProvider(provider)) {
    return c.json({ error: 'Unknown provider' }, 400);
  }

  const payload = await c.req.json().catch(() => null);
  const result = await getProvider(provider).handleWebhook(payload);
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
