import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon.js';
import { useT } from '../i18n/index.js';

export function Home() {
  const { t } = useT();

  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center border border-fog bg-asphalt p-8 text-center">
      <Icon name="logo" size={96} className="mb-6 text-signal opacity-90" />
      <h1 className="font-display text-5xl tracking-tight md:text-7xl">BRICK CITY MASHIN'</h1>
      <p className="label-mono mt-4">{t('home_hero_whisper')}</p>
      <Link
        to="/invite"
        className="mt-10 border border-signal bg-signal px-8 py-3 font-mono text-[12px] uppercase tracking-widest text-ink hover:bg-ink hover:text-signal"
      >
        {t('home_hero_cta')}
      </Link>
    </section>
  );
}
