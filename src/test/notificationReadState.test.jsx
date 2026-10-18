import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { renderHook, act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useNotificationReadState } from '../app/global/hooks/useNotificationReadState';
import { NotificationStreamProvider, useNotificationEvent } from '../app/global/contexts/NotificationStreamContext';
import { openEventStream } from '../app/global/api';
import { AdminLayout } from '../app/global/components/layout/AdminLayout';
import { DFTCLayout } from '../app/global/components/layout/DFTCLayout';
import AdminNotifications from '../app/admin/pages/AdminNotifications';
import DFTCNotifications from '../app/dftc/pages/DFTCNotifications';
import FarmerNotifications from '../app/farmer/pages/Notifications';
import {
  ALL_CATEGORIES,
  URGENCY_LEVELS,
  getCategoryConfig,
  getCategoryUrgency,
  getCategoryActionLabel,
  getCategoryReason,
} from '../app/global/utils/notificationCategories';
import * as notificationsApi from '../services/api/notificationsApi';

// Mutable so the "no signed-in user" case can be exercised without re-mocking.
let currentUser = { id: 'USR-1' };

// Partial mock: the layouts' topbar avatars read resolveMediaUrl through this
// module, and a full replacement would strip it out and fail the render.
vi.mock('../app/global/api', async (importOriginal) => ({
  ...(await importOriginal()),
  openEventStream: vi.fn(() => ({ close: vi.fn() })),
  buildUrl: (p) => p,
  authHeaders: () => ({}),
}));

vi.mock('../app/global/contexts/AuthContext', () => ({
  useAuth: () => ({ user: currentUser, logout: vi.fn() }),
  useOptionalAuth: () => ({ user: currentUser }),
}));

vi.mock('../app/global/contexts/BackgroundProcessContext', () => ({
  useBackgroundProcess: () => ({ processState: {} }),
}));

vi.mock('../services/api/notificationsApi', () => ({
  getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
  listNotifications: vi.fn().mockResolvedValue({ items: [], unread_count: 0 }),
  markRead: vi.fn().mockResolvedValue({}),
  markAllRead: vi.fn().mockResolvedValue({ updated: 0 }),
}));

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

beforeEach(() => {
  localStorage.clear();
  currentUser = { id: 'USR-1' };
  vi.clearAllMocks();
});

describe('A. Offline-tolerant read state', () => {
  it('reports read when the server says so', () => {
    const { result } = renderHook(() => useNotificationReadState('USR-1'));
    expect(result.current.isRead({ id: 'N1', read_at: '2026-01-01T00:00:00Z' })).toBe(true);
    expect(result.current.isRead({ id: 'N1', read: true })).toBe(true);
  });

  it('reports unread when neither server nor local state says read', () => {
    const { result } = renderHook(() => useNotificationReadState('USR-1'));
    expect(result.current.isRead({ id: 'N1', read_at: null })).toBe(false);
  });

  it('keeps a notification read locally after marking, with no server round trip', () => {
    const { result } = renderHook(() => useNotificationReadState('USR-1'));
    act(() => result.current.markReadLocally('N7'));
    // Server state still says unread — the local union must cover it.
    expect(result.current.isRead({ id: 'N7', read_at: null })).toBe(true);
  });

  it('marks many ids at once for mark-all-as-read', () => {
    const { result } = renderHook(() => useNotificationReadState('USR-1'));
    act(() => result.current.markReadLocally(['A', 'B', 'C']));
    expect(result.current.isRead({ id: 'B' })).toBe(true);
    expect(result.current.isRead({ id: 'C' })).toBe(true);
  });

  it('survives a reload for the same user (persisted per user)', () => {
    const first = renderHook(() => useNotificationReadState('USR-1'));
    act(() => first.result.current.markReadLocally('N9'));
    first.unmount();

    const second = renderHook(() => useNotificationReadState('USR-1'));
    expect(second.result.current.isRead({ id: 'N9' })).toBe(true);
  });

  it('does not leak read state across users', () => {
    const a = renderHook(() => useNotificationReadState('USR-1'));
    act(() => a.result.current.markReadLocally('N1'));
    a.unmount();

    const b = renderHook(() => useNotificationReadState('USR-2'));
    expect(b.result.current.isRead({ id: 'N1' })).toBe(false);
  });

  it('is a no-op for null/undefined ids and never throws', () => {
    const { result } = renderHook(() => useNotificationReadState('USR-1'));
    act(() => result.current.markReadLocally(null, undefined, []));
    expect(result.current.readIds.size).toBe(0);
  });
});

describe('B. Shared notification stream', () => {
  function Harness({ onReady }) {
    useNotificationEvent('NOTIFICATION_CREATED', onReady);
    return null;
  }

  it('opens exactly one stream for many subscribers, not one per subscriber', () => {
    render(
      <NotificationStreamProvider>
        <Harness onReady={() => {}} />
        <Harness onReady={() => {}} />
        <Harness onReady={() => {}} />
      </NotificationStreamProvider>,
    );
    expect(openEventStream).toHaveBeenCalledTimes(1);
    expect(openEventStream).toHaveBeenCalledWith('/notifications/stream', expect.any(Object));
  });

  it('fans one event out to every subscriber', () => {
    const a = vi.fn();
    const b = vi.fn();
    render(
      <NotificationStreamProvider>
        <Harness onReady={a} />
        <Harness onReady={b} />
      </NotificationStreamProvider>,
    );

    const handlers = openEventStream.mock.calls[0][1];
    handlers['*']({ category: 'price_change' }, 'NOTIFICATION_CREATED');

    expect(a).toHaveBeenCalledWith({ category: 'price_change' });
    expect(b).toHaveBeenCalledWith({ category: 'price_change' });
  });

  it('also dispatches on the payload type for events on the shared data channel', () => {
    // Bulk broadcasts land on the data channel, so the SSE event name is
    // DATASET_INGESTED while the payload says it is a notification.
    const onNotification = vi.fn();
    const onIngested = vi.fn();
    function Dual() {
      useNotificationEvent('NOTIFICATION_CREATED', onNotification);
      useNotificationEvent('DATASET_INGESTED', onIngested);
      return null;
    }
    render(
      <NotificationStreamProvider>
        <Dual />
      </NotificationStreamProvider>,
    );

    const handlers = openEventStream.mock.calls[0][1];
    handlers['*']({ type: 'NOTIFICATION_CREATED', category: 'weather_alert' }, 'DATASET_INGESTED');

    expect(onNotification).toHaveBeenCalled();
    expect(onIngested).toHaveBeenCalled();
  });

  it('delivers an ingestion event to a DATASET_INGESTED subscriber only', () => {
    const onNotification = vi.fn();
    const onIngested = vi.fn();
    function Dual() {
      useNotificationEvent('NOTIFICATION_CREATED', onNotification);
      useNotificationEvent('DATASET_INGESTED', onIngested);
      return null;
    }
    render(
      <NotificationStreamProvider>
        <Dual />
      </NotificationStreamProvider>,
    );

    const handlers = openEventStream.mock.calls[0][1];
    handlers['*']({ type: 'PRICES_UPDATED', filename: 'a.parquet' }, 'DATASET_INGESTED');

    expect(onIngested).toHaveBeenCalled();
    expect(onNotification).not.toHaveBeenCalled();
  });

  it('survives a handler that throws without killing the stream or other subscribers', () => {
    const good = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    function Bad() {
      useNotificationEvent('NOTIFICATION_CREATED', () => {
        throw new Error('boom');
      });
      return null;
    }
    render(
      <NotificationStreamProvider>
        <Bad />
        <Harness onReady={good} />
      </NotificationStreamProvider>,
    );

    const handlers = openEventStream.mock.calls[0][1];
    expect(() => handlers['*']({ category: 'x' }, 'NOTIFICATION_CREATED')).not.toThrow();
    expect(good).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('stops delivering to a component that unmounted', () => {
    const handler = vi.fn();
    const { unmount } = render(
      <NotificationStreamProvider>
        <Harness onReady={handler} />
      </NotificationStreamProvider>,
    );
    const handlers = openEventStream.mock.calls[0][1];
    handlers['*']({ category: 'x' }, 'NOTIFICATION_CREATED');
    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    handlers['*']({ category: 'y' }, 'NOTIFICATION_CREATED');
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('closes the stream when the provider unmounts', () => {
    const close = vi.fn();
    openEventStream.mockReturnValueOnce({ close });
    const { unmount } = render(
      <NotificationStreamProvider>
        <Harness onReady={() => {}} />
      </NotificationStreamProvider>,
    );
    unmount();
    expect(close).toHaveBeenCalled();
  });

  it('does not open a stream when there is no signed-in user', () => {
    currentUser = null;
    render(
      <NotificationStreamProvider>
        <Harness onReady={() => {}} />
      </NotificationStreamProvider>,
    );
    // The endpoint rejects an unauthenticated stream anyway; opening one on
    // /login would just burn the 60/minute budget on retries.
    expect(openEventStream).not.toHaveBeenCalled();
  });

  it('opens the stream once a user is present', () => {
    render(
      <NotificationStreamProvider>
        <Harness onReady={() => {}} />
      </NotificationStreamProvider>,
    );
    expect(openEventStream).toHaveBeenCalledTimes(1);
  });

  it('no-ops instead of throwing when a component renders with no provider', () => {
    function Orphan() {
      useNotificationEvent('NOTIFICATION_CREATED', () => {});
      return <div>rendered</div>;
    }
    expect(() => render(<Orphan />)).not.toThrow();
    expect(screen.getByText('rendered')).toBeInTheDocument();
  });
});

describe('C. Real layouts ride the shared stream', () => {
  const wrap = (ui, client, path) => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <NotificationStreamProvider>{ui}</NotificationStreamProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );

  it('DFTCLayout adds no connection of its own and reacts to the shared one', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    notificationsApi.getUnreadCount.mockResolvedValue({ unread_count: 2 });

    render(wrap(<DFTCLayout />, queryClient, '/dftc'));

    await waitFor(() => expect(notificationsApi.getUnreadCount).toHaveBeenCalled());
    // Exactly one connection for the whole tree — not one for the layout too.
    expect(openEventStream).toHaveBeenCalledTimes(1);

    const before = notificationsApi.getUnreadCount.mock.calls.length;
    const handlers = openEventStream.mock.calls[0][1];
    await act(async () => {
      handlers['*']({ category: 'submission_accepted' }, 'NOTIFICATION_CREATED');
    });

    await waitFor(() =>
      expect(notificationsApi.getUnreadCount.mock.calls.length).toBeGreaterThan(before),
    );
    // Still one connection after the event — no reconnect, no extra stream.
    expect(openEventStream).toHaveBeenCalledTimes(1);
  });

  it('AdminLayout adds no connection of its own and reacts to the shared one', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    notificationsApi.getUnreadCount.mockResolvedValue({ unread_count: 6 });

    render(wrap(<AdminLayout />, queryClient, '/admin'));

    await waitFor(() => expect(notificationsApi.getUnreadCount).toHaveBeenCalled());
    expect(openEventStream).toHaveBeenCalledTimes(1);

    const before = notificationsApi.getUnreadCount.mock.calls.length;
    const handlers = openEventStream.mock.calls[0][1];
    await act(async () => {
      handlers['*']({ category: 'import_event' }, 'NOTIFICATION_CREATED');
    });

    await waitFor(() =>
      expect(notificationsApi.getUnreadCount.mock.calls.length).toBeGreaterThan(before),
    );
    expect(openEventStream).toHaveBeenCalledTimes(1);
  });
});


describe('D. Real pages receive real SSE frames', () => {
  // The mocked-API suites elsewhere prove rendering, not live updates. These
  // drive the actual page components through the actual provider and fire
  // SSE-shaped frames at the real transport, so a renamed event or an
  // unmounted provider fails here instead of shipping silently.

  const wrap = (ui) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return (
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <NotificationStreamProvider>{ui}</NotificationStreamProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  const fire = async (data, eventName) => {
    const handlers = openEventStream.mock.calls[0][1];
    await act(async () => {
      handlers['*'](data, eventName);
    });
  };

  beforeEach(() => {
    notificationsApi.listNotifications.mockResolvedValue({ items: [], unread_count: 0 });
    notificationsApi.getUnreadCount.mockResolvedValue({ unread_count: 0 });
  });

  it('AdminNotifications refetches on NOTIFICATION_CREATED', async () => {
    render(wrap(<AdminNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ category: 'import_event' }, 'NOTIFICATION_CREATED');

    await waitFor(() =>
      expect(notificationsApi.listNotifications.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('DFTCNotifications refetches on NOTIFICATION_CREATED', async () => {
    render(wrap(<DFTCNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ category: 'submission_accepted' }, 'NOTIFICATION_CREATED');

    await waitFor(() =>
      expect(notificationsApi.listNotifications.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('DFTCNotifications refetches on DATASET_INGESTED, so an upload lands without a reload', async () => {
    render(wrap(<DFTCNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ filename: 'prices.parquet' }, 'DATASET_INGESTED');

    await waitFor(() =>
      expect(notificationsApi.listNotifications.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('farmer Notifications refetches on NOTIFICATION_CREATED', async () => {
    render(wrap(<FarmerNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ category: 'price_change' }, 'NOTIFICATION_CREATED');

    await waitFor(() =>
      expect(notificationsApi.listNotifications.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('a bulk broadcast on the data channel still reaches the feeds', async () => {
    // Bulk events arrive as DATASET_INGESTED with data.type === NOTIFICATION_CREATED.
    render(wrap(<AdminNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ type: 'NOTIFICATION_CREATED', category: 'user_event' }, 'DATASET_INGESTED');

    await waitFor(() =>
      expect(notificationsApi.listNotifications.mock.calls.length).toBeGreaterThan(before),
    );
  });

  it('all three pages share one connection, not one each', async () => {
    render(
      wrap(
        <>
          <FarmerNotifications />
          <DFTCNotifications />
          <AdminNotifications />
        </>,
      ),
    );
    await waitFor(() => expect(openEventStream).toHaveBeenCalledTimes(1));
  });

  it('stops refetching after the page unmounts', async () => {
    const { unmount } = render(wrap(<DFTCNotifications />));
    await waitFor(() => expect(notificationsApi.listNotifications).toHaveBeenCalled());
    unmount();
    const before = notificationsApi.listNotifications.mock.calls.length;

    await fire({ category: 'submission_failed' }, 'NOTIFICATION_CREATED');

    expect(notificationsApi.listNotifications.mock.calls.length).toBe(before);
  });
});

describe('E. Category taxonomy is declared in one place', () => {
  it('every category the backend persists has a declared icon, urgency and DFTC action', () => {
    // These four are exactly what notifications.service.notify_dftc_submission_event
    // writes. A miss here is the silent regression the shared taxonomy prevents:
    // the category would fall back to the bell icon and the /admin/audit-logs route.
    for (const category of [
      'submission_accepted',
      'submission_failed',
      'records_need_correction',
      'upload_validation_completed',
    ]) {
      expect(getCategoryConfig(category).Icon).toBeTruthy();
      expect(getCategoryUrgency(category)).toBeTruthy();
      expect(getCategoryActionLabel(category)).toBeTruthy();
    }
  });

  it('every declared category resolves a known urgency level', () => {
    for (const category of ALL_CATEGORIES) {
      expect(Object.keys(URGENCY_LEVELS)).toContain(getCategoryUrgency(category));
    }
  });

  it('never exposes an enum name as user-facing reason copy', () => {
    for (const category of ALL_CATEGORIES) {
      const reason = getCategoryReason(category);
      if (!reason) continue;
      expect(reason.toLowerCase()).not.toContain(category.toLowerCase());
      expect(reason).not.toContain('(');
    }
  });

  it('falls back safely for a category that was never declared', () => {
    expect(getCategoryConfig('some_future_event').Icon).toBeTruthy();
    expect(getCategoryUrgency('some_future_event')).toBe('information');
    expect(getCategoryActionLabel('some_future_event')).toBeNull();
    expect(getCategoryReason('some_future_event')).toBeNull();
  });
});
