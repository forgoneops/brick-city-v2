import { eq } from 'drizzle-orm';
import {
  CMS_KEY_PAYWALL_ENABLED,
  PAYWALL_ENABLED_DEFAULT,
} from '@bcm/shared';
import { getDb } from '../../db/index.js';
import { siteContent } from '../../db/schema.js';

/**
 * Paywall feature flag (Phase 3c).
 * The ENTIRE paywall is toggled on/off from the admin panel. The flag lives
 * in the CMS key-value store; an in-memory cache avoids a DB hit per request.
 *
 * TODO(phase-3c): replace cache with proper invalidation when CMS writes land.
 */
let cachedFlag: boolean | null = null;

export async function isPaywallEnabled(): Promise<boolean> {
  if (cachedFlag !== null) return cachedFlag;
  try {
    const rows = await getDb()
      .select()
      .from(siteContent)
      .where(eq(siteContent.key, CMS_KEY_PAYWALL_ENABLED))
      .limit(1);
    cachedFlag = rows[0] ? rows[0].value === 'true' : PAYWALL_ENABLED_DEFAULT;
  } catch {
    // DB unavailable — fall back to the default (paywall on).
    cachedFlag = PAYWALL_ENABLED_DEFAULT;
  }
  return cachedFlag;
}

export function setPaywallEnabledCache(enabled: boolean): void {
  cachedFlag = enabled;
}
