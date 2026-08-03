import { ModulePage } from '../components/ModulePage.js';
import { BlurredPin } from '../components/BlurredPin.js';
import { useT } from '../i18n/index.js';

// Map — mystery layer: legendary spots stay blurred for non-members (spec §6).
export function Map() {
  const { t } = useT();
  return (
    <ModulePage title={t('nav_map')} icon="pin-folded" tag="MAP / WAW-044 / 52.2297N 21.0122E">
      <BlurredPin hint="COORDS LOCKED" />
    </ModulePage>
  );
}
