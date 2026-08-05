import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router.js';
import { createContext } from './trpc.js';
import { env } from './env.js';
import { handleUpload } from './modules/gallery/upload.js';
import { handleWebhook } from './modules/subscriptions/webhook.js';

const app = new Hono();

app.use(cors({ origin: '*' }));

app.get('/health', (c) => {
  return c.json({ ok: true });
});

// Uploaded images (local storage driver).
app.use(
  '/uploads/*',
  serveStatic({
    root: env.UPLOADS_DIR,
    rewriteRequestPath: (p) => p.replace(/^\/uploads/, ''),
  })
);

// Multipart image upload -> sharp webp + thumb -> photos row.
app.post('/upload', handleUpload);

// Payment provider webhook (real-provider path; the mock topUp flow credits
// synchronously and doesn't hit this route — see subscriptions/webhook.ts).
app.post('/webhooks/:provider', handleWebhook);

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
