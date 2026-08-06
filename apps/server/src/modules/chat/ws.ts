import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { chatMessages, users } from '../../db/schema.js';
import { verifySessionToken } from '../../lib/jwt.js';
import { checkRateLimit } from '../../lib/rateLimit.js';

// Live chat over a single WebSocket endpoint (/ws/chat?token=<jwt>&channel=<key>).
// Public rooms: 'wall' | 'spots' | 'battles'. DMs: 'dm:<uidA>:<uidB>' with the
// ids sorted — the socket only joins a DM channel the authed user belongs to.

export const PUBLIC_CHANNELS = ['wall', 'spots', 'battles'] as const;
export type PublicChannel = (typeof PUBLIC_CHANNELS)[number];

export function isValidChannel(channel: string): boolean {
  return (PUBLIC_CHANNELS as readonly string[]).includes(channel) || channel.startsWith('dm:');
}

export function dmChannelFor(a: string, b: string): string {
  return `dm:${[a, b].sort().join(':')}`;
}

function canJoin(channel: string, userId: string): boolean {
  if ((PUBLIC_CHANNELS as readonly string[]).includes(channel)) return true;
  if (!channel.startsWith('dm:')) return false;
  const parts = channel.slice(3).split(':');
  return parts.length === 2 && parts.includes(userId);
}

interface ClientCtx {
  userId: string;
  nick: string;
  channel: string;
  ws: WebSocket;
}

const clients = new Set<ClientCtx>();

interface WireMessage {
  type: 'msg' | 'presence';
  channel?: string;
  id?: string;
  userId?: string;
  nick?: string;
  body?: string;
  createdAt?: string;
  online?: { id: string; nick: string }[];
}

function broadcast(channel: string | null, payload: WireMessage): void {
  const raw = JSON.stringify(payload);
  for (const c of clients) {
    if (channel !== null && c.channel !== channel) continue;
    if (c.ws.readyState === WebSocket.OPEN) c.ws.send(raw);
  }
}

// Presence is global (not per-channel): one online list for the whole site,
// matching the "who's online" panel in the UI.
function broadcastPresence(): void {
  const seen = new Map<string, string>();
  for (const c of clients) seen.set(c.userId, c.nick);
  const online = [...seen.entries()].map(([id, nick]) => ({ id, nick }));
  broadcast(null, { type: 'presence', online });
}

async function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer, wss: WebSocketServer): Promise<void> {
  const url = new URL(req.url ?? '', 'http://localhost');
  const token = url.searchParams.get('token') ?? '';
  const channel = url.searchParams.get('channel') ?? 'wall';

  const fail = (code: number) => {
    socket.write(`HTTP/1.1 ${code} Unauthorized\r\n\r\n`);
    socket.destroy();
  };

  const payload = await verifySessionToken(token);
  if (!payload) return fail(401);
  if (!isValidChannel(channel) || !canJoin(channel, payload.sub)) return fail(403);

  const db = getDb();
  const [user] = await db.select({ nick: users.nick }).from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!user) return fail(401);

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { userId: payload.sub, nick: user.nick, channel });
  });
}

// Minimal structural type — @hono/node-server returns a http|http2 union,
// and we only ever hook the 'upgrade' event.
interface UpgradeCapableServer {
  on(event: 'upgrade', cb: (req: IncomingMessage, socket: Duplex, head: Buffer) => void): unknown;
}

export function attachChatWebSocket(server: UpgradeCapableServer): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://localhost');
    if (url.pathname !== '/ws/chat') {
      socket.destroy();
      return;
    }
    void handleUpgrade(req, socket, head, wss);
  });

  wss.on('connection', (ws: WebSocket, _req: IncomingMessage, ctx: { userId: string; nick: string; channel: string }) => {
    const client: ClientCtx = { userId: ctx.userId, nick: ctx.nick, channel: ctx.channel, ws };
    clients.add(client);
    broadcastPresence();

    ws.on('message', (data: WebSocket.RawData) => {
      void (async () => {
        let body: string;
        try {
          const parsed = JSON.parse(String(data)) as { body?: unknown };
          if (typeof parsed.body !== 'string') return;
          body = parsed.body.trim().slice(0, 500);
        } catch {
          return;
        }
        if (!body) return;
        // Per-user send throttle — same fixed-window limiter as the HTTP API.
        if (!checkRateLimit(`chat:${client.userId}`, { windowMs: 10_000, max: 10 })) return;

        const db = getDb();
        const id = randomUUID();
        const createdAt = new Date();
        await db.insert(chatMessages).values({ id, channel: client.channel, userId: client.userId, body });
        broadcast(client.channel, {
          type: 'msg',
          channel: client.channel,
          id,
          userId: client.userId,
          nick: client.nick,
          body,
          createdAt: createdAt.toISOString(),
        });
      })();
    });

    ws.on('close', () => {
      clients.delete(client);
      broadcastPresence();
    });
  });
}

// Recent history for a channel the caller is allowed to read — shared by the
// tRPC router (initial page load; live updates then flow over the socket).
export async function getHistory(channel: string, userId: string, limit = 50) {
  if (!isValidChannel(channel) || !canJoin(channel, userId)) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: chatMessages.id,
      channel: chatMessages.channel,
      userId: chatMessages.userId,
      nick: users.nick,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.channel, channel))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
  return rows.reverse().map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
