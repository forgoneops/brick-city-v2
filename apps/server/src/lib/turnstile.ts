import { env } from '../env.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// No-op (always passes) until TURNSTILE_SECRET_KEY is configured — same
// "real integration, mock until keys exist" pattern as the payment
// providers in modules/subscriptions/providers.ts. Never throws on network
// failure; treats a verify-service outage as a soft-fail (returns false)
// rather than taking registration down with it.
export async function verifyTurnstile(token: string | undefined): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;

  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
