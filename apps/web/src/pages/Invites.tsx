import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { Icon } from '../components/Icon.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

interface InviteItem {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export function Invites() {
  const { t } = useT();
  const { user } = useAuth();
  const [items, setItems] = useState<InviteItem[]>([]);
  const [quota, setQuota] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function refresh() {
    trpc.invites.mine.query().then((res) => {
      setItems(res.items as InviteItem[]);
      setQuota(res.quota);
      setActiveCount(res.activeCount);
    });
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  function handleCreate() {
    setBusy(true);
    setError(null);
    trpc.invites.create
      .mutate({ maxUses: 1 })
      .then(() => refresh())
      .catch((err: { message?: string }) => setError(err.message ?? 'error'))
      .finally(() => setBusy(false));
  }

  function handleCopy(code: string) {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  if (!user) {
    return <ModulePage title={t('invites_title')} icon="key" tag="INVITES / WRITERS ONLY" />;
  }

  const now = new Date();
  const quotaLeft = quota === null ? null : Math.max(0, quota - activeCount);

  return (
    <ModulePage title={t('invites_title')} icon="key" tag={`INVITES / ${user.nick}`}>
      <div className="space-y-6">
        <p className="label-mono text-smoke">{t('invites_blurb')}</p>

        <div className="flex items-center justify-between border border-fog px-3 py-2">
          <span className="label-mono">
            {quotaLeft === null
              ? t('invites_quota_staff')
              : t('invites_quota_left').replace('{{left}}', String(quotaLeft)).replace('{{quota}}', String(quota))}
          </span>
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy || quotaLeft === 0}>
            <Icon name="key" size={16} />
            {t('invites_generate')}
          </button>
        </div>

        {error && <p className="label-mono text-blood">{error}</p>}

        {items.length === 0 ? (
          <p className="label-mono text-smoke">{t('invites_empty')}</p>
        ) : (
          <ul className="divide-y divide-fog border border-fog">
            {items.map((inv) => {
              const exhausted = inv.usedCount >= inv.maxUses;
              const expired = inv.expiresAt !== null && new Date(inv.expiresAt) < now;
              const dead = exhausted || expired;
              return (
                <li key={inv.id} className="label-mono flex items-center justify-between px-3 py-2">
                  <span className={dead ? 'text-smoke line-through' : 'text-bone'}>{inv.code}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-smoke">
                      {inv.usedCount}/{inv.maxUses}
                      {expired ? ` / ${t('invites_expired')}` : ''}
                    </span>
                    {!dead && (
                      <button
                        className="btn"
                        onClick={() => handleCopy(inv.code)}
                        aria-label={t('invites_copy')}
                      >
                        {copied === inv.code ? t('invites_copied') : t('invites_copy')}
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ModulePage>
  );
}
