import { useT } from '../i18n/index.js';
import { Icon } from '../components/Icon.js';

export function Admin() {
  const { t } = useT();
  return (
    <section className="border border-fog bg-concrete p-6">
      <div className="flex items-center gap-3">
        <Icon name="gate" className="text-blood" />
        <h1 className="font-display text-3xl">{t('admin_title')}</h1>
      </div>
      <p className="label-mono mt-2">{t('admin_note')} / PHASE 0</p>
      <p className="mt-6 text-smoke">{t('empty_state')}</p>
    </section>
  );
}
