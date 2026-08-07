import webpush from 'web-push';
import { eq } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { pushSubscriptions, users } from '../../db/schema.js';

// VAPID keys come from env vars on the deploy target — never from the DB or
// the repo. Without them the whole module degrades to a silent no-op so a
// misconfigured env can't take down chat or the API.
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const SUBJECT = process.env.VAPID_SUBJECT ?? 'mailto:admin@localhost';

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
  configured = true;
} else {
  console.warn('[push] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications disabled');
}

export function getVapidPublicKey(): string | null {
  return configured ? PUBLIC_KEY : null;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

// Sends a notification to every browser endpoint the user registered.
// Dead endpoints (410/404 — user unsubscribed browser-side) are pruned so
// the table doesn't fill with ghosts.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!configured) return;
  const db = getDb();
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.warn(`[push] send failed for sub ${sub.id}:`, (err as Error).message);
        }
      }
    })
  );
}

// Convenience for "notify a nick" call sites (chat DMs know the recipient id,
// but resolving here keeps the join in one place if that ever changes).
export async function getNickForUser(userId: string): Promise<string> {
  const db = getDb();
  const [user] = await db.select({ nick: users.nick }).from(users).where(eq(users.id, userId));
  return user?.nick ?? 'someone';
}
