import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';
import { GALLERY_CATEGORIES } from '@bcv2/shared';

type Scope = 'global' | 'city' | 'category';
type SeasonMode = 'current' | 'alltime';

interface Row {
  position: number;
  userId: string;
  nick: string;
  points: number;
}

export function Ranking() {
  const { t } = useT();
  const { user } = useAuth();
  const [seasonMode, setSeasonMode] = useState<SeasonMode>('current');
  const [scope, setScope] = useState<Scope>('global');
  const [scopeKey, setScopeKey] = useState<string>('');
  const [scopeKeys, setScopeKeys] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [myPosition, setMyPosition] = useState<{ position: number; points: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scope === 'global') {
      setScopeKeys([]);
      setScopeKey('');
      return;
    }
    trpc.ranking.scopeKeys.query({ scope, season: seasonMode }).then((keys) => {
      setScopeKeys(keys);
      setScopeKey((prev) => (keys.includes(prev) ? prev : keys[0] ?? ''));
    });
  }, [scope, seasonMode]);

  useEffect(() => {
    setLoading(true);
    trpc.ranking.leaderboard
      .query({ scope, scopeKey: scopeKey || undefined, season: seasonMode })
      .then((res) => setRows(res.rows))
      .finally(() => setLoading(false));

    if (user) {
      trpc.ranking.myPosition
        .query({ scope, scopeKey: scopeKey || undefined, season: seasonMode })
        .then(setMyPosition)
        .catch(() => setMyPosition(null));
    } else {
      setMyPosition(null);
    }
  }, [scope, scopeKey, seasonMode, user]);

  const scopeKeyOptions = scope === 'category' ? (GALLERY_CATEGORIES as readonly string[]) : scopeKeys;

  return (
    <ModulePage title={t('nav_ranking')} icon="scale" tag={`RANKING / ${scope.toUpperCase()}`}>
      {/* Seasonal / all-time tabs */}
      <div className="flex gap-2 border-b border-fog pb-3 mb-4">
        {(['current', 'alltime'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSeasonMode(mode)}
            className={`label-mono border px-3 py-1 transition-colors ${
              seasonMode === mode
                ? 'border-signal text-signal'
                : 'border-fog text-smoke hover:text-bone'
            }`}
          >
            {mode === 'current' ? t('ranking_seasonal') : t('ranking_alltime')}
          </button>
        ))}
      </div>

      {/* Scope filter */}
      <div className="flex flex-wrap gap-2 mb-3">
        {(['global', 'city', 'category'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`label-mono border px-3 py-1 transition-colors ${
              scope === s ? 'border-signal text-signal' : 'border-fog text-smoke hover:text-bone'
            }`}
          >
            {t(`ranking_scope_${s}`)}
          </button>
        ))}
      </div>

      {scope !== 'global' && scopeKeyOptions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-fog pb-4 mb-4">
          {scopeKeyOptions.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setScopeKey(key)}
              className={`label-mono border px-3 py-1 transition-colors ${
                scopeKey === key
                  ? 'border-signal text-signal'
                  : 'border-fog text-smoke hover:text-bone'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : rows.length === 0 ? (
        <p className="label-mono text-smoke">{t('ranking_empty')}</p>
      ) : (
        <table className="w-full border border-fog">
          <thead>
            <tr className="label-mono border-b border-fog text-smoke">
              <th className="px-3 py-2 text-left">{t('ranking_position')}</th>
              <th className="px-3 py-2 text-left">WRITER</th>
              <th className="px-3 py-2 text-right">{t('ranking_points')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fog">
            {rows.map((row) => {
              const isTop3 = row.position <= 3;
              const isMe = user?.id === row.userId;
              return (
                <tr key={row.userId} className={isMe ? 'bg-concrete' : ''}>
                  <td
                    className={`label-mono px-3 py-2 ${isTop3 ? 'text-signal' : 'text-bone'}`}
                  >
                    {String(row.position).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-2 font-display uppercase tracking-tight text-bone">
                    {row.nick}
                  </td>
                  <td
                    className={`label-mono px-3 py-2 text-right ${
                      isTop3 ? 'text-signal' : 'text-smoke'
                    }`}
                  >
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {user && myPosition && (
        <div className="label-mono mt-4 flex items-center justify-between border border-signal px-3 py-2 text-signal">
          <span>{t('ranking_my_position')}</span>
          <span>
            #{myPosition.position} / {myPosition.points} {t('ranking_points')}
          </span>
        </div>
      )}
    </ModulePage>
  );
}
