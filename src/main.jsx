import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles/index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA functionality and capture install prompt
const updateSW = registerSW({
  immediate: true,
  onRegistered(registration) {
    console.log('[PWA] Service worker registered:', registration);
  },
  onRegisterError(error) {
    console.error('[PWA] Service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
