import { useState } from 'react';
import { useT } from '../i18n/index.js';

export function Invite() {
  const { t } = useT();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(phase-1): wire to trpc.auth.register.mutate
    console.log('invite register attempt', { code, email, nick, password });
  }

  return (
    <section className="mx-auto max-w-md border border-fog bg-concrete p-6">
      <h1 className="font-display text-3xl">{t('invite_title')}</h1>
      <p className="label-mono mt-2">{t('invite_whisper')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="label-mono">{t('invite_code')}</span>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full border border-fog bg-asphalt px-3 py-2 text-bone outline-none focus:border-signal"
          />
        </label>
        <label className="block">
          <span className="label-mono">{t('invite_email')}</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-fog bg-asphalt px-3 py-2 text-bone outline-none focus:border-signal"
          />
        </label>
        <label className="block">
          <span className="label-mono">{t('invite_nick')}</span>
          <input
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            className="mt-1 w-full border border-fog bg-asphalt px-3 py-2 text-bone outline-none focus:border-signal"
          />
        </label>
        <label className="block">
          <span className="label-mono">{t('invite_password')}</span>
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
          {t('action_register')}
        </button>
      </form>
    </section>
  );
}
