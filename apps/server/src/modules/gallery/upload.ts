import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import sharp from 'sharp';
import { GALLERY_CATEGORIES } from '@bcv2/shared';
import { getDb } from '../../db/index.js';
import { photos, siteContent } from '../../db/schema.js';
import { env } from '../../env.js';
import { verifySessionToken } from '../../lib/jwt.js';
import { getStorage, newUploadKey } from '../../lib/storage.js';
import { recalculateUserScore } from '../ranking/scoring.js';

const MAX_EDGE = 1600;
const THUMB_EDGE = 480;

async function anonymousUploadsAllowed(): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(siteContent)
    .where(eq(siteContent.key, 'allow_anonymous_uploads'));
  // CMS flag defaults to on when unset.
  return row?.value !== 'false';
}

// POST /upload — multipart form: file (image), title, category, city.
// Auth optional: Bearer token -> authorId, otherwise anonymous (authorId null)
// when the CMS flag allows it.
export async function handleUpload(c: Context) {
  const auth = c.req.header('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  const session = token ? await verifySessionToken(token) : null;

  if (!session && !(await anonymousUploadsAllowed())) {
    return c.json({ error: 'Anonymous uploads are disabled' }, 403);
  }

  const form = await c.req.formData();
  const file = form.get('file');
  const title = String(form.get('title') ?? '').trim();
  const category = String(form.get('category') ?? 'other');
  const city = String(form.get('city') ?? '').trim();

  if (!(file instanceof File) || file.size === 0) {
    return c.json({ error: 'Missing image file' }, 400);
  }
  if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
    return c.json({ error: `File too large (max ${env.MAX_UPLOAD_MB} MB)` }, 413);
  }
  if (!title) {
    return c.json({ error: 'Missing title' }, 400);
  }
  if (!(GALLERY_CATEGORIES as readonly string[]).includes(category)) {
    return c.json({ error: 'Invalid category' }, 400);
  }

  const input = Buffer.from(await file.arrayBuffer());

  let image: Buffer;
  let thumb: Buffer;
  try {
    image = await sharp(input)
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    thumb = await sharp(input)
      .rotate()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer();
  } catch {
    return c.json({ error: 'Unsupported image data' }, 415);
  }

  const storage = getStorage();
  const key = newUploadKey('photo.webp');
  const thumbKey = key.replace(/photo\.webp$/, 'thumb.webp');
  await storage.put(key, image, 'image/webp');
  await storage.put(thumbKey, thumb, 'image/webp');

  const id = randomUUID();
  const db = getDb();
  await db.insert(photos).values({
    id,
    authorId: session?.sub ?? null,
    title,
    category: category as (typeof GALLERY_CATEGORIES)[number],
    city,
    imageUrl: storage.url(key),
    thumbUrl: storage.url(thumbKey),
    status: 'live',
  });

  if (session?.sub) {
    await recalculateUserScore(session.sub);
  }

  return c.json(
    {
      id,
      imageUrl: storage.url(key),
      thumbUrl: storage.url(thumbKey),
      status: 'live',
    },
    201
  );
}
