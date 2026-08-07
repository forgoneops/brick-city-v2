import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n/index.js';
import { useAuth } from '../lib/session.js';
import { useCms } from '../lib/cms.js';
import { TurnstileWidget } from '../components/TurnstileWidget.js';

export function Invite() {
  const { t } = useT();
  const { register } = useAuth();
  const { config } = useCms();
  // Defaults to true (matches the server's own default) while config is
  // still loading, so the field never flashes optional-then-required.
  const inviteOnly = config?.registration.inviteOnly ?? true;
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register(email, nick, password, code.trim() || undefined, turnstileToken);
      navigate('/');
    } catch {
      setError('REGISTRATION FAILED');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-screen flex-col items-center justify-center bg-ink px-4">
      <p className="label-mono mb-10 text-center">{t('invite_whisper')}</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <label htmlFor="invite-code" className="sr-only">
          {t('invite_code')}
        </label>
        <input
          id="invite-code"
          type="text"
          autoFocus
          autoComplete="off"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="————"
          className="input caret-signal border-0 border-b border-fog bg-transparent px-0 py-3 text-center font-mono text-lg uppercase tracking-[0.3em] focus:border-signal"
          required={inviteOnly}
        />
        {!inviteOnly && <p className="label-mono mt-1 text-center text-smoke">{t('invite_code_optional')}</p>}

        <label htmlFor="invite-email" className="sr-only">
          {t('invite_email')}
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('invite_email')}
          className="input mt-4"
          required
        />

        <label htmlFor="invite-nick" className="sr-only">
          {t('invite_nick')}
        </label>
        <input
          id="invite-nick"
          type="text"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder={t('invite_nick')}
          className="input mt-2"
          required
        />

        <label htmlFor="invite-password" className="sr-only">
          {t('invite_password')}
        </label>
        <input
          id="invite-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t('invite_password')}
          className="input mt-2"
          required
        />

        <TurnstileWidget onToken={setTurnstileToken} />

        {error && (
          <p className="label-mono mt-4 text-blood">{error}</p>
        )}

        <button
          type="submit"
          className="btn btn-primary mt-4 w-full"
          disabled={loading}
        >
          {t('action_register')}
        </button>
      </form>

      <p className="label-mono mt-10 text-fog">{t('invite_title')}</p>
    </section>
  );
}