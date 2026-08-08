import type React from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from './Icon.js';
import { PaywallGate } from './PaywallGate.js';
import { FirstVisitPopups } from './FirstVisitPopups.js';
import { IdleWarningModal } from './IdleWarningModal.js';
import { UpdateBanner } from './UpdateBanner.js';
import { useT, type Locale, LOCALES } from '../i18n/index.js';
import { useCms } from '../lib/cms.js';
import { useAuth } from '../lib/session.js';
import { FEATURES } from '../config/features.js';

interface NavItem {
  to: string;
  key: string;
  icon: IconName;
}

// key -> {to, icon} — the CMS nav config only ever carries order + visible
// per key; route/icon stay code-defined here (Phase 4 spec: "order,
// visibility", not arbitrary new nav items).
const NAV_META: Record<string, { to: string; icon: IconName }> = {
  nav_home: { to: '/', icon: 'wall-brick' },
  nav_gallery: { to: '/gallery', icon: 'spray-can' },
  nav_map: { to: '/map', icon: 'pin-folded' },
  nav_news: { to: '/news', icon: 'zine-page' },
  nav_events: { to: '/events', icon: 'lantern' },
  nav_forum: { to: '/forum', icon: 'thread' },
  nav_ranking: { to: '/ranking', icon: 'scale' },
  nav_chat: { to: '/chat', icon: 'drip-dot' },
};
const DEFAULT_NAV_KEYS = Object.keys(NAV_META);

function useNavItems(): NavItem[] {
  const { config } = useCms();
  const cmsItems = config?.nav.items;
  const keys = cmsItems && cmsItems.length > 0 ? cmsItems.filter((i) => i.visible).map((i) => i.key) : DEFAULT_NAV_KEYS;
  // Modules launched after the CMS nav config was first persisted (e.g. chat)
  // aren't in the stored key list yet — append them so they show up without
  // forcing an admin to re-save the nav order.
  for (const key of DEFAULT_NAV_KEYS) {
    if (!keys.includes(key)) keys.push(key);
  }
  const items: NavItem[] = keys.filter((key) => NAV_META[key]).map((key) => ({ key, ...NAV_META[key] }));
  // Battles stays entirely gated by the compile-time flag, never by CMS nav
  // visibility — see docs/DECISIONS.md.
  if (FEATURES.battles) {
    items.push({ to: '/battles', key: 'nav_battles', icon: 'crown-stencil' });
  }
  return items;
}

function LocaleSwitch() {
  const { t, locale, setLocale } = useT();
  return (
    <div className="flex gap-1 font-mono text-[10px] uppercase tracking-wider text-smoke">
      {LOCALES.map((loc) => (
        <button
          key={loc}
          onClick={() => setLocale(loc as Locale)}
          className={`border px-2 py-1 ${
            locale === loc ? 'border-signal text-signal' : 'border-transparent hover:text-bone'
          }`}
          aria-label={`Switch to ${loc}`}
        >
          {t(`locale_${loc}`)}
        </button>
      ))}
    </div>
  );
}

function NightWalkToggle() {
  const { t } = useT();
  const [on, setOn] = useState(() => localStorage.getItem('bcm-nightwalk') === '1');
  useEffect(() => {
    if (on) {
      document.documentElement.dataset.nightwalk = '1';
      localStorage.setItem('bcm-nightwalk', '1');
    } else {
      delete document.documentElement.dataset.nightwalk;
      localStorage.removeItem('bcm-nightwalk');
    }
  }, [on]);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      aria-label={t('nightwalk_toggle')}
      className={`flex items-center gap-2 border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
        on ? 'border-signal text-signal' : 'border-transparent text-smoke hover:text-bone'
      }`}
    >
      <Icon name="lantern" size={14} />
      {t('nightwalk_toggle')}
    </button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useT();
  const { config } = useCms();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navItems = useNavItems();
  // Mystery pages render bare — black screen, no chrome (spec §6)
  const isBare = location.pathname === '/login' || location.pathname === '/invite';

  if (isBare) {
    return (
      <div className="min-h-screen bg-ink text-bone">
        <UpdateBanner />
        <PaywallGate />
        <IdleWarningModal />
        {children}
      </div>
    );
  }

  const announcement = config?.announcement;

  return (
    <div className="min-h-screen bg-ink text-bone">
      <UpdateBanner />
      <PaywallGate />
      <FirstVisitPopups />
      <IdleWarningModal />
      {announcement?.enabled && announcement.text && (
        <div className="border-b border-fog bg-concrete px-4 py-2 text-center md:ml-44">
          <p className="label-mono text-bone">
            <span className="text-signal">/// </span>
            {announcement.text}
          </p>
        </div>
      )}
      {/* Side-alley nav — vertical mono list on the desktop edge */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-44 flex-col border-r border-fog bg-ink md:flex">
        <Link to="/" className="block border-b border-fog px-4 py-4">
          <img src="/logo-mark.svg" alt="BRICK CITY MASHIN'" className="h-8 w-auto" />
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 border-l-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  isActive
                    ? 'border-signal text-signal'
                    : 'border-transparent text-smoke hover:text-bone'
                }`
              }
            >
              <Icon name={item.icon} size={18} />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-3 border-t border-fog px-4 py-4">
          <LocaleSwitch />
          <NightWalkToggle />
          {user ? (
            <>
              <p className="label-mono text-bone">{user.nick}</p>
              <Link to="/profile" className="btn justify-start">
                <Icon name="mask" size={16} />
                {t('nav_profile')}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" className="btn justify-start">
                  <Icon name="gate" size={16} />
                  {t('nav_admin')}
                </Link>
              )}
              <button type="button" onClick={logout} className="btn justify-start">
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <Link to="/login" className="btn justify-start">
              <Icon name="mask" size={16} />
              {t('nav_login')}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-fog bg-ink px-4 py-3 md:hidden">
        <Link to="/">
          <img src="/logo-mark.svg" alt="BRICK CITY MASHIN'" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <NightWalkToggle />
          {user ? (
            <>
              <Link to="/profile" className="label-mono text-bone" aria-label={t('nav_profile')}>
                {user.nick}
              </Link>
              {user.role === 'admin' && (
                <Link to="/admin" aria-label={t('nav_admin')}>
                  <Icon name="gate" size={20} className="text-smoke" />
                </Link>
              )}
              <button type="button" onClick={logout} aria-label={t('nav_logout')}>
                <Icon name="eye-off" size={20} className="text-smoke" />
              </button>
            </>
          ) : (
            <Link to="/login" aria-label={t('nav_login')}>
              <Icon name="mask" size={20} className="text-smoke" />
            </Link>
          )}
        </div>
      </header>

      <main className="px-4 pb-24 pt-6 md:ml-44 md:px-8 md:pb-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <footer className="border-t border-fog px-4 py-6 md:ml-44">
        <p className="label-mono text-center">BRICK CITY MASHIN' / EST. ON CONCRETE</p>
      </footer>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-fog bg-ink md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            aria-label={t(item.key)}
            className={({ isActive }) =>
              `flex flex-1 items-center justify-center border-t-2 py-3 ${
                isActive ? 'border-signal text-signal' : 'border-transparent text-smoke'
              }`
            }
          >
            <Icon name={item.icon} size={20} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
