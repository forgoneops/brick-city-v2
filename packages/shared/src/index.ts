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
