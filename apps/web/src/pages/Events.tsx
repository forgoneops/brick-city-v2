import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';

interface EventItem {
  id: string;
  name: string;
  city: string;
  type: string;
  date: string;
  status: string;
  createdAt: string;
}

// Was a stub while the real implementation lived unreachably as a second
// export inside News.tsx (App.tsx imported this file, not that one) — moved
// here during Phase 4 so /events actually renders live data.
export function Events() {
  const { t } = useT();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    trpc.events.list
      .query()
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <ModulePage title={t('nav_events')} icon="lantern" tag={`EVENTS / ${events.length} LIVE`}>
      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : events.length === 0 ? (
        <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {events.map((evt) => (
            <li key={evt.id} className="px-4 py-3">
              <h3 className="font-display text-lg uppercase tracking-tight text-bone">{evt.name}</h3>
              <p className="label-mono mt-1 text-smoke">
                {evt.city} / {evt.type} /{' '}
                {new Date(evt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </ModulePage>
  );
}
