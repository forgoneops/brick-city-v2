import { useState, useEffect } from 'react';
import { trpc } from '../lib/trpc.js';
import { WantedCard } from '../components/WantedCard.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';
import { GALLERY_CATEGORIES } from '@bcv2/shared';

type GalleryItem = {
  id: string;
  title: string;
  category: string;
  city: string;
  imageUrl: string;
  thumbUrl: string;
  propsCount: number;
  status: string;
  authorNick: string | null;
  createdAt: string;
};

export function Gallery() {
  const { t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [category, setCategory] = useState<string>('');
  const [cursor, setCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await trpc.gallery.list.query({
        category: category || undefined,
        cursor,
        limit: 12,
      });
      setItems((prev) => (cursor ? [...prev, ...res.items] : res.items));
      setCursor(res.nextCursor ?? undefined);
      setHasMore(res.nextCursor !== null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
    setHasMore(true);
    load();
  }, [category]);

  function handleProps(photoId: string, newCount: number) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === photoId ? { ...item, propsCount: newCount } : item
      )
    );
  }

  return (
    <ModulePage
      title={t('nav_gallery')}
      icon="spray-can"
      tag={`GALLERY / WAW-044 / ${items.length} FILED`}
    >
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 border-b border-fog pb-3 mb-6">
        {(['', ...GALLERY_CATEGORIES] as const).map((cat) => (
          <button
            key={cat || 'all'}
            type="button"
            onClick={() => setCategory(cat)}
            className={`label-mono border px-3 py-1 transition-colors ${
              category === cat
                ? 'border-signal text-signal'
                : 'border-fog text-smoke hover:text-bone'
            }`}
          >
            {cat ? t(`cat_${cat}`) : 'ALL'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : items.length === 0 ? (
        <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
      ) : (
        <>
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
            {items.map((item) => (
              <WantedCard
                key={item.id}
                title={item.title}
                author={item.authorNick ?? 'ANONYMOUS'}
                category={item.category}
                city={item.city}
                thumbUrl={item.thumbUrl}
                imageUrl={item.imageUrl}
                propsCount={item.propsCount}
                onProps={
                  user
                    ? () =>
                        trpc.gallery.props
                          .toggle.mutate({ photoId: item.id })
                          .then((res) => handleProps(item.id, res.propsCount))
                    : undefined
                }
              />
            ))}
          </div>

          {hasMore && !loading && (
            <div className="mt-6 text-center">
              <button className="btn" onClick={load}>
                LOAD MORE
              </button>
            </div>
          )}
        </>
      )}
    </ModulePage>
  );
}