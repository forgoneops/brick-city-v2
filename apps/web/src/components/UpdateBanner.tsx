import { useState } from 'react';
import { useT } from '../i18n/index.js';
import { useUpdateAvailable } from '../lib/swUpdate.js';

// Slim fixed bar, not a Modal — a new build waiting behind the current tab
// isn't blocking, so it shouldn't behave like one. Fixed (not in normal
// flow) so it renders identically on both Layout.tsx branches — the
// sidebared app chrome and the bare login/invite screens — the same way
// PaywallGate already does, with no per-branch offset to keep in sync.
export function UpdateBanner() {
  const { t } = useT();
  const available = useUpdateAvailable();
  const [dismissed, setDismissed] = useState(false);

  if (!available || dismissed) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 border-b border-signal bg-concrete px-4 py-2">
      <p className="label-mono text-bone">{t('update_available_message')}</p>
      <div className="flex shrink-0 items-center gap-4">
        <button type="button" onClick={() => setDismissed(true)} className="label-mono text-smoke hover:text-bone">
          {t('update_available_dismiss')}
        </button>
        <button type="button" onClick={() => window.location.reload()} className="btn btn-primary py-1">
          {t('update_available_action')}
        </button>
      </div>
    </div>
  );
}
