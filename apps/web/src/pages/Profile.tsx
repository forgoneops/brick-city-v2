import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

export function Profile() {
  const { t } = useT();
  return <ModulePage title={t('nav_profile')} icon="mask" tag="PROFILE / WRITER" />;
}
