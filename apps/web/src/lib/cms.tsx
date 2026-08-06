import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CmsConfig } from '@bcv2/shared';
import { trpc } from './trpc.js';

interface CmsContextValue {
  config: CmsConfig | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CmsContext = createContext<CmsContextValue | null>(null);

// Single fetch at app root, shared by Layout (nav/announcement), Home
// (hero), Gallery (category order/visibility), and the AdminCms editor —
// refetch() is called after every admin save so the public site reflects
// changes without a page reload (the "cache invalidation" requirement is
// satisfied server-side; this is just the client re-reading it).
export function CmsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<CmsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const data = await trpc.cms.getConfig.query();
    setConfig(data);
  }, []);

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  return <CmsContext.Provider value={{ config, loading, refetch }}>{children}</CmsContext.Provider>;
}

export function useCms(): CmsContextValue {
  const ctx = useContext(CmsContext);
  if (!ctx) {
    throw new Error('useCms must be used within <CmsProvider>');
  }
  return ctx;
}
