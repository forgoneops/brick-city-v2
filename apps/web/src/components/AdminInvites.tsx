import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { useT } from '../i18n/index.js';

interface AdminInviteItem {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  createdAt: string;
  creatorNick: string;
}

export function AdminInvites() {
  const { t } = useT();
  const [items, setItems] = useState<AdminInviteItem[]>([]);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState('');
  const [busy, setBusy] = useState(false);

  function refresh() {
    trpc.invites.listAll.query().then((rows) => setItems(rows as AdminInviteItem[]));
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreate() {
    setBusy(true);
    trpc.invites.adminCreate
      .mutate({
        maxUses,
        expiresInDays: expiresInDays ? Number(expiresInDays) : undefined,
      })
      .then(() => {
        setMaxUses(1);
        setExpiresInDays('');
        refresh();
      })
      .finally(() => setBusy(false));
  }

  function handleRevoke(id: string) {
    trpc.invites.revoke.mutate({ id }).then(refresh);
  }

  const now = new Date();

  return (
    <section>
      <h2 className="label-mono mb-3">{t('admin_invites_title')}</h2>

      <div className="mb-3 flex flex-wrap items-end gap-2 border border-fog px-3 py-3">
        <label className="label-mono flex flex-col gap-1 text-smoke">
          {t('admin_invites_uses')}
          <input
            type="number"
            min={1}
            max={100}
            value={maxUses}
            onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
            className="w-20 border border-fog bg-ink px-2 py-1 text-bone"
          />
        </label>
        <label className="label-mono flex flex-col gap-1 text-smoke">
          {t('admin_invites_expiry_days')}
          <input
            type="number"
            min={1}
            max={365}
            value={expiresInDays}
            placeholder="—"
            onChange={(e) => setExpiresInDays(e.target.value)}
            className="w-20 border border-fog bg-ink px-2 py-1 text-bone"
          />
        </label>
        <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
          {t('invites_generate')}
        </button>
      </div>

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
                <span className={dead ? 'text-smoke line-through' : 'text-bone'}>
                  {inv.code}
                  <span className="ml-2 text-smoke">/ {inv.creatorNick}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-smoke">
                    {inv.usedCount}/{inv.maxUses}
                    {inv.expiresAt ? ` / ${new Date(inv.expiresAt).toLocaleDateString()}` : ''}
                  </span>
                  {!dead && (
                    <button className="btn" onClick={() => handleRevoke(inv.id)}>
                      {t('admin_invites_revoke')}
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
