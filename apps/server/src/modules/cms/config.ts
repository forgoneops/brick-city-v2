import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { GALLERY_CATEGORIES, MAX_PRICE_PLN, MIN_PRICE_PLN, type CmsConfig } from '@bcv2/shared';
import { getDb } from '../../db/index.js';
import { siteContent } from '../../db/schema.js';
import { getPersistedPaywallConfig, setPersistedPaywallConfig } from '../subscriptions/access.js';

// Config domains stored as JSON blobs in the existing Phase-0 site_content
// kv table — see docs/DECISIONS.md ("CMS") for why this stays a kv blob per
// domain instead of new typed tables (pages are the one exception; they get
// a real table — see db/schema.ts's cmsPages).
const KEYS = {
  hero: 'cms_hero',
  announcement: 'cms_announcement',
  nav: 'cms_nav',
  galleryCategories: 'cms_gallery_categories',
  battleThemes: 'cms_battle_themes',
  featureFlags: 'cms_feature_flags',
  localeOverrides: 'cms_locale_overrides',
  legal: 'cms_legal',
  privacy: 'cms_privacy',
  registration: 'cms_registration',
} as const;

export type ConfigDomain = keyof typeof KEYS;

// Nav keys mirror apps/web/src/components/Layout.tsx's navItems — battles is
// deliberately excluded (it's handled entirely by the protected feature flag
// below, not by nav visibility).
const DEFAULT_NAV_ORDER = ['nav_home', 'nav_gallery', 'nav_map', 'nav_news', 'nav_events', 'nav_forum', 'nav_ranking'];

// Flags that stay force-false regardless of what's stored. Empty as of the
// battles launch — battles is now a live module, togglable from the CMS.
const PROTECTED_FALSE_FLAGS: string[] = [];

export const heroConfigSchema = z.object({
  title: z.string().min(1).max(255),
  subtitle: z.string().max(255),
  cta: z.string().min(1).max(64),
});

export const announcementConfigSchema = z.object({
  text: z.string().max(500),
  enabled: z.boolean(),
  showAsPopup: z.boolean().default(false),
});

export const navConfigSchema = z.object({
  items: z.array(z.object({ key: z.string().min(1), visible: z.boolean() })).min(1),
});

export const galleryCategoriesConfigSchema = z.object({
  items: z.array(z.object({ category: z.string().min(1), visible: z.boolean() })).min(1),
});

export const battleThemesConfigSchema = z.object({
  items: z.array(z.string().min(1).max(128)),
});

export const featureFlagsConfigSchema = z.object({
  flags: z.record(z.string().max(64), z.boolean()),
});

// Phase 5 validation sweep: this was the one config domain with no length
// caps at all — a malicious or buggy admin session could otherwise write an
// arbitrarily large blob into site_content.
export const localeOverridesConfigSchema = z.object({
  values: z.record(z.string().max(8), z.record(z.string().max(128), z.string().max(2000))),
});

export const pricingConfigSchema = z.object({
  pricePln: z.number().int().min(MIN_PRICE_PLN).max(MAX_PRICE_PLN),
  paywallEnabled: z.boolean(),
});

// Blocking first-visit terms popup — see FirstVisitPopups.tsx (web).
// Localized per site locale (en/pl/de), same as every other user-facing
// string in this app — a single flat `text` field would mean every visitor
// sees the same language regardless of their own. `version` is bumped to
// re-trigger the popup for everyone, across all three languages at once.
export const legalConfigSchema = z.object({
  version: z.number().int(),
  pl: z.string().max(20_000),
  en: z.string().max(20_000),
  de: z.string().max(20_000),
});

// Privacy Policy — same shape/limits as legal above, but its own domain: a
// reachable page rather than a blocking popup, so it doesn't share Terms'
// version/re-trigger semantics. See docs/DECISIONS.md ("Privacy Policy").
export const privacyConfigSchema = z.object({
  version: z.number().int(),
  pl: z.string().max(20_000),
  en: z.string().max(20_000),
  de: z.string().max(20_000),
});

// Gates whether auth.register requires a valid invite code. Defaults to
// true (see defaultValue below) so adding this toggle is zero behavior
// change until an admin explicitly flips it — see modules/auth/router.ts.
export const registrationConfigSchema = z.object({
  inviteOnly: z.boolean(),
});

const SCHEMAS = {
  hero: heroConfigSchema,
  announcement: announcementConfigSchema,
  nav: navConfigSchema,
  galleryCategories: galleryCategoriesConfigSchema,
  battleThemes: battleThemesConfigSchema,
  featureFlags: featureFlagsConfigSchema,
  localeOverrides: localeOverridesConfigSchema,
  legal: legalConfigSchema,
  privacy: privacyConfigSchema,
  registration: registrationConfigSchema,
} as const;

function defaultValue(domain: ConfigDomain): unknown {
  switch (domain) {
    case 'hero':
      return { title: "BRICK CITY\nMASHIN'", subtitle: 'EST. ON CONCRETE', cta: 'Enter the alley' };
    case 'announcement':
      return { text: '', enabled: false, showAsPopup: false };
    case 'nav':
      return { items: DEFAULT_NAV_ORDER.map((key) => ({ key, visible: true })) };
    case 'galleryCategories':
      return { items: GALLERY_CATEGORIES.map((category) => ({ category, visible: true })) };
    case 'battleThemes':
      return { items: [] };
    case 'featureFlags':
      return { flags: { battles: true } };
    case 'localeOverrides':
      return { values: { en: {}, pl: {}, de: {} } };
    case 'legal': {
      const placeholder = '[PLACEHOLDER — owner to supply final regulamin text]';
      return { version: 1, pl: placeholder, en: placeholder, de: placeholder };
    }
    case 'privacy': {
      const placeholder = '[PLACEHOLDER — owner to supply final privacy policy text]';
      return { version: 1, pl: placeholder, en: placeholder, de: placeholder };
    }
    case 'registration':
      return { inviteOnly: true };
  }
}

async function readDomain<T>(domain: ConfigDomain): Promise<{ value: T; updatedAt: string | null }> {
  const db = getDb();
  const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEYS[domain]));
  if (!row) {
    return { value: defaultValue(domain) as T, updatedAt: null };
  }
  return { value: JSON.parse(row.value) as T, updatedAt: row.updatedAt.toISOString() };
}

// Optimistic locking: if the caller read the config at time X and someone
// else wrote it since, reject rather than silently clobber their change.
// expectedUpdatedAt === null means "I know this key has never been set" —
// still checked, so a genuine first-writer-wins race is caught too.
async function writeDomain(domain: ConfigDomain, value: unknown, expectedUpdatedAt: string | null | undefined): Promise<void> {
  const db = getDb();
  if (expectedUpdatedAt !== undefined) {
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, KEYS[domain]));
    const currentUpdatedAt = row?.updatedAt.toISOString() ?? null;
    if (currentUpdatedAt !== expectedUpdatedAt) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This section changed since you loaded it. Reload and retry.',
      });
    }
  }
  const json = JSON.stringify(value);
  await db
    .insert(siteContent)
    .values({ key: KEYS[domain], value: json })
    .onDuplicateKeyUpdate({ set: { value: json } });
  invalidateCmsCache();
}

export async function setDomainConfig(
  domain: ConfigDomain,
  rawValue: unknown,
  expectedUpdatedAt: string | null | undefined
): Promise<void> {
  const parsed = SCHEMAS[domain].parse(rawValue);
  await writeDomain(domain, parsed, expectedUpdatedAt);
}

let cached: CmsConfig | null = null;

export function invalidateCmsCache(): void {
  cached = null;
}

// Public getConfig is cached in-process (single-instance Node server —
// invalidated on every write, so there's no staleness beyond the current
// request's write path; a multi-instance deploy would need a real cache bus,
// out of scope for this phase).
export async function getCmsConfig(): Promise<CmsConfig> {
  if (cached) return cached;

  const [hero, announcement, nav, galleryCategories, battleThemes, featureFlags, localeOverrides, legal, privacy, registration] =
    await Promise.all([
      readDomain<{ title: string; subtitle: string; cta: string }>('hero'),
      readDomain<{ text: string; enabled: boolean; showAsPopup: boolean }>('announcement'),
      readDomain<{ items: { key: string; visible: boolean }[] }>('nav'),
      readDomain<{ items: { category: string; visible: boolean }[] }>('galleryCategories'),
      readDomain<{ items: string[] }>('battleThemes'),
      readDomain<{ flags: Record<string, boolean> }>('featureFlags'),
      readDomain<{ values: Record<string, Record<string, string>> }>('localeOverrides'),
      readDomain<{ version: number; pl: string; en: string; de: string }>('legal'),
      readDomain<{ version: number; pl: string; en: string; de: string }>('privacy'),
      readDomain<{ inviteOnly: boolean }>('registration'),
    ]);

  const pricingValue = await getPersistedPaywallConfig();
  const db = getDb();
  const [pricingRow] = await db.select().from(siteContent).where(eq(siteContent.key, 'paywall_price_cents'));

  const effectiveFlags = { ...featureFlags.value.flags };
  for (const flag of PROTECTED_FALSE_FLAGS) {
    effectiveFlags[flag] = false;
  }

  cached = {
    hero: { ...hero.value, updatedAt: hero.updatedAt },
    announcement: { ...announcement.value, updatedAt: announcement.updatedAt },
    nav: { ...nav.value, updatedAt: nav.updatedAt },
    galleryCategories: { ...galleryCategories.value, updatedAt: galleryCategories.updatedAt },
    battleThemes: { ...battleThemes.value, updatedAt: battleThemes.updatedAt },
    featureFlags: { flags: effectiveFlags, updatedAt: featureFlags.updatedAt },
    localeOverrides: { ...localeOverrides.value, updatedAt: localeOverrides.updatedAt },
    pricing: { ...pricingValue, updatedAt: pricingRow?.updatedAt.toISOString() ?? null },
    legal: { ...legal.value, updatedAt: legal.updatedAt },
    privacy: { ...privacy.value, updatedAt: privacy.updatedAt },
    registration: { ...registration.value, updatedAt: registration.updatedAt },
  };
  return cached;
}

// Pricing writes delegate to subscriptions/access.ts — see docs/DECISIONS.md
// ("subscriptionPriceCents exists — move here"): one source of truth, the
// CMS pricing tab is a second entry point onto the same persisted config
// Phase 3c already built, not a parallel copy of it.
export async function setPricingConfig(
  value: { pricePln: number; paywallEnabled: boolean },
  expectedUpdatedAt: string | null | undefined
): Promise<void> {
  const parsed = pricingConfigSchema.parse(value);
  if (expectedUpdatedAt !== undefined) {
    const db = getDb();
    const [row] = await db.select().from(siteContent).where(eq(siteContent.key, 'paywall_price_cents'));
    const currentUpdatedAt = row?.updatedAt.toISOString() ?? null;
    if (currentUpdatedAt !== expectedUpdatedAt) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'This section changed since you loaded it. Reload and retry.',
      });
    }
  }
  await setPersistedPaywallConfig(parsed);
  invalidateCmsCache();
}
