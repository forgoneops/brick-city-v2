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

// Declared early (ahead of walletTransactions below) since mysqlEnum() reads
// these arrays at module-evaluation time, not just for typing.
export const walletTransactionTypeValues = ['topup', 'subscription', 'spend', 'refund'] as const;
export const walletTransactionStatusValues = ['pending', 'completed', 'failed'] as const;
export const paymentProviderIdValues = ['stripe', 'przelewy24', 'paypal'] as const;

// Phase 3c: extended with type/provider/providerRef/status so the ledger can
// represent a full topup -> checkout -> webhook -> credit lifecycle.
// amountCents stays signed (negative = debit) so SUM() gives balance deltas.
export const walletTransactions = mysqlTable('wallet_transactions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  amountCents: int('amount_cents').notNull(),
  type: mysqlEnum('type', walletTransactionTypeValues).notNull().default('topup'),
  reason: varchar('reason', { length: 128 }).notNull(),
  provider: mysqlEnum('provider', paymentProviderIdValues),
  providerRef: varchar('provider_ref', { length: 128 }),
  status: mysqlEnum('status', walletTransactionStatusValues).notNull().default('completed'),
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
  // fsp: 3 — see the comment on seasons.startsAt for why this matters.
  createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
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
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
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

// ---------------------------------------------------------------------------
// Phase 3a — ranking
// ---------------------------------------------------------------------------

export const rankingScopeValues = ['global', 'city', 'category'] as const;

// Sentinel used in place of a real seasons.id for the running all-time
// bucket. Kept as a non-null string (not NULL) because MySQL unique indexes
// treat every NULL as distinct, which would let duplicate all-time rows slip
// through the uniqueness guard below.
export const ALLTIME_SEASON_ID = 'alltime';

export const seasons = mysqlTable('seasons', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  // fsp: 3 (millisecond precision) on startsAt/endsAt, and on every
  // createdAt column compared against them in scoring.ts's computeUserPoints
  // (checkIns/battleVotes/photos below) — without it, a JS `new Date()`
  // value serialized by mysql2 can round to a different whole second than
  // MySQL's own CURRENT_TIMESTAMP-backed defaultNow(), which let an event
  // genuinely after season-close land before the stored startsAt. See the
  // Ranking section of docs/DECISIONS.md.
  startsAt: timestamp('starts_at', { fsp: 3 }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { fsp: 3 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const rankingScores = mysqlTable(
  'ranking_scores',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    scope: mysqlEnum('scope', rankingScopeValues).notNull(),
    scopeKey: varchar('scope_key', { length: 128 }).notNull().default(''),
    // Either a real seasons.id, or ALLTIME_SEASON_ID for the unbounded bucket.
    seasonId: varchar('season_id', { length: 36 }).notNull(),
    points: int('points').notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('ranking_scores_unique').on(
      table.userId,
      table.scope,
      table.scopeKey,
      table.seasonId
    ),
  ]
);

// Schema so the ranking scoring service has a real points source to read
// from. Battles is now a live module (see modules/battles/router.ts) —
// battleId isn't FK'd to battles.id here to avoid an unrelated migration
// diff on an existing table; voting itself is still a future module.
export const battleVotes = mysqlTable(
  'battle_votes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    battleId: varchar('battle_id', { length: 36 }).notNull(),
    submissionUserId: varchar('submission_user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    voterId: varchar('voter_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('battle_votes_unique').on(table.battleId, table.voterId)]
);

// ---------------------------------------------------------------------------
// Battles module: admin-created contests writers submit one piece to.
// battleVotes (above) already exists as a scoring input; these two tables
// are the actual battle + submission records it was always missing.
// ---------------------------------------------------------------------------

export const battleStatusValues = ['upcoming', 'active', 'closed'] as const;

export const battles = mysqlTable('battles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  status: mysqlEnum('status', battleStatusValues).notNull().default('upcoming'),
  closesAt: timestamp('closes_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type Battle = typeof battles.$inferSelect;

// One submission per user per battle (uniqueIndex below) — createdAt uses
// fsp:3 to match the precision convention scoring.ts relies on elsewhere
// (see the Season comment above) in case battle submissions ever feed
// scoring the way battleVotes does.
export const battleSubmissions = mysqlTable(
  'battle_submissions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    battleId: varchar('battle_id', { length: 36 })
      .notNull()
      .references(() => battles.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    imageUrl: varchar('image_url', { length: 2048 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('battle_submissions_unique').on(table.battleId, table.userId)]
);

export type BattleSubmission = typeof battleSubmissions.$inferSelect;

// One credited check-in per user per pin (simple v1 dedupe — not per-day).
export const checkIns = mysqlTable(
  'check_ins',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    pinId: varchar('pin_id', { length: 36 })
      .notNull()
      .references(() => pins.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { fsp: 3 }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('check_ins_unique').on(table.pinId, table.userId)]
);

// ---------------------------------------------------------------------------
// Phase 3b — forum
// ---------------------------------------------------------------------------

export const forumCategories = mysqlTable('forum_categories', {
  id: varchar('id', { length: 36 }).primaryKey(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 128 }).notNull(),
  order: int('order').notNull().default(0),
});

export const forumThreads = mysqlTable('forum_threads', {
  id: varchar('id', { length: 36 }).primaryKey(),
  categoryId: varchar('category_id', { length: 36 })
    .notNull()
    .references(() => forumCategories.id),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  isPinned: boolean('is_pinned').notNull().default(false),
  isLocked: boolean('is_locked').notNull().default(false),
  // Soft-delete, matching the status-based moderation convention used by
  // photos/pins/events elsewhere in this schema (no hard deletes).
  deletedAt: timestamp('deleted_at'),
});

export const forumReplies = mysqlTable('forum_replies', {
  id: varchar('id', { length: 36 }).primaryKey(),
  threadId: varchar('thread_id', { length: 36 })
    .notNull()
    .references(() => forumThreads.id),
  authorId: varchar('author_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  propsCount: int('props_count').notNull().default(0),
});

export const forumProps = mysqlTable(
  'forum_props',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    replyId: varchar('reply_id', { length: 36 })
      .notNull()
      .references(() => forumReplies.id),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('forum_props_unique').on(table.replyId, table.userId)]
);

// ---------------------------------------------------------------------------
// Phase 3c — subscriptions + wallet
// ---------------------------------------------------------------------------

export const subscriptionStatusValues = ['trialing', 'active', 'expired', 'canceled'] as const;

export const subscriptions = mysqlTable('subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id),
  status: mysqlEnum('status', subscriptionStatusValues).notNull().default('trialing'),
  trialEndsAt: timestamp('trial_ends_at'),
  currentPeriodEnd: timestamp('current_period_end'),
  priceCents: int('price_cents').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// paymentProviders is a config KV row per provider — enabled flag only.
// Real API keys are never stored here or anywhere in the repo; they come
// from env vars on the deploy target (see .env.example) and are only
// referenced here as a placeholder label for the admin UI.
export const paymentProviders = mysqlTable('payment_providers', {
  id: mysqlEnum('id', paymentProviderIdValues).primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  keyPlaceholder: varchar('key_placeholder', { length: 255 }).notNull().default('NOT CONFIGURED'),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// ---------------------------------------------------------------------------
// Phase 4 — CMS: info pages (hero/announcement/nav/etc live as JSON blobs in
// the existing site_content kv table via modules/cms/config.ts; pages get
// their own table since CRUD-per-slug and per-page optimistic locking don't
// fit a single JSON blob cleanly).
// ---------------------------------------------------------------------------

export const cmsPages = mysqlTable('cms_pages', {
  slug: varchar('slug', { length: 128 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  published: boolean('published').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

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
export type Season = typeof seasons.$inferSelect;
export type RankingScore = typeof rankingScores.$inferSelect;
export type ForumThread = typeof forumThreads.$inferSelect;
export type ForumReply = typeof forumReplies.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type CmsPageRow = typeof cmsPages.$inferSelect;

// ---------------------------------------------------------------------------
// Live chat: one row per message. `channel` is either a public room key
// ('wall' | 'spots' | 'battles') or a DM channel 'dm:<uidA>:<uidB>' with the
// two user ids sorted — membership is enforced in the chat module, not here.
// ---------------------------------------------------------------------------

export const chatMessages = mysqlTable('chat_messages', {
  id: varchar('id', { length: 36 }).primaryKey(),
  channel: varchar('channel', { length: 96 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  body: varchar('body', { length: 500 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;

// ---------------------------------------------------------------------------
// Social graph: writer follows writer. Derived counters (followers count)
// are computed on read — no denormalized columns to drift.
// ---------------------------------------------------------------------------

export const follows = mysqlTable(
  'follows',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    followerId: varchar('follower_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    followedId: varchar('followed_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [uniqueIndex('follows_unique').on(table.followerId, table.followedId)]
);

export type Follow = typeof follows.$inferSelect;

// ---------------------------------------------------------------------------
// Web Push subscriptions — one row per browser endpoint registered by a
// signed-in writer. VAPID keys live in env vars on the deploy target,
// never in the DB or the repo.
// ---------------------------------------------------------------------------

export const pushSubscriptions = mysqlTable('push_subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id),
  endpoint: varchar('endpoint', { length: 512 }).notNull().unique(),
  p256dh: varchar('p256dh', { length: 255 }).notNull(),
  auth: varchar('auth', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
