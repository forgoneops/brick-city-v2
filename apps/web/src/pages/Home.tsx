import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal.js';
import { useT } from '../i18n/index.js';

const TICKER =
  'WAW-044 / 52.2297N 21.0122E / EST. ON CONCRETE / SIDE ALLEY / BRICK CITY MASHIN\' / ';

// The Alley Hero (spec §5): full-viewport ink darkness, logo mark stenciled
// at 6% behind content, ONE signal CTA, mono coordinates ticker at the
// bottom edge.
export function Home() {
  const { t } = useT();

  return (
    <section className="relative -mx-4 -mt-6 flex min-h-screen flex-col overflow-hidden bg-ink md:-mx-8">
      {/* stenciled mark, 6% opacity behind content */}
      <img
        src="/logo-mark.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 w-[130%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.06] select-none md:w-[70%]"
      />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display text-5xl uppercase tracking-tight text-bone md:text-8xl">
          <Reveal text="BRICK CITY" />
          <br />
          <Reveal text="MASHIN'" />
        </h1>
        <p className="label-mono mt-6">{t('home_hero_whisper')}</p>
        <Link to="/invite" className="btn btn-primary mt-12 px-8 py-3 text-[12px]">
          {t('home_hero_cta')}
        </Link>
      </div>

      {/* coordinates ticker, bottom edge */}
      <div className="relative overflow-hidden border-t border-fog py-2">
        <div className="ticker-track flex w-max whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-smoke">
          <span className="pr-4">{TICKER.repeat(4)}</span>
          <span className="pr-4" aria-hidden="true">
            {TICKER.repeat(4)}
          </span>
        </div>
      </div>
    </section>
  );
}
