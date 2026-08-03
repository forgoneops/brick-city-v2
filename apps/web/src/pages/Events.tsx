import { useT } from '../i18n/index.js';

export function Events() {
  const { t } = useT();
  return (
    <section className="border border-fog bg-concrete p-6">
      <h1 className="font-display text-3xl">{t('nav_events')}</h1>
      <p className="label-mono mt-2">MODULE / {t('nav_events').toUpperCase()} / PHASE 0</p>
      <p className="mt-6 text-smoke">{t('empty_state')}</p>
    </section>
  );
}
