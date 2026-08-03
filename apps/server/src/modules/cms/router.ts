import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, publicProcedure, adminProcedure } from '../../trpc.js';
import { getDb } from '../../db/index.js';
import { siteContent } from '../../db/schema.js';

export const cmsRouter = router({
  getContent: publicProcedure
    .input(
      z.object({
        key: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const [row] = await db.select().from(siteContent).where(eq(siteContent.key, input.key));
      return row?.value ?? null;
    }),

  setContent: adminProcedure
    .input(
      z.object({
        key: z.string().min(1),
        value: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .insert(siteContent)
        .values({ key: input.key, value: input.value })
        .onDuplicateKeyUpdate({ set: { value: input.value } });
      return { key: input.key };
    }),
});
