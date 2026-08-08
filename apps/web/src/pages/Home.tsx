import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/Reveal.js';
import { WantedCard } from '../components/WantedCard.js';
import { EmptyState } from '../components/EmptyState.js';
import { useT } from '../i18n/index.js';
import { useCms } from '../lib/cms.js';
import { useAuth } from '../lib/session.js';
import { trpc } from '../lib/trpc.js';

const TICKER =
  'WAW-044 / 52.2297N 21.0122E / EST. ON CONCRETE / SIDE ALLEY / BRICK CITY MASHIN\' / ';

interface HomeProps {
  // Live-preview mode (AdminCms's Content tab) — bypasses useCms() entirely
  // and renders these draft values directly, so the preview pane updates as
  // the admin types without writing anything to the DB.
  heroOverride?: { title: string; subtitle: string; cta: string };
}

interface FeedItem {
  id: string;
  title: string;
  category: string;
  city: string;
  imageUrl: string;
  thumbUrl: string;
  propsCount: number;
  authorNick: string | null;
}

// Homepage feed strip ("FROM THE STREETS"): a weighted-random slice of live
// gallery photos, not a fixed/curated list — see gallery.homeFeed on the
// server. Skipped entirely in AdminCms's Content-tab live-preview mode
// (heroOverride set): that preview pane only ever shows the hero anyway
// (clipped to a fixed-height box), so fetching feed data there would just
// be wasted network calls.
function StreetsFeed() {
  const { t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[] | null>(null);

  useEffect(() => {
    trpc.gallery.homeFeed.query({ limit: 8 }).then((res) => setItems(res.items));
  }, []);

  function handleProps(photoId: string, newCount: number) {
    setItems((prev) =>
      prev ? prev.map((item) => (item.id === photoId ? { ...item, propsCount: newCount } : item)) : prev
    );
  }

  if (items === null) {
    return null;
  }

  return (
    <section className="py-12">
      <h2 className="label-mono mb-6 border-b border-fog pb-4">{t('home_feed_title')}</h2>
      {items.length === 0 ? (
        <EmptyState note={t('home_feed_empty')} />
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {items.map((item) => (
            <Link key={item.id} to="/gallery" className="mb-4 block break-inside-avoid">
              <WantedCard
                title={item.title}
                author={item.authorNick ?? 'ANONYMOUS'}
                category={item.category}
                city={item.city}
                thumbUrl={item.thumbUrl}
                imageUrl={item.imageUrl}
                propsCount={item.propsCount}
                onProps={
                  user
                    ? (e?: React.MouseEvent) => {
                        e?.preventDefault();
                        trpc.gallery.props
                          .toggle.mutate({ photoId: item.id })
                          .then((res) => handleProps(item.id, res.propsCount));
                      }
                    : undefined
                }
              />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// The Alley Hero (spec §5): full-viewport ink darkness, logo mark stenciled
// at 6% behind content, ONE signal CTA, mono coordinates ticker at the
// bottom edge. Hero copy is CMS-editable (Phase 4); title supports a literal
// "\n" to keep the two-line wordmark layout admins are used to seeing.
export function Home({ heroOverride }: HomeProps = {}) {
  const { t } = useT();
  const { config } = useCms();

  const hero =
    heroOverride ??
    config?.hero ?? {
      title: "BRICK CITY\nMASHIN'",
      subtitle: t('home_hero_whisper'),
      cta: t('home_hero_cta'),
    };
  const titleLines = hero.title.split('\n');

  return (
    <>
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
            {titleLines.map((line, i) => (
              <span key={`${i}-${line}`}>
                <Reveal text={line} />
                {i < titleLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="label-mono mt-6">{hero.subtitle}</p>
          <Link to="/invite" className="btn btn-primary mt-12 px-8 py-3 text-[12px]">
            {hero.cta}
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

      {!heroOverride && <StreetsFeed />}
    </>
  );
}
