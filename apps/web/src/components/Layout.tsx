import type React from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon } from './Icon.js';
import { useT, type Locale, LOCALES } from '../i18n/index.js';

const navItems: Array<{ to: string; key: string; icon: React.ComponentProps<typeof Icon>['name'] }> = [
  { to: '/', key: 'nav_home', icon: 'home' },
  { to: '/gallery', key: 'nav_gallery', icon: 'spray-can' },
  { to: '/map', key: 'nav_map', icon: 'pin' },
  { to: '/news', key: 'nav_news', icon: 'zine' },
  { to: '/events', key: 'nav_events', icon: 'lantern' },
  { to: '/battles', key: 'nav_battles', icon: 'crown' },
  { to: '/forum', key: 'nav_forum', icon: 'thread' },
  { to: '/ranking', key: 'nav_ranking', icon: 'scale' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useT();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/invite';

  return (
    <div className="min-h-screen bg-ink text-bone">
      <header className="sticky top-0 z-40 border-b border-fog bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <Icon name="logo" className="text-signal" />
            <span className="font-display text-xl tracking-tight">BRICK CITY MASHIN'</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                    isActive ? 'border border-signal text-signal' : 'border border-transparent text-smoke hover:text-bone'
                  }`
                }
              >
                <Icon name={item.icon} size={18} />
                {t(item.key)}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex gap-1 font-mono text-[10px] uppercase tracking-wider text-smoke">
              {LOCALES.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setLocale(loc as Locale)}
                  className={`px-2 py-1 border ${
                    locale === loc ? 'border-signal text-signal' : 'border-transparent hover:text-bone'
                  }`}
                  aria-label={`Switch to ${loc}`}
                >
                  {t(`locale_${loc}`)}
                </button>
              ))}
            </div>

            {isAuthPage ? (
              <Link
                to="/invite"
                className="hidden items-center gap-2 border border-signal bg-signal px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-ink md:flex"
              >
                <Icon name="key" size={16} />
                {t('nav_invite')}
              </Link>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 border border-fog px-3 py-2 font-mono text-[11px] uppercase tracking-wider text-smoke hover:border-signal hover:text-signal"
              >
                <Icon name="mask" size={16} />
                {t('nav_login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      <footer className="border-t border-fog py-6 text-center">
        <p className="label-mono">BRICK CITY MASHIN' / EST. ON CONCRETE</p>
      </footer>
    </div>
  );
}
