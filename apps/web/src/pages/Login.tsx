import { useState } from 'react';
import { useT } from '../i18n/index.js';

export function Login() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(phase-1): wire to trpc.auth.login.mutate
    console.log('login attempt', { email, password });
  }

  return (
    <section className="mx-auto max-w-md border border-fog bg-concrete p-6">
      <h1 className="font-display text-3xl">{t('login_title')}</h1>
      <p className="label-mono mt-2">MODULE / {t('login_title').toUpperCase()} / PHASE 0</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="label-mono">{t('login_email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-fog bg-asphalt px-3 py-2 text-bone outline-none focus:border-signal"
          />
        </label>
        <label className="block">
          <span className="label-mono">{t('login_password')}</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-fog bg-asphalt px-3 py-2 text-bone outline-none focus:border-signal"
          />
        </label>
        <button
          type="submit"
          className="w-full border border-signal bg-signal px-4 py-2 font-mono text-[12px] uppercase tracking-widest text-ink hover:bg-ink hover:text-signal"
        >
          {t('action_login')}
        </button>
      </form>
    </section>
  );
}
