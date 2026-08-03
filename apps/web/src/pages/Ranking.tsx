import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

export function Ranking() {
  const { t } = useT();
  return <ModulePage title={t('nav_ranking')} icon="scale" tag="RANKING / CITY TOP" />;
}
