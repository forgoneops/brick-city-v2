import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

export function News() {
  const { t } = useT();
  return <ModulePage title={t('nav_news')} icon="zine-page" tag="NEWS / DISPATCHES" />;
}
