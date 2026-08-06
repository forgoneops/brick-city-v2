// Seed script — Phase 2 + Phase 3 + Phase 4 verification data.
// Creates: 1 admin, 7 writers (2 with subscription demo states), 1 invite
// code, 6 photos, 3 pins, 2 posts, 2 events, 1 open report, 1 active season
// with 5 scored users, 6 forum categories + 2 threads + replies + props,
// 3 payment providers, persisted paywall config, 2 wallet transactions,
// 1 published CMS info page (/pages/rules).
// Idempotent per run (fixed IDs, insert-ignore).
// Usage: DATABASE_URL=... npm run db:seed -w @bcv2/server
import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import sharp from 'sharp';
import { DEFAULT_PRICE_PLN, FORUM_CATEGORIES, TRIAL_DAYS } from '@bcv2/shared';
import { getDb } from './db/index.js';
import {
  checkIns,
  cmsPages,
  events,
  forumCategories,
  forumProps,
  forumReplies,
  forumThreads,
  invites,
  paymentProviders,
  photos,
  pins,
  posts,
  reports,
  seasons,
  siteContent,
  subscriptions,
  users,
  walletTransactions,
} from './db/schema.js';
import { hashPassword } from './lib/password.js';
import { getStorage } from './lib/storage.js';
import { recalculateUserScore } from './modules/ranking/scoring.js';

const ADMIN_ID = 'seed-admin-0000-0000-000000000001';
const WRITER1_ID = 'seed-writer-000-0000-000000000002'; // DUSK
const WRITER2_ID = 'seed-writer-000-0000-000000000003'; // MURAL
const WRITER3_ID = 'seed-writer-000-0000-000000000004'; // SKETCH
const WRITER4_ID = 'seed-writer-000-0000-000000000005'; // VANDAL
const WRITER5_ID = 'seed-writer-000-0000-000000000006'; // GLYPH
const TRIALING_ID = 'seed-writer-000-0000-000000000007'; // FRESH — healthy trial demo
const EXPIRED_ID = 'seed-writer-000-0000-000000000008'; // GHOST — expired/blocked demo

const SEASON_ID = 'seed-season-00-0000-000000000001';

async function seedPhotoImage(key: string, color: string) {
  const storage = getStorage();
  const image = await sharp({
    create: { width: 800, height: 1000, channels: 3, background: color },
  })
    .webp({ quality: 80 })
    .toBuffer();
  const thumb = await sharp({
    create: { width: 400, height: 500, channels: 3, background: color },
  })
    .webp({ quality: 70 })
    .toBuffer();
  await storage.put(key, image, 'image/webp');
  await storage.put(key.replace('photo', 'thumb'), thumb, 'image/webp');
  return { imageUrl: storage.url(key), thumbUrl: storage.url(key.replace('photo', 'thumb')) };
}

async function main() {
  const db = getDb();
  const passwordHash = await hashPassword('brickcity123');
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  await db
    .insert(users)
    .values([
      { id: ADMIN_ID, email: 'admin@brickcity.local', nick: 'GATEKEEPER', role: 'admin', passwordHash },
      { id: WRITER1_ID, email: 'dusk@brickcity.local', nick: 'DUSK', role: 'user', passwordHash, trialEndsAt },
      { id: WRITER2_ID, email: 'mural@brickcity.local', nick: 'MURAL', role: 'user', passwordHash, trialEndsAt },
      { id: WRITER3_ID, email: 'sketch@brickcity.local', nick: 'SKETCH', role: 'user', passwordHash, trialEndsAt },
      { id: WRITER4_ID, email: 'vandal@brickcity.local', nick: 'VANDAL', role: 'user', passwordHash, trialEndsAt },
      { id: WRITER5_ID, email: 'glyph@brickcity.local', nick: 'GLYPH', role: 'user', passwordHash, trialEndsAt },
      {
        id: TRIALING_ID,
        email: 'fresh@brickcity.local',
        nick: 'FRESH',
        role: 'user',
        passwordHash,
        trialEndsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: EXPIRED_ID,
        email: 'ghost@brickcity.local',
        nick: 'GHOST',
        role: 'user',
        passwordHash,
        trialEndsAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        walletBalanceCents: 0,
      },
    ])
    .onDuplicateKeyUpdate({ set: { nick: sql`${users.nick}` } });

  // Every non-admin seeded user needs a matching subscriptions row —
  // requireActiveAccess reads this table, and without it even the "healthy"
  // writers would be paywall-blocked the moment gating landed.
  const priceCents = DEFAULT_PRICE_PLN * 100;
  await db
    .insert(subscriptions)
    .values([
      { id: randomUUID(), userId: WRITER1_ID, status: 'trialing', trialEndsAt, priceCents },
      { id: randomUUID(), userId: WRITER2_ID, status: 'trialing', trialEndsAt, priceCents },
      { id: randomUUID(), userId: WRITER3_ID, status: 'trialing', trialEndsAt, priceCents },
      { id: randomUUID(), userId: WRITER4_ID, status: 'trialing', trialEndsAt, priceCents },
      { id: randomUUID(), userId: WRITER5_ID, status: 'trialing', trialEndsAt, priceCents },
      {
        id: randomUUID(),
        userId: TRIALING_ID,
        status: 'trialing',
        trialEndsAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        priceCents,
      },
      {
        id: randomUUID(),
        userId: EXPIRED_ID,
        status: 'expired',
        trialEndsAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        priceCents,
      },
    ])
    .onDuplicateKeyUpdate({ set: { status: sql`${subscriptions.status}` } });

  await db
    .insert(invites)
    .values({
      id: randomUUID(),
      code: 'WAW-044',
      createdBy: ADMIN_ID,
      maxUses: 10,
      usedCount: 0,
    })
    .onDuplicateKeyUpdate({ set: { maxUses: 10 } });

  const photoColors = ['#2b2b2e', '#3a2d23', '#232a2b', '#33302a', '#2d2333', '#23332a'];
  const photoTitles = ['NIGHT SHIFT', 'CONCRETE PSALM', 'GREY ON GREY', 'THIRD RAIL', 'SIDE DOOR', 'LAST TRAIN'];
  for (let i = 0; i < 6; i++) {
    const id = `seed-photo-000-0000-00000000000${i + 1}`;
    const { imageUrl, thumbUrl } = await seedPhotoImage(`seed/${id}-photo.webp`, photoColors[i]);
    await db
      .insert(photos)
      .values({
        id,
        authorId: i % 2 === 0 ? WRITER1_ID : WRITER2_ID,
        title: photoTitles[i],
        category: (['piece', 'throw-up', 'tag', 'character', 'stencil', 'other'] as const)[i],
        city: 'Warszawa',
        imageUrl,
        thumbUrl,
        propsCount: i,
        status: 'live',
      })
      .onDuplicateKeyUpdate({ set: { title: photoTitles[i] } });
  }

  await db
    .insert(pins)
    .values([
      {
        id: 'seed-pin-0000-0000-0000000000001',
        authorId: WRITER1_ID,
        name: 'Praga North Wall',
        city: 'Warszawa',
        type: 'legal wall',
        lat: 52.2545,
        lng: 21.0345,
        status: 'live',
        membersOnly: false,
      },
      {
        id: 'seed-pin-0000-0000-0000000000002',
        authorId: WRITER2_ID,
        name: 'Underpass Hall',
        city: 'Warszawa',
        type: 'hall of fame',
        lat: 52.2212,
        lng: 21.0078,
        status: 'live',
        membersOnly: false,
      },
      {
        id: 'seed-pin-0000-0000-0000000000003',
        authorId: WRITER1_ID,
        name: 'Rooftop 44',
        city: 'Warszawa',
        type: 'spot',
        lat: 52.2297,
        lng: 21.0122,
        status: 'live',
        membersOnly: true,
      },
    ])
    .onDuplicateKeyUpdate({ set: { name: sql`${pins.name}` } });

  await db
    .insert(posts)
    .values([
      {
        id: 'seed-post-000-0000-0000000000001',
        authorId: ADMIN_ID,
        title: 'DISPATCH 001 — THE ALLEY OPENS',
        category: 'dispatch',
        body: 'First zine entry of the new portal. Walls get documented, spots stay whispered.',
        status: 'published',
        publishedAt: new Date(),
      },
      {
        id: 'seed-post-000-0000-0000000000002',
        authorId: ADMIN_ID,
        title: 'DISPATCH 002 — RULES OF THE WALL',
        category: 'dispatch',
        body: 'Respect the buff. Credit the writer. No snitching, ever.',
        status: 'published',
        publishedAt: new Date(),
      },
    ])
    .onDuplicateKeyUpdate({ set: { title: sql`${posts.title}` } });

  await db
    .insert(events)
    .values([
      {
        id: 'seed-event-00-0000-0000000000001',
        authorId: WRITER1_ID,
        name: 'Warsaw Jam Session',
        city: 'Warszawa',
        type: 'jam',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'live',
      },
      {
        id: 'seed-event-00-0000-0000000000002',
        authorId: WRITER2_ID,
        name: 'Night Walk: Praga',
        city: 'Warszawa',
        type: 'walk',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'live',
      },
    ])
    .onDuplicateKeyUpdate({ set: { name: sql`${events.name}` } });

  await db
    .insert(reports)
    .values({
      id: 'seed-report-00-0000-0000000000001',
      targetType: 'photo',
      targetId: 'seed-photo-000-0000-000000000006',
      reporterId: WRITER2_ID,
      reason: 'Toy work covering a burner from 2019.',
      aiFlag: false,
      status: 'open',
    })
    .onDuplicateKeyUpdate({ set: { status: 'open' } });

  // --- Phase 3a: ranking season + check-ins for the 3 writers with no
  // photos of their own, so all 5 scored users have a nonzero footprint. ---
  await db
    .insert(seasons)
    .values({
      id: SEASON_ID,
      name: 'Season 1',
      startsAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      isActive: true,
    })
    .onDuplicateKeyUpdate({ set: { name: sql`${seasons.name}` } });

  await db
    .insert(checkIns)
    .values([
      { id: 'seed-checkin-0-0000-000000000001', pinId: 'seed-pin-0000-0000-0000000000001', userId: WRITER3_ID },
      { id: 'seed-checkin-0-0000-000000000002', pinId: 'seed-pin-0000-0000-0000000000002', userId: WRITER3_ID },
      { id: 'seed-checkin-0-0000-000000000003', pinId: 'seed-pin-0000-0000-0000000000001', userId: WRITER4_ID },
      { id: 'seed-checkin-0-0000-000000000004', pinId: 'seed-pin-0000-0000-0000000000002', userId: WRITER5_ID },
    ])
    .onDuplicateKeyUpdate({ set: { userId: sql`${checkIns.userId}` } });

  for (const userId of [WRITER1_ID, WRITER2_ID, WRITER3_ID, WRITER4_ID, WRITER5_ID]) {
    await recalculateUserScore(userId);
  }

  // --- Phase 3b: forum categories + 2 threads (1 pinned) + replies + props. ---
  await db
    .insert(forumCategories)
    .values(FORUM_CATEGORIES.map((slug, i) => ({ id: slug, slug, name: slug.toUpperCase(), order: i })))
    .onDuplicateKeyUpdate({ set: { order: sql`${forumCategories.order}` } });

  const THREAD1_ID = 'seed-thread-00-0000-000000000001';
  const THREAD2_ID = 'seed-thread-00-0000-000000000002';
  await db
    .insert(forumThreads)
    .values([
      { id: THREAD1_ID, categoryId: 'general', authorId: WRITER1_ID, title: 'Welcome to the alley', isPinned: true },
      { id: THREAD2_ID, categoryId: 'general', authorId: WRITER2_ID, title: 'Best caps for wet brick?' },
    ])
    .onDuplicateKeyUpdate({ set: { title: sql`${forumThreads.title}` } });

  const REPLY1_ID = 'seed-reply-000-0000-000000000001';
  const REPLY2_ID = 'seed-reply-000-0000-000000000002';
  const REPLY3_ID = 'seed-reply-000-0000-000000000003';
  await db
    .insert(forumReplies)
    .values([
      { id: REPLY1_ID, threadId: THREAD1_ID, authorId: WRITER1_ID, body: 'Read the rules dispatch first. Then go make something.', propsCount: 1 },
      { id: REPLY2_ID, threadId: THREAD2_ID, authorId: WRITER2_ID, body: 'Fat caps hold up better in the wet, NY skinnies bleed.' },
      { id: REPLY3_ID, threadId: THREAD2_ID, authorId: WRITER1_ID, body: 'Agreed, primer helps too if the brick is porous.' },
    ])
    .onDuplicateKeyUpdate({ set: { body: sql`${forumReplies.body}` } });

  await db
    .insert(forumProps)
    .values({ id: 'seed-fprops-00-0000-000000000001', replyId: REPLY1_ID, userId: WRITER2_ID })
    .onDuplicateKeyUpdate({ set: { userId: sql`${forumProps.userId}` } });

  // --- Phase 3c: payment providers, persisted paywall config, wallet demo. ---
  await db
    .insert(paymentProviders)
    .values([
      { id: 'stripe', enabled: true, keyPlaceholder: 'NOT CONFIGURED' },
      { id: 'przelewy24', enabled: true, keyPlaceholder: 'NOT CONFIGURED' },
      { id: 'paypal', enabled: false, keyPlaceholder: 'NOT CONFIGURED' },
    ])
    .onDuplicateKeyUpdate({ set: { enabled: sql`${paymentProviders.enabled}` } });

  await db
    .insert(siteContent)
    .values([
      { key: 'paywall_enabled', value: 'true' },
      { key: 'paywall_price_cents', value: String(priceCents) },
    ])
    .onDuplicateKeyUpdate({ set: { value: sql`${siteContent.value}` } });

  // MURAL demonstrates a topup + a subscription auto-debit, netting to a
  // small positive balance so the wallet card has something to show.
  await db
    .insert(walletTransactions)
    .values([
      {
        id: 'seed-wtx-0000-0000-000000000001',
        userId: WRITER2_ID,
        amountCents: 2500,
        type: 'topup',
        reason: 'top-up',
        provider: 'stripe',
        providerRef: 'seed_ref_topup_001',
        status: 'completed',
      },
      {
        id: 'seed-wtx-0000-0000-000000000002',
        userId: WRITER2_ID,
        amountCents: -2000,
        type: 'subscription',
        reason: 'subscription-auto-debit',
        status: 'completed',
      },
    ])
    .onDuplicateKeyUpdate({ set: { status: sql`${walletTransactions.status}` } });
  await db
    .update(users)
    .set({ walletBalanceCents: 500 })
    .where(eq(users.id, WRITER2_ID));

  // --- Phase 4: one published CMS info page for E2E verification. ---
  await db
    .insert(cmsPages)
    .values({
      slug: 'rules',
      title: 'RULES OF THE WALL',
      body: 'Respect the buff.\nCredit the writer.\nNo snitching, ever.',
      published: true,
    })
    .onDuplicateKeyUpdate({ set: { title: sql`${cmsPages.title}` } });

  console.log('Seed complete:');
  console.log('  admin login   admin@brickcity.local / brickcity123');
  console.log('  writer logins dusk/mural/sketch/vandal/glyph@brickcity.local / brickcity123');
  console.log('  trial demo    fresh@brickcity.local (healthy trial) / brickcity123');
  console.log('  expired demo  ghost@brickcity.local (paywall-blocked) / brickcity123');
  console.log('  invite code   WAW-044');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
