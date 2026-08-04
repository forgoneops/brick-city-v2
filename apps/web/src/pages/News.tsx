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

interface EventItem {
  id: string;
  name: string;
  city: string;
  type: string;
  date: string;
  status: string;
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

export function Events() {
  const { t } = useT();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.events.list.query().then((data) => {
      setEvents(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <ModulePage
      title={t('nav_events')}
      icon="lantern"
      tag={`EVENTS / ${events.length} LIVE`}
    >
      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : events.length === 0 ? (
        <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {events.map((evt) => (
            <li key={evt.id} className="px-4 py-3">
              <h3 className="font-display text-lg uppercase tracking-tight text-bone">
                {evt.name}
              </h3>
              <p className="label-mono mt-1 text-smoke">
                {evt.city} / {evt.type} / {new Date(evt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ModulePage>
  );
}