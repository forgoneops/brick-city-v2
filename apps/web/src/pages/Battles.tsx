import { useEffect, useState } from 'react';
import { TRPCClientError } from '@trpc/client';
import { trpc, getToken } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';
import { isPaywallError, setPaywallBlocked } from '../lib/paywall.js';

// Same same-origin-by-default convention as lib/trpc.ts's API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

interface BattleItem {
  id: string;
  title: string;
  status: 'upcoming' | 'active' | 'closed';
  closesAt: string;
  createdAt: string;
  participantCount: number;
}

// Server throws these two TRPCErrors with fixed messages (see
// modules/battles/router.ts) — matched the same way lib/paywall.ts matches
// the PAYWALL error, since this repo has no custom errorFormatter.
function isConflictError(err: unknown): boolean {
  return err instanceof TRPCClientError && err.message === 'You already submitted to this battle';
}
function isBattleClosedError(err: unknown): boolean {
  return err instanceof TRPCClientError && err.message === 'Battle is not open for submissions';
}

function statusColor(status: string): string {
  if (status === 'active') return 'text-signal';
  if (status === 'closed') return 'text-blood';
  return 'text-smoke';
}

export function Battles() {
  const { t } = useT();
  const { user } = useAuth();
  const [battles, setBattles] = useState<BattleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBattle, setSelectedBattle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function refresh() {
    trpc.battles.list.query({}).then((rows) => {
      setBattles(rows as BattleItem[]);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeBattles = battles.filter((b) => b.status === 'active');

  // Reuses the same /upload endpoint the gallery pipeline is built on (multer-
  // free, sharp-resized, storage-backed) rather than a parallel upload path —
  // battles.submit only ever needs the imageUrl it hands back.
  async function handleSubmit() {
    if (!file || !selectedBattle) return;
    setBusy(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', 'Battle submission');
      form.append('category', 'other');
      const token = getToken();
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        setMessage(t('battles_submit_error'));
        return;
      }
      const uploaded = (await res.json()) as { imageUrl: string };
      await trpc.battles.submit.mutate({ battleId: selectedBattle, imageUrl: uploaded.imageUrl });
      setFile(null);
      setSelectedBattle('');
      setMessage(t('battles_submit_success'));
      refresh();
    } catch (err) {
      if (isPaywallError(err)) {
        setPaywallBlocked(true);
      } else if (isConflictError(err)) {
        setMessage(t('battles_submit_conflict'));
      } else if (isBattleClosedError(err)) {
        setMessage(t('battles_submit_closed'));
      } else {
        setMessage(t('battles_submit_error'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModulePage title={t('nav_battles')} icon="crown-stencil" tag="BATTLES / WRITE OR WATCH">
      {loading ? (
        <p className="label-mono text-smoke">LOADING...</p>
      ) : battles.length === 0 ? (
        <p className="label-mono text-smoke">{t('empty_state')}</p>
      ) : (
        <ul className="divide-y divide-fog border border-fog">
          {battles.map((b) => (
            <li key={b.id} className="label-mono flex flex-wrap items-center justify-between gap-2 px-3 py-3">
              <span className="text-bone">{b.title}</span>
              <span className="flex items-center gap-3">
                <span className={statusColor(b.status)}>{t(`battles_status_${b.status}`).toUpperCase()}</span>
                <span className="text-smoke">{new Date(b.closesAt).toLocaleString()}</span>
                <span className="text-smoke">
                  {b.participantCount} {t('battles_participants')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {user && (
        <div className="mt-6 border-t border-fog pt-6">
          <h2 className="label-mono mb-3">{t('battles_submit_title')}</h2>
          {activeBattles.length === 0 ? (
            <p className="label-mono text-smoke">{t('battles_submit_none_active')}</p>
          ) : (
            <div className="flex flex-wrap items-end gap-2 border border-fog px-3 py-3">
              <label className="label-mono flex flex-col gap-1 text-smoke">
                {t('battles_submit_select')}
                <select
                  className="border border-fog bg-ink px-2 py-1 text-bone"
                  value={selectedBattle}
                  onChange={(e) => setSelectedBattle(e.target.value)}
                >
                  <option value="">—</option>
                  {activeBattles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="label-mono text-smoke"
              />
              <button className="btn btn-primary" disabled={busy || !file || !selectedBattle} onClick={handleSubmit}>
                {t('battles_submit_action')}
              </button>
            </div>
          )}
          {message && <p className="label-mono mt-3 text-signal">{message}</p>}
        </div>
      )}
    </ModulePage>
  );
}
