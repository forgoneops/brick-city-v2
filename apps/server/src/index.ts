import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './env.js';
import { createTrpcContext } from './trpc/context.js';
import { appRouter } from './trpc/router.js';

/**
 * Brick City Mashin' v2 API — Hono HTTP server with the tRPC router
 * mounted under /trpc. Modular routers live in src/modules/*.
 */
const app = new Hono();

app.use(
  '*',
  cors({
    origin: [env.webOrigin],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, service: 'bcm-server' }));

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createTrpcContext(c),
  }),
);

serve({ fetch: app.fetch, port: env.port }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`[bcm-server] listening on http://localhost:${info.port} (trpc: /trpc)`);
});

export { appRouter };
export type { AppRouter } from './trpc/router.js';
