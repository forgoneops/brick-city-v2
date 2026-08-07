/**
 * @bcv2/shared — shared types and constants for Brick City Mashin' v2.
 * Imported by both apps/server and apps/web. Keep free of runtime dependencies.
 */

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export const ROLES = ['user', 'moderator', 'admin'] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

export const GALLERY_CATEGORIES = [
  'piece',
  'throw-up',
  'tag',
  'character',
  'stencil',
  'other',
] as const;
export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Forum
// ---------------------------------------------------------------------------

export const FORUM_CATEGORIES = [
  'general',
  'spots',
  'gear',
  'events',
  'battles',
  'meta',
] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface Invite {
  id: string;
  code: string;
  createdBy: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
}

export interface InviteRedemption {
  id: string;
  inviteId: string;
  userId: string;
  redeemedAt: string;
}

// ---------------------------------------------------------------------------
// Paywall / trial
// ---------------------------------------------------------------------------

export const TRIAL_DAYS = 7;
export const DEFAULT_PRICE_PLN = 25;
export const MIN_PRICE_PLN = 20;
export const MAX_PRICE_PLN = 30;
export const PAYWALL_DEFAULT_ON = true;

export interface PaywallConfig {
  paywallEnabled: boolean;
  pricePln: number;
}

// ---------------------------------------------------------------------------
// Public user shape (safe to expose to clients)
// ---------------------------------------------------------------------------

export interface PublicUser {
  id: string;
  email: string;
  nick: string;
  role: Role;
  walletBalanceCents: number;
  trialEndsAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Phase 4 — CMS config (typed layer over the site_content kv store)
// ---------------------------------------------------------------------------

export interface HeroConfig {
  title: string;
  subtitle: string;
  cta: string;
  updatedAt: string | null;
}

export interface AnnouncementConfig {
  text: string;
  enabled: boolean;
  // Also surface the banner as a one-time dismissible popup on first sight of
  // this content — see FirstVisitPopups.tsx. Doesn't change the persistent
  // banner behavior at all, purely an extra nudge.
  showAsPopup: boolean;
  updatedAt: string | null;
}

export interface NavItemConfig {
  key: string;
  visible: boolean;
}

export interface NavConfig {
  items: NavItemConfig[];
  updatedAt: string | null;
}

export interface GalleryCategoryEntry {
  category: string;
  visible: boolean;
}

export interface GalleryCategoriesConfig {
  items: GalleryCategoryEntry[];
  updatedAt: string | null;
}

export interface BattleThemesConfig {
  items: string[];
  updatedAt: string | null;
}

// Flag names are open-ended (Record<string, boolean>) so new flags can be
// added without a shared-package change; `battles` is always present as the
// worked example. See docs/DECISIONS.md — battles stays force-false
// regardless of this map's stored value, per the standing CLAUDE.md rule.
export interface FeatureFlagsConfig {
  flags: Record<string, boolean>;
  updatedAt: string | null;
}

export type LocaleOverrideMap = Record<string, Record<string, string>>;

export interface LocaleOverridesConfig {
  values: LocaleOverrideMap;
  updatedAt: string | null;
}

export interface CmsPricingConfig {
  pricePln: number;
  paywallEnabled: boolean;
  updatedAt: string | null;
}

// Blocking first-visit terms — localized per site locale (en/pl/de), same
// as every other user-facing string in this app. `version` is the
// re-trigger knob: bumping it re-shows the popup to everyone, across all
// three languages at once, regardless of the text diff size.
export interface LegalConfig {
  version: number;
  pl: string;
  en: string;
  de: string;
  updatedAt: string | null;
}

// Gates whether auth.register requires a valid invite code — see
// modules/auth/router.ts and docs/DECISIONS.md. Defaults to true.
export interface RegistrationConfig {
  inviteOnly: boolean;
  updatedAt: string | null;
}

export interface CmsConfig {
  hero: HeroConfig;
  announcement: AnnouncementConfig;
  nav: NavConfig;
  galleryCategories: GalleryCategoriesConfig;
  battleThemes: BattleThemesConfig;
  featureFlags: FeatureFlagsConfig;
  localeOverrides: LocaleOverridesConfig;
  pricing: CmsPricingConfig;
  legal: LegalConfig;
  registration: RegistrationConfig;
}

export interface CmsPage {
  slug: string;
  title: string;
  body: string;
  published: boolean;
  updatedAt: string;
  createdAt: string;
}
