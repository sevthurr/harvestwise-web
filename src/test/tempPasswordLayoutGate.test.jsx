/**
 * Layout gate for the forced temporary-password change.
 *
 * The block replaces the workspace content rather than overlaying it, so these
 * tests pin the two properties that make an un-dismissable gate safe:
 *
 *   1. While user.must_change_password is true, the routed page must not render
 *      and the panel must — for both the Farmer and DFTC layouts.
 *   2. Once the rotation POST succeeds the gate clears, even if the follow-up
 *      /auth/me fails. change_password() deletes every session before it
 *      returns, so that call really can 401 and null out `user`; deriving the
 *      gate from the flag alone would strand the user with no way forward.
 */

import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '../app/global/components/layout/Layout';
import { DFTCLayout } from '../app/global/components/layout/DFTCLayout';

// Mutable so each test can swap the signed-in user's flag.
const authState = vi.hoisted(() => ({
  user: {
    first_name: 'Ana',
    last_name: 'Reyes',
    role: { role_name: 'Farmer' },
    must_change_password: false,
  },
  logout: vi.fn(),
  refreshUser: vi.fn(async () => {}),
}));

vi.mock('../app/global/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('../app/global/contexts/BackgroundProcessContext', () => ({
  useBackgroundProcess: () => ({
    processState: {},
    triggerResync: vi.fn(),
  }),
}));

vi.mock('../app/global/components/pwa/PwaInstallPrompt', () => ({
  PwaInstallPrompt: () => null,
}));

vi.mock('../services/api/notificationsApi', () => ({
  getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
  subscribeNotificationStream: vi.fn(() => () => {}),
}));

vi.mock('../app/global/hooks/useFarmerPrefetch', () => ({
  useFarmerPrefetch: () => {},
}));

// The default language context resolves to Cebuano. Pinned to English so the
// label queries below match, and so a pass says something about the English
// fallbacks rather than about a translation this test never checked.
vi.mock('../app/global/contexts/LanguageContext', async () => {
  const { t } = await import('../app/global/i18n');
  return {
    useLanguage: () => ({
      t: (key, params, fallback) => {
        const res = t(key, params, 'en');
        return res === key && fallback ? fallback : res;
      },
    }),
  };
});

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderWorkspace(path, pageElement, layout = Layout) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {/* `element` wants an element, not the component function. */}
          <Route element={React.createElement(layout)}>
            <Route path={path} element={pageElement} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const OutletStub = () => <p>outlet-page-content</p>;

function setUser({ roleName, mustChange }) {
  authState.user = {
    first_name: 'Ana',
    last_name: 'Reyes',
    role: { role_name: roleName },
    must_change_password: mustChange,
  };
}

describe('temporary-password layout gate', () => {
  beforeEach(() => {
    authState.refreshUser = vi.fn(async () => {});
    window.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Password updated successfully' }),
    }));
  });

  describe.each([
    ['Farmer', '/farmer', Layout],
    ['DFTC', '/dftc', DFTCLayout],
  ])('%s workspace', (roleName, path, layout) => {
    it('renders the panel and hides the routed page while pending', () => {
      setUser({ roleName, mustChange: true });
      renderWorkspace(path, <OutletStub />, layout);

      expect(
        screen.getByRole('heading', { name: /temporary password/i })
      ).toBeInTheDocument();
      expect(screen.queryByText('outlet-page-content')).not.toBeInTheDocument();
    });

    it('offers no dismiss control', () => {
      setUser({ roleName, mustChange: true });
      renderWorkspace(path, <OutletStub />, layout);

      expect(screen.queryByRole('button', { name: 'Later' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();
    });

    it('renders the routed page normally when the flag is clear', () => {
      setUser({ roleName, mustChange: false });
      renderWorkspace(path, <OutletStub />, layout);

      expect(screen.getByText('outlet-page-content')).toBeInTheDocument();
      expect(screen.queryByText(/temporary password/i)).not.toBeInTheDocument();
    });

    it('reveals the routed page after rotation, even when the session is revoked', async () => {
      setUser({ roleName, mustChange: true });
      // change_password() deletes every session before it returns, so the
      // /auth/me that follows can 401. AuthContext then clears tokens and sets
      // user to null — reproduced here, because that is the exact state the
      // gate has to survive. Without the local `rotated` flag the panel would
      // never go away and the user would be stuck.
      authState.refreshUser = vi.fn(async () => {
        authState.user = null;
        throw new Error('Session expired');
      });

      renderWorkspace(path, <OutletStub />, layout);
      expect(screen.queryByText('outlet-page-content')).not.toBeInTheDocument();

      const { default: userEvent } = await import('@testing-library/user-event');
      const user = userEvent.setup();
      await user.type(screen.getByLabelText('Current password'), 'Temp!pass123');
      await user.type(screen.getByLabelText('New password'), 'New!Pass123');
      await user.type(screen.getByLabelText('Confirm new password'), 'New!Pass123');
      await user.click(screen.getByRole('button', { name: 'Update password' }));

      await waitFor(() =>
        expect(screen.getByText('outlet-page-content')).toBeInTheDocument()
      );
      expect(screen.queryByText(/temporary password/i)).not.toBeInTheDocument();
      expect(authState.refreshUser).toHaveBeenCalled();
    });
  });
});