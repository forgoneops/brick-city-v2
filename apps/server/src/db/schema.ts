import {
  boolean,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { INVITE_TYPES, USER_ROLES } from '@bcm/shared';

/**
 * Drizzle ORM schema (mysql-core) — Phase 0 core tables.
 * Feature modules will add their own tables in later phases; keep tables
 * module-owned so new features never touch existing schema files.
 */

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  nick: varchar('nick', { length: 64 }).notNull().unique(),
  role: mysqlEnum('role', USER_ROLES).notNull().default('user'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  walletBalanceCents: int('wallet_balance_cents').notNull().default(0),
  /** Trial ends 7 days after registration (see subscriptions module). */
  trialEndsAt: timestamp('trial_ends_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invites = mysqlTable('invites', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  type: mysqlEnum('type', INVITE_TYPES).notNull().default('single-use'),
  createdBy: varchar('created_by', { length: 36 })
    .notNull()
    .references(() => users.id),
  maxUses: int('max_uses').notNull().default(1),
  usedCount: int('used_count').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const inviteRedemptions = mysqlTable('invite_redemptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  inviteId: varchar('invite_id', { length: 36 })
    .notNull()
    .references(() => invites.id),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  redeemedAt: timestamp('redeemed_at').notNull().defaultNow(),
});

export const sessions = mysqlTable('sessions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  /** Hash of the refresh token; access tokens are stateless JWTs. */
  refreshTokenHash: varchar('refresh_token_hash', { length: 255 }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

/** CMS key-value store (Phase 4) — also holds feature flags like paywallEnabled. */
export const siteContent = mysqlTable('site_content', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  updatedBy: varchar('updated_by', { length: 36 }),
});

/** Wallet ledger stub (Phase 3c) — top-ups recorded here in later phases. */
export const walletTransactions = mysqlTable('wallet_transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  amountCents: int('amount_cents').notNull(),
  reason: varchar('reason', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type InviteRow = typeof invites.$inferSelect;
