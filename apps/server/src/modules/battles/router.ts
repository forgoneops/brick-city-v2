import { publicProcedure, router } from '../../trpc/trpc.js';

/**
 * Battles module — STUB (Phase 2: themed battles with entries and votes;
 * themes manageable from CMS/admin in Phase 4).
 * TODO(phase-2): battles/entries/votes tables, battle lifecycle states.
 */
export const battlesRouter = router({
  /** Currently active battle, if any. */
  active: publicProcedure.query(() => ({ battle: null as unknown | null })),

  /** Placeholder archive — returns nothing until Phase 2. */
  archive: publicProcedure.query(() => ({ battles: [] as unknown[] })),
});
