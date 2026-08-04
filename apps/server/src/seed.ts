// Seed script — Phase 2 verification data.
// Creates: 1 admin, 2 writers, 1 invite code, 6 photos, 3 pins, 2 posts,
// 2 events, 1 open report. Idempotent per run (fixed IDs, insert-ignore).
// Usage: DATABASE_URL=... npm run db:seed -w @bcv2/server
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import sharp from 'sharp';
import { getDb } from './db/index.js';
import {
  events,
  invites,
  photos,
  pins,
  posts,
  reports,
  users,
} from './db/schema.js';
import { hashPassword } from './lib/password.js';
import { getStorage } from './lib/storage.js';

const ADMIN_ID = 'seed-admin-0000-0000-000000000001';
const WRITER1_ID = 'seed-writer-000-0000-000000000002';
const WRITER2_ID = 'seed-writer-000-0000-000000000003';

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

  await db
    .insert(users)
    .values([
      { id: ADMIN_ID, email: 'admin@brickcity.local', nick: 'GATEKEEPER', role: 'admin', passwordHash },
      { id: WRITER1_ID, email: 'dusk@brickcity.local', nick: 'DUSK', role: 'user', passwordHash },
      { id: WRITER2_ID, email: 'mural@brickcity.local', nick: 'MURAL', role: 'user', passwordHash },
    ])
    .onDuplicateKeyUpdate({ set: { nick: sql`${users.nick}` } });

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

  console.log('Seed complete:');
  console.log('  admin login   admin@brickcity.local / brickcity123');
  console.log('  writer logins dusk@brickcity.local, mural@brickcity.local / brickcity123');
  console.log('  invite code   WAW-044');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
