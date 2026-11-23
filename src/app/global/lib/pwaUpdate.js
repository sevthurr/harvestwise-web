// Single owner of service-worker registration and the "update available" signal.
//
// The service worker is configured with `registerType: 'prompt'` (vite.config.js),
// so a new build does NOT take over silently: `onNeedRefresh` fires when a new
// version is downloaded and waiting, and the app is expected to ask the user
// (see the Update card in Menu.jsx) before calling `applyUpdate()`.
// With `autoUpdate` this event never fires, which is why the mode matters
// here — there is no prompt to show without it.
let updateFn = null;
const API_RUNTIME_CACHE = 'harvestwise-api-cache';
/** @type {Set<(available: boolean) => void>} */
const listeners = new Set();

export async function initPWAUpdate() {
  const { registerSW } = await import('virtual:pwa-register');
  void purgeUserApiCache();
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

// Older service workers cached the authenticated daily snapshot by URL. Remove
// those entries even when the new worker is installed over an existing app.
export async function purgeUserApiCache() {
  try {
    const cache = await caches.open(API_RUNTIME_CACHE);
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter((request) => /\/api\/v1\/farmer\/daily-snapshot(?:\?|$)/i.test(request.url))
        .map((request) => cache.delete(request))
    );
  } catch {
    // CacheStorage may be unavailable in private browsing or older WebViews.
  }
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

export async function requestPersistentStorage() {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist();
      return granted;
    }
  } catch {
    // ignore
  }
  return false;
}
