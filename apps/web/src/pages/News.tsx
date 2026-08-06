import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

interface Post {
  id: string;
  title: string;
  category: string;
  body: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export function News() {
  const { t } = useT();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.cms.posts.listPublished.query().then((data) => {
      setPosts(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <ModulePage
      title={t('nav_news')}
      icon="zine-page"
      tag={`NEWS / ${posts.length} DISPATCHES`}
    >
      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : posts.length === 0 ? (
        <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {posts.map((post) => (
            <li key={post.id} className="px-4 py-3">
              <h3 className="font-display text-lg uppercase tracking-tight text-bone">
                {post.title}
              </h3>
              <p className="label-mono mt-1 text-smoke">
                {post.category.toUpperCase()} / {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <p className="mt-2 text-bone/80">{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </ModulePage>
  );
}