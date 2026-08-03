import { useState } from 'react';
import { useT } from '../i18n/index.js';

// Invite page (spec §6): black screen, single input, signal caret,
// mono whisper — YOU HEARD ABOUT US SOMEWHERE.
export function Invite() {
  const { t } = useT();
  const [code, setCode] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO(phase-2): wire to trpc.auth.register.mutate (invite code + account details)
    console.log('invite code attempt', { code });
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
        />
        <button type="submit" className="sr-only">
          {t('action_submit')}
        </button>
      </form>

      <p className="label-mono mt-10 text-fog">{t('invite_title')}</p>
    </section>
  );
}
