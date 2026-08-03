import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

export function Forum() {
  const { t } = useT();
  return <ModulePage title={t('nav_forum')} icon="thread" tag="FORUM / THREADS" />;
}
