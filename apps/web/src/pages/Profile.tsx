import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { GALLERY_CATEGORIES, type GalleryCategory } from '@bcv2/shared';
import { trpc, getToken } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { Stamp } from '../components/Stamp.js';
import { Icon } from '../components/Icon.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

// Same same-origin-by-default convention as lib/trpc.ts's API_BASE.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

type ProviderId = 'stripe' | 'przelewy24' | 'paypal';
const TOP_UP_AMOUNTS = [1000, 2500, 5000];
const BIO_MAX = 500;

interface SubStatus {
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  priceCents: number;
}

interface Transaction {
  id: string;
  amountCents: number;
  type: string;
  reason: string;
  provider: string | null;
  status: string;
  createdAt: string;
}

type PushState = 'loading' | 'unsupported' | 'denied' | 'off' | 'on';

// VAPID public key (base64url) -> Uint8Array for pushManager.subscribe().
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function Profile() {
  const { t } = useT();
  const { user, refreshUser } = useAuth();
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [style, setStyle] = useState<GalleryCategory | ''>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enabledProviders, setEnabledProviders] = useState<ProviderId[]>([]);
  const [provider, setProvider] = useState<ProviderId | null>(null);
  const [pushState, setPushState] = useState<PushState>('loading');
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  function refresh() {
    trpc.subscriptions.balance.query().then((res) => setBalance(res.walletBalanceCents));
    trpc.subscriptions.myStatus.query().then(setStatus);
    trpc.subscriptions.transactions.query().then((res) => setTransactions(res.items));
    trpc.subscriptions.enabledProviders.query().then((res) => {
      const ids = res.providers as ProviderId[];
      setEnabledProviders(ids);
      setProvider((current) => (current && ids.includes(current) ? current : (ids[0] ?? null)));
    });
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setBio(user.bio ?? '');
    setLocation(user.location ?? '');
    setStyle((user.style as GalleryCategory) ?? '');
    setAvatarUrl(user.avatarUrl);
  }, [user]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'avatar');
      const token = getToken();
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) return;
      const uploaded = (await res.json()) as { imageUrl: string };
      await trpc.users.updateProfile.mutate({ avatarUrl: uploaded.imageUrl });
      setAvatarUrl(uploaded.imageUrl);
      await refreshUser();
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function saveProfileDetails() {
    await trpc.users.updateProfile.mutate({
      bio: bio.trim() || null,
      location: location.trim() || null,
      style: style || null,
    });
    await refreshUser();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 1400);
  }

  // Web Push capability probe: unsupported browser, denied permission, or a
  // deploy without VAPID keys each map to a distinct toggle state.
  useEffect(() => {
    if (!user) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported');
      return;
    }
    trpc.push.vapidPublicKey.query().then((res) => {
      if (!res.key) {
        setPushState('unsupported');
        return;
      }
      setVapidKey(res.key);
      if (Notification.permission === 'denied') {
        setPushState('denied');
        return;
      }
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushState(sub ? 'on' : 'off'))
        .catch(() => setPushState('off'));
    });
  }, [user]);

  function handleTopUp(amountCents: number) {
    if (!provider) return;
    trpc.subscriptions.topUp.mutate({ amountCents, provider }).then(() => {
      setShowTopUp(false);
      refresh();
    });
  }

  async function handlePushToggle() {
    if (pushState === 'on') {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await trpc.push.unsubscribe.mutate({ endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setPushState('off');
      return;
    }
    if (pushState !== 'off' || !vapidKey) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setPushState('denied');
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });
    const keys = sub.toJSON().keys;
    if (!keys) return;
    await trpc.push.subscribe.mutate({ endpoint: sub.endpoint, p256dh: keys.p256dh, auth: keys.auth });
    setPushState('on');
  }

  if (!user) {
    return <ModulePage title={t('nav_profile')} icon="mask" tag="PROFILE / WRITER" />;
  }

  const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const trialDaysLeft = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000) : null;
  const trialActive = trialDaysLeft !== null && trialDaysLeft > 0;

  return (
    <ModulePage title={t('nav_profile')} icon="mask" tag={`PROFILE / ${user.nick}`}>
      <div className="space-y-6">
        {/* Extended profile: avatar, location, style, bio */}
        <section className="border border-fog">
          <div className="border-b border-fog px-3 py-2">
            <h2 className="label-mono">{t('profile_details_title')}</h2>
          </div>
          <div className="space-y-4 px-3 py-4">
            <div className="flex items-center gap-4">
              <div className="h-24 w-24 shrink-0 overflow-hidden border border-fog bg-asphalt">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={t('profile_avatar')} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-smoke">
                    <Icon name="mask" size={32} />
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingAvatar ? t('profile_avatar_uploading') : t('profile_avatar_upload')}
                </button>
              </div>
            </div>

            <div>
              <label className="label-mono mb-1 block text-smoke">{t('profile_location')}</label>
              <input
                className="input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('profile_location_placeholder')}
                maxLength={120}
              />
            </div>

            <div>
              <label className="label-mono mb-1 block text-smoke">{t('profile_style')}</label>
              <select className="input" value={style} onChange={(e) => setStyle(e.target.value as GalleryCategory | '')}>
                <option value="">{t('profile_style_unset')}</option>
                {GALLERY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {t(`cat_${cat.replace('-', '_')}`)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label-mono mb-1 block text-smoke">{t('profile_bio')}</label>
              <textarea
                className="input min-h-24"
                value={bio}
                maxLength={BIO_MAX}
                onChange={(e) => setBio(e.target.value)}
              />
              <p className="label-mono mt-1 text-right text-smoke">
                {t('profile_bio_char_count')
                  .replace('{{count}}', String(bio.length))
                  .replace('{{max}}', String(BIO_MAX))}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="btn btn-primary" onClick={saveProfileDetails}>
                {t('admin_cms_save')}
              </button>
              {profileSaved && <Stamp label={t('admin_cms_saved')} />}
            </div>
          </div>
        </section>

        {/* Trial / subscription status */}
        <div className="label-mono border border-fog px-3 py-2">
          {status?.status === 'active' ? (
            <span className="text-signal">{t('wallet_status_active')}</span>
          ) : trialActive ? (
            <span className="text-signal">
              {t('wallet_trial_active').replace('{{days}}', String(trialDaysLeft))}
            </span>
          ) : (
            <span className="text-blood">{t('wallet_trial_expired')}</span>
          )}
        </div>

        {/* Wallet card */}
        <section className="border border-fog">
          <div className="flex items-center justify-between border-b border-fog px-3 py-2">
            <h2 className="label-mono">{t('wallet_title')}</h2>
            {enabledProviders.length > 0 && (
              <button className="btn btn-primary" onClick={() => setShowTopUp((v) => !v)}>
                {t('wallet_top_up')}
              </button>
            )}
          </div>
          <div className="px-3 py-4">
            <span className="label-mono block text-smoke">{t('wallet_balance')}</span>
            <span className="font-display text-3xl text-bone">
              {(balance / 100).toFixed(2)} PLN
            </span>
          </div>

          {enabledProviders.length === 0 ? (
            <p className="label-mono border-t border-fog px-3 py-3 text-smoke">{t('wallet_providers_off')}</p>
          ) : (
            showTopUp && (
              <div className="border-t border-fog px-3 py-3">
                <div className="mb-3 flex flex-wrap gap-2">
                  {enabledProviders.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`label-mono border px-3 py-1 transition-colors ${
                        provider === p ? 'border-signal text-signal' : 'border-fog text-smoke hover:text-bone'
                      }`}
                    >
                      {t(`wallet_provider_${p}`)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {TOP_UP_AMOUNTS.map((amount) => (
                    <button key={amount} className="btn" onClick={() => handleTopUp(amount)}>
                      +{(amount / 100).toFixed(0)} PLN
                    </button>
                  ))}
                </div>
              </div>
            )
          )}
        </section>

        {/* Push notifications */}
        <section className="border border-fog">
          <div className="flex items-center justify-between border-b border-fog px-3 py-2">
            <h2 className="label-mono">{t('push_title')}</h2>
            {(pushState === 'off' || pushState === 'on') && (
              <button
                className={pushState === 'on' ? 'btn' : 'btn btn-primary'}
                onClick={() => void handlePushToggle()}
              >
                {pushState === 'on' ? t('push_disable') : t('push_enable')}
              </button>
            )}
          </div>
          <p className="label-mono px-3 py-3 text-smoke">
            {pushState === 'on'
              ? t('push_enabled')
              : pushState === 'denied'
                ? t('push_denied')
                : pushState === 'unsupported'
                  ? t('push_unsupported')
                  : t('push_blurb')}
          </p>
        </section>

        {/* My invites */}
        <section className="border border-fog">
          <div className="flex items-center justify-between border-b border-fog px-3 py-2">
            <h2 className="label-mono">{t('invites_title')}</h2>
            <Link to="/invites" className="btn btn-primary">
              {t('invites_manage')}
            </Link>
          </div>
          <p className="label-mono px-3 py-3 text-smoke">{t('invites_blurb')}</p>
        </section>

        {/* Transaction history */}
        <section>
          <h2 className="label-mono mb-3">{t('wallet_history')}</h2>
          {transactions.length === 0 ? (
            <p className="label-mono text-smoke">{t('empty_state')}</p>
          ) : (
            <ul className="divide-y divide-fog border border-fog">
              {transactions.map((tx) => (
                <li key={tx.id} className="label-mono flex items-center justify-between px-3 py-2">
                  <span className="text-bone">
                    {tx.type.toUpperCase()} {tx.provider ? `/ ${tx.provider.toUpperCase()}` : ''}
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
