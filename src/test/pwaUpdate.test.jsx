/**
 * PWA update signal (client/src/app/global/lib/pwaUpdate.js).
 *
 * vite.config.js registers the service worker with `registerType: 'prompt'`:
 * a new build only downloads and waits — the app must surface "Update
 * available" to the user and call `applyUpdate()` to activate. `registerSW`
 * emits `onNeedRefresh` only in prompt mode, which is why the mode matters to
 * the UI that consumes this signal (the Update card in Menu.jsx).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { registerSW } = vi.hoisted(() => ({ registerSW: vi.fn(() => vi.fn()) }));
vi.mock('virtual:pwa-register', () => ({ registerSW }));

import {
  applyUpdate,
  initPWAUpdate,
  subscribeUpdateAvailable,
} from '../app/global/lib/pwaUpdate';

beforeEach(() => {
  registerSW.mockClear();
});

describe('pwaUpdate', () => {
  it('registers the service worker with prompt semantics', () => {
    initPWAUpdate();
    expect(registerSW).toHaveBeenCalledTimes(1);
    const opts = registerSW.mock.calls[0][0];
    expect(opts.immediate).toBe(true);
    // onNeedRefresh is the hook that makes a prompt possible; with
    // registerType 'autoUpdate' this callback never fires.
    expect(typeof opts.onNeedRefresh).toBe('function');
    expect(typeof opts.onOfflineReady).toBe('function');
    expect(typeof opts.onRegisterError).toBe('function');
  });

  it('notifies subscribers when a new build is waiting', () => {
    let onNeedRefresh;
    registerSW.mockImplementation((opts) => {
      onNeedRefresh = opts.onNeedRefresh;
      return vi.fn();
    });

    initPWAUpdate();
    const listener = vi.fn();
    const unsubscribe = subscribeUpdateAvailable(listener);

    onNeedRefresh();
    expect(listener).toHaveBeenCalledWith(true);

    unsubscribe();
    onNeedRefresh();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('offline-ready surfaces through the listener', () => {
    let onOfflineReady;
    registerSW.mockImplementation((opts) => {
      onOfflineReady = opts.onOfflineReady;
      return vi.fn();
    });

    initPWAUpdate();
    const listener = vi.fn();
    subscribeUpdateAvailable(listener);

    onOfflineReady();
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('applyUpdate activates the waiting worker', () => {
    const updateFn = vi.fn();
    registerSW.mockReturnValue(updateFn);

    initPWAUpdate();
    applyUpdate();
    expect(updateFn).toHaveBeenCalledWith(true);
  });

  it('applyUpdate is a no-op before registration', () => {
    expect(() => applyUpdate()).not.toThrow();
  });
});