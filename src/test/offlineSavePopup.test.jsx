/**
 * Offline seeding is represented by AuthProvider's cache status. The app shell
 * surfaces that status in the top-right sync control instead of blocking the
 * page with a modal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../app/global/contexts/AuthContext';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  storeTokens: vi.fn(),
  clearTokens: vi.fn(),
  markSessionActive: vi.fn(),
  completeLegacyTokenMigration: vi.fn(),
  parseResponse: vi.fn((value) => value),
  loadFarmerOfflineData: vi.fn(),
  clearQueryPersistedCache: vi.fn(async () => {}),
}));

vi.mock('../app/global/api', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  clearTokens: mocks.clearTokens,
  completeLegacyTokenMigration: mocks.completeLegacyTokenMigration,
  markSessionActive: mocks.markSessionActive,
  parseResponse: mocks.parseResponse,
  storeTokens: mocks.storeTokens,
}));

vi.mock('../app/global/hooks/useFarmerPrefetch', () => ({
  loadFarmerOfflineData: mocks.loadFarmerOfflineData,
  hasOfflineSeedMarker: () => true,
  getOfflineSeedSavedAt: () => null,
}));

vi.mock('../app/global/lib/queryClient', () => ({
  queryClient: {},
  clearQueryPersistedCache: mocks.clearQueryPersistedCache,
}));

vi.mock('../app/global/lib/pwaUpdate', () => ({
  requestPersistentStorage: vi.fn(async () => {}),
}));

// Keep the assertions on the English fallback, independent of the stored
// language preference in jsdom.
vi.mock('../app/global/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (_key, _params, fallback) => fallback }),
}));

const FARMER = { id: 'u-1', role: { role_name: 'Farmer' } };

function AuthProbe() {
  const { loading, offlineCacheStatus, offlineSaveOutcome, login } = useAuth();
  return (
    <div>
      <span data-testid="auth-loading">{String(loading)}</span>
      <span data-testid="cache-status">{offlineCacheStatus}</span>
      <span data-testid="save-outcome">{offlineSaveOutcome}</span>
      <button type="button" onClick={() => login({})}>log in</button>
    </div>
  );
}

beforeEach(() => {
  // mockClear() leaves queued `mock*Once` implementations behind, which bled
  // a deferred seed from one test into the next. Reset them all.
  mocks.apiGet.mockReset().mockResolvedValue(FARMER);
  mocks.apiPost.mockReset().mockResolvedValue({});
  mocks.completeLegacyTokenMigration.mockReset().mockResolvedValue(undefined);
  mocks.parseResponse.mockReset().mockImplementation((value) => value);
  mocks.storeTokens.mockReset();
  mocks.clearTokens.mockReset();
  mocks.markSessionActive.mockReset();
  mocks.loadFarmerOfflineData.mockReset().mockResolvedValue({ saved: true, savedAt: 1 });
  mocks.clearQueryPersistedCache.mockReset().mockResolvedValue(undefined);
});

describe('offline cache status', () => {
  it('reports preparing during first-open seed, then ready when it completes', async () => {
    let finishSeed;
    mocks.loadFarmerOfflineData.mockImplementation(
      () => new Promise((resolve) => { finishSeed = resolve; })
    );

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledWith({}, { force: false });
    expect(screen.getByTestId('cache-status')).toHaveTextContent('preparing');

    await act(async () => { finishSeed({ saved: true, savedAt: 1 }); });

    expect(screen.getByTestId('cache-status')).toHaveTextContent('ready');
  });

  it('shows a short error message when the first-open seed fails', async () => {
    mocks.loadFarmerOfflineData.mockRejectedValueOnce(new Error('offline bundle failed'));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    expect(screen.getByTestId('cache-status')).toHaveTextContent('error');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('reports reconnect seeding through cache status without rendering a modal', async () => {
    let finishReconnectSeed;
    mocks.loadFarmerOfflineData
      .mockResolvedValueOnce({ saved: true, savedAt: 1 }) // session restore on mount
      .mockImplementationOnce(() => new Promise((resolve) => { finishReconnectSeed = resolve; }));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledTimes(1);
    mocks.loadFarmerOfflineData.mockClear();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledTimes(1);
    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledWith({}, { force: false });
    expect(screen.getByTestId('cache-status')).toHaveTextContent('preparing');

    await act(async () => { finishReconnectSeed(); });
    expect(screen.getByTestId('cache-status')).toHaveTextContent('ready');
  });

  it('reports unchanged when reconnect seeding is a dedupe no-op', async () => {
    let finishReconnectSeed;
    mocks.loadFarmerOfflineData
      .mockResolvedValueOnce({ saved: true, savedAt: 1 }) // session restore on mount
      .mockImplementationOnce(() => new Promise((resolve) => { finishReconnectSeed = resolve; }));

    render(<AuthProvider><AuthProbe /></AuthProvider>);

    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledTimes(1);
    mocks.loadFarmerOfflineData.mockClear();

    await act(async () => {
      window.dispatchEvent(new Event('online'));
      await Promise.resolve();
    });

    expect(screen.getByTestId('save-outcome')).toHaveTextContent('saving');

    await act(async () => { finishReconnectSeed({ saved: false, savedAt: 1 }); });

    expect(screen.getByTestId('cache-status')).toHaveTextContent('ready');
    expect(screen.getByTestId('save-outcome')).toHaveTextContent('unchanged');
  });

  it('shows the popup on a fresh farmer login', async () => {
    let finishSeed;
    mocks.apiGet
      .mockResolvedValueOnce({ id: 'admin-1', role: { role_name: 'Admin' } }) // restore: no seed
      .mockResolvedValueOnce(FARMER); // login
    mocks.loadFarmerOfflineData.mockImplementation(
      () => new Promise((resolve) => { finishSeed = resolve; })
    );

    render(<AuthProvider><AuthProbe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('auth-loading')).toHaveTextContent('false'));
    expect(mocks.loadFarmerOfflineData).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'log in' }));

    expect(mocks.loadFarmerOfflineData).toHaveBeenCalledWith({}, { force: true });
    expect(screen.getByTestId('cache-status')).toHaveTextContent('preparing');

    await act(async () => { finishSeed(); });
    expect(screen.getByTestId('cache-status')).toHaveTextContent('ready');
  });
});
