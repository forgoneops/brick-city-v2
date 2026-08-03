import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { FORUM_CATEGORIES, GALLERY_CATEGORIES, ROLES } from '@bcv2/shared';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  nick: varchar('nick', { length: 64 }).notNull().unique(),
  role: mysqlEnum('role', ROLES).notNull().default('user'),
  walletBalanceCents: int('wallet_balance_cents').notNull().default(0),
  trialEndsAt: timestamp('trial_ends_at'),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const invites = mysqlTable('invites', {
  id: varchar('id', { length: 36 }).primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
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
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const siteContent = mysqlTable('site_content', {
  key: varchar('key', { length: 128 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

export const walletTransactions = mysqlTable('wallet_transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  amountCents: int('amount_cents').notNull(),
  reason: varchar('reason', { length: 128 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Gallery / map / forum stub tables are intentionally omitted in Phase 0.
// Shared category enums are exported as convenient Zod bases below.
export const galleryCategoryValues = GALLERY_CATEGORIES as unknown as [string, ...string[]];
export const forumCategoryValues = FORUM_CATEGORIES as unknown as [string, ...string[]];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
