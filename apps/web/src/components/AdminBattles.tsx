import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { useT } from '../i18n/index.js';

type BattleStatus = 'upcoming' | 'active' | 'closed';

interface AdminBattleItem {
  id: string;
  title: string;
  status: BattleStatus;
  closesAt: string;
  createdAt: string;
  participantCount: number;
}

const STATUS_CHOICES: BattleStatus[] = ['upcoming', 'active', 'closed'];

// datetime-local inputs give local time with no offset ("2026-08-10T12:00")
// — the server's closesAt validates as a strict ISO instant (z.string().datetime()).
function toIsoInstant(localValue: string): string {
  return new Date(localValue).toISOString();
}

// Inverse, for pre-filling a datetime-local input from a stored ISO instant.
function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminBattles() {
  const { t } = useT();
  const [items, setItems] = useState<AdminBattleItem[]>([]);
  const [title, setTitle] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AdminBattleItem | null>(null);

  function refresh() {
    trpc.battles.list.query({}).then((rows) => setItems(rows as AdminBattleItem[]));
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleCreate() {
    if (!title.trim() || !closesAt) return;
    setBusy(true);
    trpc.battles.adminCreate
      .mutate({ title: title.trim(), status: 'upcoming', closesAt: toIsoInstant(closesAt) })
      .then(() => {
        setTitle('');
        setClosesAt('');
        refresh();
      })
      .finally(() => setBusy(false));
  }

  function handleStatusChange(item: AdminBattleItem, status: BattleStatus) {
    trpc.battles.adminUpdate.mutate({ id: item.id, title: item.title, status, closesAt: item.closesAt }).then(refresh);
  }

  function startEdit(item: AdminBattleItem) {
    setEditing(item);
  }

  function saveEdit() {
    if (!editing) return;
    trpc.battles.adminUpdate
      .mutate({ id: editing.id, title: editing.title, status: editing.status, closesAt: editing.closesAt })
      .then(() => {
        setEditing(null);
        refresh();
      });
  }

  return (
    <section>
      <h2 className="label-mono mb-3">{t('admin_battles_title')}</h2>

      <div className="mb-3 flex flex-wrap items-end gap-2 border border-fog px-3 py-3">
        <label className="label-mono flex flex-col gap-1 text-smoke">
          {t('admin_battles_new_title')}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-48 border border-fog bg-ink px-2 py-1 text-bone"
          />
        </label>
        <label className="label-mono flex flex-col gap-1 text-smoke">
          {t('admin_battles_closes_at')}
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
            className="border border-fog bg-ink px-2 py-1 text-bone"
          />
        </label>
        <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
          {t('admin_battles_create')}
        </button>
      </div>

      {items.length === 0 ? (
        <p className="label-mono text-smoke">{t('empty_state')}</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {items.map((b) => (
            <li key={b.id} className="px-3 py-2">
              {editing?.id === b.id ? (
                <div className="flex flex-wrap items-end gap-2">
                  <input
                    className="input"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  />
                  <input
                    type="datetime-local"
                    className="border border-fog bg-ink px-2 py-1 text-bone"
                    value={toLocalInputValue(editing.closesAt)}
                    onChange={(e) => setEditing({ ...editing, closesAt: toIsoInstant(e.target.value) })}
                  />
                  <button className="btn btn-primary" onClick={saveEdit}>
                    {t('admin_cms_save')}
                  </button>
                  <button className="btn" onClick={() => setEditing(null)}>
                    {t('action_cancel')}
                  </button>
                </div>
              ) : (
                <div className="label-mono flex flex-wrap items-center justify-between gap-2">
                  <span className="text-bone">
                    {b.title}
                    <span className="ml-2 text-smoke">
                      / {new Date(b.closesAt).toLocaleString()} / {b.participantCount} {t('battles_participants')}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {STATUS_CHOICES.map((s) => (
                      <button
                        key={s}
                        className={`border px-2 py-1 ${b.status === s ? 'border-signal text-signal' : 'border-fog text-smoke'}`}
                        onClick={() => handleStatusChange(b, s)}
                      >
                        {t(`battles_status_${s}`).toUpperCase()}
                      </button>
                    ))}
                    <button className="btn" onClick={() => startEdit(b)}>
                      EDIT
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
