import { randomUUID } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { users, walletTransactions } from '../../db/schema.js';
import type { PaymentProviderId } from './providers.js';

interface LedgerEntry {
  userId: string;
  amountCents: number;
  type: 'topup' | 'subscription' | 'spend' | 'refund';
  reason: string;
  provider?: PaymentProviderId;
  providerRef?: string;
}

// Row-locks the user before touching their balance (mirrors the
// SELECT ... FOR UPDATE pattern already used in gallery.props.toggle) so
// concurrent credits/debits can't race past each other.
async function applyLedgerEntry(entry: LedgerEntry, signedAmountCents: number) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, entry.userId)).for('update');
    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
    }
    if (user.walletBalanceCents + signedAmountCents < 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Insufficient balance' });
    }

    await tx.insert(walletTransactions).values({
      id: randomUUID(),
      userId: entry.userId,
      amountCents: signedAmountCents,
      type: entry.type,
      reason: entry.reason,
      provider: entry.provider,
      providerRef: entry.providerRef,
      status: 'completed',
    });

    await tx
      .update(users)
      .set({ walletBalanceCents: sql`${users.walletBalanceCents} + ${signedAmountCents}` })
      .where(eq(users.id, entry.userId));

    const [updated] = await tx
      .select({ walletBalanceCents: users.walletBalanceCents })
      .from(users)
      .where(eq(users.id, entry.userId));
    return { walletBalanceCents: updated.walletBalanceCents };
  });
}

export async function creditWallet(
  entry: Omit<LedgerEntry, 'type'> & { type: 'topup' | 'refund' }
): Promise<{ walletBalanceCents: number }> {
  return applyLedgerEntry(entry, Math.abs(entry.amountCents));
}

export async function spendFromWallet(
  entry: Omit<LedgerEntry, 'type'> & { type: 'subscription' | 'spend' }
): Promise<{ walletBalanceCents: number }> {
  return applyLedgerEntry(entry, -Math.abs(entry.amountCents));
}
