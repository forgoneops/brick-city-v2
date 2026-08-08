import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';
import { Switch } from '../components/Switch.js';

export function Login() {
  const { t } = useT();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loggedOutIdle = searchParams.get('reason') === 'idle';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(identifier, password, rememberMe);
      navigate('/');
    } catch {
      setError('INVALID CREDENTIALS');
    }
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-ink px-4">
      <div className="w-full max-w-md border border-fog bg-concrete p-6">
        <h1 className="font-display text-3xl uppercase tracking-tight text-bone">
          {t('login_title')}
        </h1>
        <p className="label-mono mt-2">GATE / {t('login_title').toUpperCase()}</p>

        {loggedOutIdle && (
          <p className="label-mono mt-4 text-blood">{t('login_idle_logout_message')}</p>
        )}

        {error && (
          <p className="label-mono mt-4 text-blood">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="label-mono">{t('login_identifier')}</span>
            <input
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="input mt-1"
              required
            />
          </label>
          <label className="block">
            <span className="label-mono">{t('login_password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mt-1"
              required
            />
          </label>
          <Switch checked={rememberMe} onChange={setRememberMe} label={t('login_remember_me')} />
          <button type="submit" className="btn btn-primary w-full">
            {t('action_login')}
          </button>
        </form>
      </div>
    </section>
  );
}