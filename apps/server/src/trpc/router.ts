import { authRouter } from '../modules/auth/router.js';
import { battlesRouter } from '../modules/battles/router.js';
import { cmsRouter } from '../modules/cms/router.js';
import { forumRouter } from '../modules/forum/router.js';
import { galleryRouter } from '../modules/gallery/router.js';
import { mapRouter } from '../modules/map/router.js';
import { rankingRouter } from '../modules/ranking/router.js';
import { subscriptionsRouter } from '../modules/subscriptions/router.js';
import { router } from './trpc.js';

/**
 * Root tRPC router — one sub-router per feature module.
 * Adding a new module = new folder under src/modules + one line here.
 */
export const appRouter = router({
  auth: authRouter,
  gallery: galleryRouter,
  map: mapRouter,
  forum: forumRouter,
  ranking: rankingRouter,
  battles: battlesRouter,
  subscriptions: subscriptionsRouter,
  cms: cmsRouter,
});

export type AppRouter = typeof appRouter;
