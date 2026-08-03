import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

export function Events() {
  const { t } = useT();
  return <ModulePage title={t('nav_events')} icon="lantern" tag="EVENTS / NEXT BURN" />;
}
