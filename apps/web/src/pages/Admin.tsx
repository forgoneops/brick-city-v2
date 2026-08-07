import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { Stamp } from '../components/Stamp.js';
import { AdminInvites } from '../components/AdminInvites.js';
import { Icon } from '../components/Icon.js';
import { useT } from '../i18n/index.js';
import { FEATURES, type FeatureName } from '../config/features.js';

interface Stats {
  users: number;
  uploadsPerDay: number;
  openReports: number;
  pendingPins: number;
}

interface Report {
  id: string;
  targetType: string;
  targetId: string;
  reporterId: string | null;
  reason: string;
  aiFlag: boolean;
  status: string;
  createdAt: string;
}

interface PendingPin {
  id: string;
  name: string;
  city: string;
  type: string;
  lat: number;
  lng: number;
  membersOnly: boolean;
  status: string;
  createdAt: string;
}

interface PendingEvent {
  id: string;
  name: string;
  city: string;
  type: string;
  date: string;
  status: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  nick: string;
  role: string;
  walletBalanceCents: number;
  trialEndsAt: string | null;
  createdAt: string;
}

interface ModThread {
  id: string;
  title: string;
  authorNick: string;
  isPinned: boolean;
  isLocked: boolean;
  replyCount: number;
}

interface SubStats {
  activeTrials: number;
  payingUsers: number;
  walletVolumeCents: number;
  mrrCents: number;
  invitesSent: number;
}

interface WalletTx {
  id: string;
  nick: string;
  amountCents: number;
  type: string;
  provider: string | null;
  status: string;
  createdAt: string;
}

interface Provider {
  id: string;
  enabled: boolean;
}

export function Admin() {
  const { t } = useT();
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingPins, setPendingPins] = useState<PendingPin[]>([]);
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [threads, setThreads] = useState<ModThread[]>([]);
  const [subStats, setSubStats] = useState<SubStats | null>(null);
  const [walletTxs, setWalletTxs] = useState<WalletTx[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [stampedRows, setStampedRows] = useState<string[]>([]);

  const flagRows = (Object.keys(FEATURES) as FeatureName[]).map((name) => ({
    name,
    enabled: FEATURES[name],
  }));

  function refresh() {
    trpc.admin.stats.query().then(setStats);
    trpc.admin.reports.list.query().then(setReports);
    trpc.admin.pins.queue.query().then(setPendingPins);
    trpc.admin.events.queue.query().then(setPendingEvents);
    trpc.admin.users.list.query().then(setUsers);
    trpc.forum.threads.query().then((res) => setThreads(res.items));
    trpc.admin.subscriptions.stats.query().then(setSubStats);
    trpc.admin.wallet.transactions.query().then((res) => setWalletTxs(res.items));
    trpc.admin.providers.list.query().then(setProviders);
  }

  useEffect(() => {
    refresh();
  }, []);

  function handleReportAction(id: string, action: 'delete' | 'warn' | 'dismiss') {
    trpc.admin.reports.resolve.mutate({ id, action }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handlePinApprove(id: string) {
    trpc.admin.pins.setStatus.mutate({ id, status: 'live' }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handlePinReject(id: string) {
    trpc.admin.pins.setStatus.mutate({ id, status: 'rejected' }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handleEventApprove(id: string) {
    trpc.admin.events.setStatus.mutate({ id, status: 'live' }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handleEventReject(id: string) {
    trpc.admin.events.setStatus.mutate({ id, status: 'rejected' }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handleRoleChange(id: string, role: string) {
    trpc.admin.users.setRole.mutate({ id, role: role as 'user' | 'moderator' | 'admin' });
  }

  function handleThreadPin(id: string, pinned: boolean) {
    trpc.forum.moderation.setPinned.mutate({ id, pinned }).then(refresh);
  }

  function handleThreadLock(id: string, locked: boolean) {
    trpc.forum.moderation.setLocked.mutate({ id, locked }).then(refresh);
  }

  function handleThreadDelete(id: string) {
    trpc.forum.moderation.delete.mutate({ id }).then(() => {
      setStampedRows((prev) => [...prev, id]);
      refresh();
    });
  }

  function handleProviderToggle(id: string, enabled: boolean) {
    trpc.admin.providers.setEnabled.mutate({ id: id as 'stripe' | 'przelewy24' | 'paypal', enabled }).then(refresh);
  }

  return (
    <ModulePage
      title={t('admin_title')}
      icon="gate"
      tag={`${t('admin_note')} / INTERNAL`}
    >
      <div className="space-y-8">
        {/* Site CMS entry point — not in the public sidebar nav, which has
            no role-gating; see docs/DECISIONS.md. */}
        <Link
          to="/admin/cms"
          className="flex items-center gap-3 border border-fog bg-concrete px-4 py-3 transition-colors hover:border-signal hover:text-signal"
        >
          <Icon name="gate" size={20} />
          <span className="label-mono text-bone">{t('admin_cms_link')}</span>
        </Link>

        <AdminInvites />

        {/* Dashboard stats */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_stats')}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">USERS</span>
              <span className="font-display text-2xl text-bone">{stats?.users ?? 0}</span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">UPLOADS / DAY</span>
              <span className="font-display text-2xl text-bone">{stats?.uploadsPerDay ?? 0}</span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">OPEN REPORTS</span>
              <span className="font-display text-2xl text-blood">{stats?.openReports ?? 0}</span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">PENDING PINS</span>
              <span className="font-display text-2xl text-bone">{stats?.pendingPins ?? 0}</span>
            </div>
          </div>
        </section>

        {/* Feature flags */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_flags')}</h2>
          <ul className="divide-y divide-fog border border-fog">
            {flagRows.map((flag) => (
              <li
                key={flag.name}
                className="label-mono flex items-center justify-between px-3 py-2"
              >
                <span className="text-bone">{flag.name.toUpperCase()}</span>
                <span className={flag.enabled ? 'text-signal' : 'text-blood'}>
                  {flag.enabled ? 'ENABLED' : 'DISABLED'}
                </span>
              </li>
            ))}
          </ul>
          <p className="label-mono mt-2 text-fog">FLIP IN SRC/CONFIG/FEATURES.TS</p>
        </section>

        {/* Reports queue */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_reports')}</h2>
          {reports.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {reports.map((r) => (
                <li key={r.id} className="relative flex items-start justify-between gap-3 px-3 py-3">
                  <div className="flex-1">
                    <span className="label-mono text-bone">
                      {r.targetType.toUpperCase()} / {r.targetId.slice(0, 8)}...
                    </span>
                    <p className="text-smoke mt-1">{r.reason}</p>
                    <span className="label-mono text-fog">
                      {new Date(r.createdAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {stampedRows.includes(r.id) ? (
                      <Stamp label={t('admin_resolved')} />
                    ) : (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleReportAction(r.id, 'delete')}
                        >
                          DELETE
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleReportAction(r.id, 'warn')}
                        >
                          WARN
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleReportAction(r.id, 'dismiss')}
                        >
                          DISMISS
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pin approval queue */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_pins')}</h2>
          {pendingPins.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {pendingPins.map((pin) => (
                <li key={pin.id} className="relative flex items-center justify-between gap-3 px-3 py-3">
                  <span className="label-mono text-bone">
                    {pin.name} / {pin.city} / {pin.type}
                    {pin.membersOnly && <span className="text-signal ml-2">MEMBERS ONLY</span>}
                  </span>
                  <div className="flex gap-2">
                    {stampedRows.includes(pin.id) ? (
                      <Stamp label={t('admin_approved')} />
                    ) : (
                      <>
                        <button
                          className="btn"
                          onClick={() => handlePinApprove(pin.id)}
                        >
                          APPROVE
                        </button>
                        <button
                          className="btn"
                          onClick={() => handlePinReject(pin.id)}
                        >
                          REJECT
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Event approval queue */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_events')}</h2>
          {pendingEvents.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {pendingEvents.map((evt) => (
                <li key={evt.id} className="relative flex items-center justify-between gap-3 px-3 py-3">
                  <span className="label-mono text-bone">
                    {evt.name} / {evt.city} / {evt.type} / {new Date(evt.date).toLocaleDateString('en-GB')}
                  </span>
                  <div className="flex gap-2">
                    {stampedRows.includes(evt.id) ? (
                      <Stamp label={t('admin_approved')} />
                    ) : (
                      <>
                        <button
                          className="btn"
                          onClick={() => handleEventApprove(evt.id)}
                        >
                          APPROVE
                        </button>
                        <button
                          className="btn"
                          onClick={() => handleEventReject(evt.id)}
                        >
                          REJECT
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Forum moderation */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_forum_mod')}</h2>
          {threads.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {threads.map((th) => (
                <li key={th.id} className="relative flex items-center justify-between gap-3 px-3 py-3">
                  <span className="label-mono text-bone">
                    {th.title} / {th.authorNick} / {th.replyCount} REPLIES
                    {th.isPinned && <span className="text-signal ml-2">{t('forum_pinned')}</span>}
                    {th.isLocked && <span className="text-blood ml-2">{t('forum_locked')}</span>}
                  </span>
                  <div className="flex gap-2">
                    {stampedRows.includes(th.id) ? (
                      <Stamp label={t('forum_delete').toUpperCase()} />
                    ) : (
                      <>
                        <button className="btn" onClick={() => handleThreadPin(th.id, !th.isPinned)}>
                          {th.isPinned ? t('forum_unpin') : t('forum_pin')}
                        </button>
                        <button className="btn" onClick={() => handleThreadLock(th.id, !th.isLocked)}>
                          {th.isLocked ? t('forum_unlock') : t('forum_lock')}
                        </button>
                        <button className="btn" onClick={() => handleThreadDelete(th.id)}>
                          {t('forum_delete')}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Users list */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_users')}</h2>
          {users.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div>
                    <span className="label-mono text-bone">{u.nick}</span>
                    <span className="label-mono text-smoke ml-3">{u.email}</span>
                    <span className="label-mono text-fog ml-3">{u.role.toUpperCase()}</span>
                  </div>
                  <select
                    className="input py-1 text-xs"
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  >
                    <option value="user">USER</option>
                    <option value="moderator">MODERATOR</option>
                    <option value="admin">ADMIN</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Subscriptions dashboard */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_subscriptions')}</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">ACTIVE TRIALS</span>
              <span className="font-display text-2xl text-bone">{subStats?.activeTrials ?? 0}</span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">PAYING USERS</span>
              <span className="font-display text-2xl text-signal">{subStats?.payingUsers ?? 0}</span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">WALLET VOLUME</span>
              <span className="font-display text-2xl text-bone">
                {((subStats?.walletVolumeCents ?? 0) / 100).toFixed(0)} PLN
              </span>
            </div>
            <div className="border border-fog bg-concrete px-3 py-2">
              <span className="label-mono block text-smoke">MRR</span>
              <span className="font-display text-2xl text-signal">
                {((subStats?.mrrCents ?? 0) / 100).toFixed(0)} PLN
              </span>
            </div>
          </div>
        </section>

        {/* Payment providers */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_providers')}</h2>
          <ul className="divide-y divide-fog border border-fog">
            {providers.map((p) => (
              <li key={p.id} className="label-mono flex items-center justify-between px-3 py-2">
                <span className="text-bone">{p.id.toUpperCase()}</span>
                <button
                  className={`border px-3 py-1 ${p.enabled ? 'border-signal text-signal' : 'border-fog text-smoke'}`}
                  onClick={() => handleProviderToggle(p.id, !p.enabled)}
                >
                  {p.enabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Wallet transactions */}
        <section>
          <h2 className="label-mono mb-3">{t('admin_transactions')}</h2>
          {walletTxs.length === 0 ? (
            <p className="label-mono text-smoke">NOTHING HERE. YET.</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {walletTxs.map((tx) => (
                <li key={tx.id} className="label-mono flex items-center justify-between px-3 py-2">
                  <span className="text-bone">
                    {tx.nick} / {tx.type.toUpperCase()} {tx.provider ? `/ ${tx.provider.toUpperCase()}` : ''}
                  </span>
                  <span className={tx.amountCents >= 0 ? 'text-signal' : 'text-blood'}>
                    {tx.amountCents >= 0 ? '+' : ''}
                    {(tx.amountCents / 100).toFixed(2)} PLN
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </ModulePage>
  );
}
