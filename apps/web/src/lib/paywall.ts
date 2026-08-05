import { useEffect, useState } from 'react';
import { TRPCClientError } from '@trpc/client';

// Small pub-sub for the paywall-block state — apps/web/src/lib/trpc.ts uses
// plain httpBatchLink (no react-query), so there's no query-cache layer to
// hang this off of. Gated call sites (map.submit, forum.createThread/reply)
// call setPaywallBlocked(true) when they catch the server's PAYWALL error;
// <PaywallGate> (components/PaywallGate.tsx) renders the block screen.
let blocked = false;
const listeners = new Set<(value: boolean) => void>();

export function setPaywallBlocked(value: boolean): void {
  blocked = value;
  listeners.forEach((listener) => listener(value));
}

export function usePaywallBlocked(): boolean {
  const [value, setValue] = useState(blocked);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}

// The server throws TRPCError({ code: 'FORBIDDEN', message: 'PAYWALL' });
// this repo has no custom errorFormatter, so tRPC's default serialization
// carries .message through to the client unchanged.
export function isPaywallError(err: unknown): boolean {
  return err instanceof TRPCClientError && err.message === 'PAYWALL';
}
