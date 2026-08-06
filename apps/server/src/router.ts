import { router } from './trpc.js';
import { authRouter } from './modules/auth/router.js';
import { galleryRouter } from './modules/gallery/router.js';
import { mapRouter } from './modules/map/router.js';
import { forumRouter } from './modules/forum/router.js';
import { rankingRouter } from './modules/ranking/router.js';
import { battlesRouter } from './modules/battles/router.js';
import { subscriptionsRouter } from './modules/subscriptions/router.js';
import { cmsRouter } from './modules/cms/router.js';
import { eventsRouter } from './modules/events/router.js';
import { adminRouter } from './modules/admin/router.js';
import { invitesRouter } from './modules/invites/router.js';
import { chatRouter } from './modules/chat/router.js';
import { usersRouter } from './modules/users/router.js';

export const appRouter = router({
  auth: authRouter,
  gallery: galleryRouter,
  map: mapRouter,
  forum: forumRouter,
  ranking: rankingRouter,
  battles: battlesRouter,
  subscriptions: subscriptionsRouter,
  cms: cmsRouter,
  events: eventsRouter,
  admin: adminRouter,
  invites: invitesRouter,
  chat: chatRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
