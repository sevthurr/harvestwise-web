import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';

createRoot(document.getElementById('root')).render(<App />);

// PWA registration is intentionally outside the critical render path. The
// update prompt and offline cache remain available shortly after first paint,
// while workbox-window and the service worker do not compete with the login
// shell's initial resources.
const registerPwaWhenIdle = () => {
  import('./app/global/lib/pwaUpdate')
    .then(async ({ initPWAUpdate, requestPersistentStorage }) => {
      await initPWAUpdate();
      await requestPersistentStorage();
    })
    .catch((error) => {
      console.error('[PWA] Deferred initialization failed:', error);
    });
};

if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  window.requestIdleCallback(registerPwaWhenIdle, { timeout: 2000 });
} else {
  setTimeout(registerPwaWhenIdle, 0);
}
