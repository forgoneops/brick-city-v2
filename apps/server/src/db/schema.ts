import {
  boolean,
  double,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
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

// ---------------------------------------------------------------------------
// Phase 2 — core portal tables
// ---------------------------------------------------------------------------

export const photoStatusValues = ['live', 'flagged', 'removed'] as const;
export const pinTypeValues = ['legal wall', 'spot', 'hall of fame', 'event'] as const;
export const reviewStatusValues = ['pending', 'live', 'rejected'] as const;
export const postStatusValues = ['draft', 'published'] as const;
export const reportTargetTypeValues = ['photo', 'pin', 'comment', 'user'] as const;
export const reportStatusValues = ['open', 'resolved', 'dismissed'] as const;

export const photos = mysqlTable('photos', {
  id: varchar('id', { length: 36 }).primaryKey(),
  // nullable -> anonymous upload
  authorId: varchar('author_id', { length: 36 }).references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  category: mysqlEnum('category', GALLERY_CATEGORIES).notNull(),
  city: varchar('city', { length: 128 }).notNull().default(''),
  imageUrl: varchar('image_url', { length: 512 }).notNull(),
  thumbUrl: varchar('thumb_url', { length: 512 }).notNull(),
  propsCount: int('props_count').notNull().default(0),
  status: mysqlEnum('status', photoStatusValues).notNull().default('live'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const props = mysqlTable(
  'props',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    photoId: varchar('photo_id', { length: 36 })
      .notNull()
      .references(() => photos.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('props_photo_user_unique').on(table.photoId, table.userId)]
);

export const pins = mysqlTable('pins', {
  id: varchar('id', { length: 36 }).primaryKey(),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  city: varchar('city', { length: 128 }).notNull().default(''),
  type: mysqlEnum('type', pinTypeValues).notNull(),
  lat: double('lat').notNull(),
  lng: double('lng').notNull(),
  status: mysqlEnum('status', reviewStatusValues).notNull().default('pending'),
  membersOnly: boolean('members_only').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const posts = mysqlTable('posts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  category: varchar('category', { length: 64 }).notNull().default('dispatch'),
  body: text('body').notNull(),
  status: mysqlEnum('status', postStatusValues).notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const events = mysqlTable('events', {
  id: varchar('id', { length: 36 }).primaryKey(),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  name: varchar('name', { length: 255 }).notNull(),
  city: varchar('city', { length: 128 }).notNull().default(''),
  type: varchar('type', { length: 64 }).notNull().default('jam'),
  date: timestamp('date').notNull(),
  status: mysqlEnum('status', reviewStatusValues).notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const reports = mysqlTable('reports', {
  id: varchar('id', { length: 36 }).primaryKey(),
  targetType: mysqlEnum('target_type', reportTargetTypeValues).notNull(),
  targetId: varchar('target_id', { length: 36 }).notNull(),
  reporterId: varchar('reporter_id', { length: 36 }).references(() => users.id),
  reason: text('reason').notNull(),
  aiFlag: boolean('ai_flag').notNull().default(false),
  status: mysqlEnum('status', reportStatusValues).notNull().default('open'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const comments = mysqlTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  photoId: varchar('photo_id', { length: 36 })
    .notNull()
    .references(() => photos.id),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Shared category enums are exported as convenient Zod bases below.
export const galleryCategoryValues = GALLERY_CATEGORIES as unknown as [string, ...string[]];
export const forumCategoryValues = FORUM_CATEGORIES as unknown as [string, ...string[]];

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Invite = typeof invites.$inferSelect;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type Photo = typeof photos.$inferSelect;
export type Pin = typeof pins.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PortalEvent = typeof events.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Comment = typeof comments.$inferSelect;
