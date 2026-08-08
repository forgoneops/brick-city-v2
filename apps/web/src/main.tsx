import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './i18n/index.js';
import { AuthProvider } from './lib/session.js';
import { CmsProvider } from './lib/cms.js';
import { setUpdateAvailable } from './lib/swUpdate.js';
import App from './App.js';
import './index.css';

// sw.js already calls self.skipWaiting() on install and self.clients.claim()
// on activate, so a new worker takes control of open tabs with no
// postMessage handshake needed — the only missing piece is telling React
// about it, since a new bundle sitting in the background doesn't refresh
// anything on its own.
function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  navigator.serviceWorker
    .register('/sw.js')
    .then((registration) => {
      registration.addEventListener('updatefound', () => {
        // Read fresh at the moment an update starts installing, not once at
        // module load: a first-ever install has no controller yet at this
        // exact point (nothing has claimed this page), so it's correctly
        // suppressed. A real update — even one discovered while this exact
        // tab has stayed open since that first install — always has one,
        // since the outgoing worker already claimed the page on its own
        // activation. Capturing this once up front would only catch updates
        // across separate page loads, missing the same-tab-stays-open case
        // this feature exists for.
        const hadController = Boolean(navigator.serviceWorker.controller);
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'activated' && hadController) {
            setUpdateAvailable();
          }
        });
      });

      // A PWA left open for days only re-checks sw.js on its own schedule
      // (browser-dependent, often ~24h) — also check whenever the tab is
      // brought back into focus, so a stale open session notices sooner.
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => {});
        }
      });
    })
    .catch((err) => {
      console.error('SW registration failed', err);
    });
}

registerServiceWorker();

// Apply the NIGHT WALK palette before first paint (toggled in Layout).
if (localStorage.getItem('bcm-nightwalk') === '1') {
  document.documentElement.dataset.nightwalk = '1';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CmsProvider>
        <I18nProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </I18nProvider>
      </CmsProvider>
    </BrowserRouter>
  </StrictMode>
);
