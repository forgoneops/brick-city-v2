import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon.js';
import { useT } from '../i18n/index.js';

// 404 = dead end (spec §5): brick wall, single lantern glow, WRONG ALLEY stenciled.
export function NotFound() {
  const { t } = useT();

  return (
    <section className="brick-wall relative -mx-4 -mt-6 flex min-h-[80vh] flex-col items-center justify-center overflow-hidden border border-fog md:-mx-8">
      <div className="lantern-glow pointer-events-none absolute inset-0" aria-hidden="true" />
      <Icon name="lantern" size={40} className="relative mb-6 text-rust" />
      <h1
        className="bridge-gap relative px-2 font-display text-5xl uppercase tracking-tight text-bone md:text-7xl"
        style={{ ['--gap-cut' as string]: 'var(--concrete)' }}
      >
        {t('notfound_title')}
      </h1>
      <p className="label-mono relative mt-6">{t('notfound_hint')}</p>
      <Link to="/" className="btn relative mt-10">
        {t('notfound_back')}
      </Link>
    </section>
  );
}
