import { Link } from 'react-router-dom';
import { usePaywallBlocked, setPaywallBlocked } from '../lib/paywall.js';
import { useT } from '../i18n/index.js';

// Full-viewport black-screen mystery layer (spec §6 convention, same look as
// the bare /login and /invite routes) that overrides whatever route is
// showing when a gated action comes back PAYWALL-blocked.
export function PaywallGate() {
  const { t } = useT();
  const blocked = usePaywallBlocked();
  if (!blocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink px-6 text-center">
      <h1 className="font-display text-3xl uppercase tracking-tight text-bone md:text-4xl">
        {t('paywall_title')}
      </h1>
      <Link
        to="/profile"
        onClick={() => setPaywallBlocked(false)}
        className="btn btn-primary"
      >
        {t('paywall_cta')}
      </Link>
    </div>
  );
}
