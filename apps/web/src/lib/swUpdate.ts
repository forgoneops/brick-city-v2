import { useEffect, useState } from 'react';

// Small pub-sub for "a new service worker just took over this tab" — same
// shape as lib/paywall.ts's blocked-state channel. main.tsx does the actual
// registration/update-detection outside the React tree (before the root
// even renders) and calls setUpdateAvailable() when it detects a real
// update (not the first-ever install); UpdateBanner.tsx is the only
// consumer. Fires at most once per page load — see main.tsx's own
// hadController guard for why a second, spurious firing shouldn't happen,
// this is just a second line of defense against ever flipping back to
// false-then-true again in the same session.
let available = false;
let fired = false;
const listeners = new Set<(value: boolean) => void>();

export function setUpdateAvailable(): void {
  if (fired) return;
  fired = true;
  available = true;
  listeners.forEach((listener) => listener(available));
}

export function useUpdateAvailable(): boolean {
  const [value, setValue] = useState(available);
  useEffect(() => {
    listeners.add(setValue);
    return () => {
      listeners.delete(setValue);
    };
  }, []);
  return value;
}
