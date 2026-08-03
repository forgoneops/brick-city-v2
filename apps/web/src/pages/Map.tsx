import { useT } from '../i18n/index.js';

export function Map() {
  const { t } = useT();
  return (
    <section className="border border-fog bg-concrete p-6">
      <h1 className="font-display text-3xl">{t('nav_map')}</h1>
      <p className="label-mono mt-2">MODULE / {t('nav_map').toUpperCase()} / PHASE 0</p>
      <div className="mt-6 flex items-center justify-center border border-dashed border-fog p-12">
        <span className="label-mono text-signal">{t('members_only')}</span>
      </div>
    </section>
  );
}
