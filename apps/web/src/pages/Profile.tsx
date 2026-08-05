import { useEffect, useState } from 'react';
import { trpc } from '../lib/trpc.js';
import { ModulePage } from '../components/ModulePage.js';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';

const PROVIDERS = ['stripe', 'przelewy24', 'paypal'] as const;
const TOP_UP_AMOUNTS = [1000, 2500, 5000];

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

export function Profile() {
  const { t } = useT();
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [status, setStatus] = useState<SubStatus | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>('stripe');

  function refresh() {
    trpc.subscriptions.balance.query().then((res) => setBalance(res.walletBalanceCents));
    trpc.subscriptions.myStatus.query().then(setStatus);
    trpc.subscriptions.transactions.query().then((res) => setTransactions(res.items));
  }

  useEffect(() => {
    if (user) refresh();
  }, [user]);

  function handleTopUp(amountCents: number) {
    trpc.subscriptions.topUp.mutate({ amountCents, provider }).then(() => {
      setShowTopUp(false);
      refresh();
    });
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
            <button className="btn btn-primary" onClick={() => setShowTopUp((v) => !v)}>
              {t('wallet_top_up')}
            </button>
          </div>
          <div className="px-3 py-4">
            <span className="label-mono block text-smoke">{t('wallet_balance')}</span>
            <span className="font-display text-3xl text-bone">
              {(balance / 100).toFixed(2)} PLN
            </span>
          </div>

          {showTopUp && (
            <div className="border-t border-fog px-3 py-3">
              <div className="mb-3 flex flex-wrap gap-2">
                {PROVIDERS.map((p) => (
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
          )}
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
