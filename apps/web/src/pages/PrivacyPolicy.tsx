import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useCms } from '../lib/cms.js';

// Standalone, reachable Privacy Policy page — unlike Terms (a blocking
// first-visit popup only), this is a normal page linked from the footer,
// the Terms popup, and the registration form. See docs/DECISIONS.md.
export function PrivacyPolicy() {
  const { t, locale } = useT();
  const { config } = useCms();

  if (!config) return null;

  // Falls back to `pl` for the same reason FirstVisitPopups does: it's the
  // one language guaranteed to be filled in.
  const text = config.privacy[locale] || config.privacy.pl;

  return (
    <ModulePage title={t('privacy_page_title')} icon="zine-page" tag="LEGAL / RODO">
      <div className="whitespace-pre-wrap text-bone/80">{text}</div>
    </ModulePage>
  );
}
