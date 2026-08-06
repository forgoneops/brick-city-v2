import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from './i18n/index.js';
import { AuthProvider } from './lib/session.js';
import { CmsProvider } from './lib/cms.js';
import App from './App.js';
import './index.css';

function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed', err);
    });
  }
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
