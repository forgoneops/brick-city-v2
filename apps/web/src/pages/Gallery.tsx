import { ModulePage } from '../components/ModulePage.js';
import { EmptyState } from '../components/EmptyState.js';
import { useT } from '../i18n/index.js';

// Gallery — wanted-poster cards (WantedCard) once pieces exist;
// mono empty state until then.
export function Gallery() {
  const { t } = useT();
  const pieces: unknown[] = []; // TODO(phase-2): wire to trpc.gallery.list

  return (
    <ModulePage title={t('nav_gallery')} icon="spray-can" tag={`GALLERY / WAW-044 / ${pieces.length} FILED`}>
      {pieces.length === 0 ? <EmptyState /> : null}
    </ModulePage>
  );
}
