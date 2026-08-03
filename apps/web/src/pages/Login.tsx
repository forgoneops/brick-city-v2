import { useState } from 'react';
import { useT } from '../i18n/index.js';
import { Reveal } from '../components/Reveal.js';

export function Login() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(phase-2): wire to trpc.auth.login.mutate
    console.log('login attempt', { email, password });
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md border border-fog bg-concrete p-6">
        <h1 className="font-display text-3xl uppercase tracking-tight text-bone">
          <Reveal text={t('login_title')} />
        </h1>
        <p className="label-mono mt-2">GATE / {t('login_title').toUpperCase()}</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label-mono">{t('login_email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="label-mono">{t('login_password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
            />
          </label>
          <button type="submit" className="btn btn-primary w-full">
            {t('action_login')}
          </button>
        </form>
      </div>
    </section>
  );
}
