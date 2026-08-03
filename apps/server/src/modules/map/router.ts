import { publicProcedure, router } from '../../trpc/trpc.js';

/**
 * Map module — STUB (Phase 2: spot map; mystery layer = blurred MEMBERS-ONLY
 * pins for legendary spots, coordinates revealed to paying members).
 * TODO(phase-2): spots table + moderation queue; gate precise coords behind
 * requireActiveAccess when the paywall flag is on.
 */
export const mapRouter = router({
  /** Placeholder pin list — returns nothing until Phase 2. */
  pins: publicProcedure.query(() => ({ pins: [] as unknown[] })),

  /** Members-only legendary spots — locked until Phase 2/3c. */
  legendaryPins: publicProcedure.query(() => ({
    pins: [] as unknown[],
    note: 'MEMBERS ONLY',
  })),
});
