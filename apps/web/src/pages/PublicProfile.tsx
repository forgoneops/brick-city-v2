import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

interface ProfileData {
  user: { nick: string; role: string; createdAt: string };
  stats: { followers: number; following: number; photos: number };
  badges: string[];
  recentPhotos: { id: string; title: string; thumbUrl: string; propsCount: number; createdAt: string }[];
  isFollowedByMe: boolean;
  isMe: boolean;
}

export function PublicProfile() {
  const { t } = useT();
  const { user: me } = useAuth();
  const { nick } = useParams<{ nick: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(() => {
    if (!nick) return;
    trpc.users.publicProfile
      .query({ nick })
      .then((res) => setData(res as ProfileData))
      .catch(() => setMissing(true));
  }, [nick]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) {
    return <ModulePage title={t('profile_notfound')} icon="mask" tag="404 / WRITER" />;
  }
  if (!data) {
    return <ModulePage title={nick ?? ''} icon="mask" tag="WRITER" />;
  }

  function handleFollow() {
    if (!nick) return;
    trpc.users.toggleFollow.mutate({ nick }).then(load);
  }

  return (
    <ModulePage title={data.user.nick} icon="mask" tag={`WRITER / ${data.user.role.toUpperCase()}`}>
      <div className="space-y-6">
        {/* Badges */}
        {data.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.badges.map((b) => (
              <span key={b} className="label-mono border border-signal px-2 py-1 text-signal">
                {t(`badge_${b}`)}
              </span>
            ))}
          </div>
        )}

        {/* Stats + follow */}
        <div className="flex items-center justify-between border border-fog px-3 py-3">
          <div className="flex gap-6">
            <span className="label-mono text-smoke">
              {t('profile_photos')} <span className="text-bone">{data.stats.photos}</span>
            </span>
            <span className="label-mono text-smoke">
              {t('profile_followers')} <span className="text-bone">{data.stats.followers}</span>
            </span>
            <span className="label-mono text-smoke">
              {t('profile_following')} <span className="text-bone">{data.stats.following}</span>
            </span>
          </div>
          {me && !data.isMe && (
            <button className={data.isFollowedByMe ? 'btn' : 'btn btn-primary'} onClick={handleFollow}>
              {data.isFollowedByMe ? t('profile_unfollow') : t('profile_follow')}
            </button>
          )}
        </div>

        {/* Recent pieces */}
        <section>
          <h2 className="label-mono mb-3">{t('profile_recent')}</h2>
          {data.recentPhotos.length === 0 ? (
            <p className="label-mono text-smoke">{t('empty_state')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {data.recentPhotos.map((p) => (
                <figure key={p.id} className="border border-fog">
                  <img src={p.thumbUrl} alt={p.title} className="aspect-square w-full object-cover" loading="lazy" />
                  <figcaption className="label-mono flex items-center justify-between px-2 py-1">
                    <span className="truncate text-bone">{p.title}</span>
                    <span className="text-signal">{p.propsCount}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </div>
    </ModulePage>
  );
}
