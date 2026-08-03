import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router.js';
import { createContext } from './trpc.js';
import { env } from './env.js';

const app = new Hono();

app.use(cors({ origin: '*' }));

app.get('/health', (c) => {
  return c.json({ ok: true });
});

app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    createContext,
  })
);

serve({
  fetch: app.fetch,
  port: env.PORT,
}).addListener('listening', () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
