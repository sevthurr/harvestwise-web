// Single owner of service-worker registration and the "update available" signal.
//
// The service worker is configured with `registerType: 'prompt'` (vite.config.js),
// so a new build does NOT take over silently: `onNeedRefresh` fires when a new
// version is downloaded and waiting, and the app is expected to ask the user
// (see the Update card in Menu.jsx) before calling `applyUpdate()`.
// With `autoUpdate` this event never fires, which is why the mode matters
// here — there is no prompt to show without it.
import { registerSW } from 'virtual:pwa-register';

let updateFn = null;
/** @type {Set<(available: boolean) => void>} */
const listeners = new Set();

export function initPWAUpdate() {
  updateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      listeners.forEach((listener) => listener(true));
    },
    onOfflineReady() {
      listeners.forEach((listener) => listener(false));
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed:', error);
    },
  });
}

// activate the waiting service worker and reload the page
export function applyUpdate() {
  if (typeof updateFn === 'function') updateFn(true);
}

/** Subscribe to update availability. Returns an unsubscribe function. */
export function subscribeUpdateAvailable(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}