import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../app/global/components/layout/TopBar';

const authState = vi.hoisted(() => ({
  user: { first_name: 'Juan', last_name: 'Dela Cruz', role: { role_name: 'Farmer' } },
  logout: vi.fn(),
  offlineCacheStatus: 'ready',
  refreshUser: vi.fn(async () => {}),
  patchUser: vi.fn(async () => {}),
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

vi.mock('../services/api/notificationsApi', () => ({
  getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 0 }),
  subscribeNotificationStream: vi.fn(() => () => {}),
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

function renderTopBar(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TopBar notificationCount={0} onNotificationClick={vi.fn()} {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TopBar Offline Data Status & Sync handling', () => {
  beforeEach(() => {
    authState.offlineCacheStatus = 'ready';
  });

  it('does not render an isolated info (i) tooltip icon in the topbar', () => {
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });
    expect(syncButton).toBeInTheDocument();
  });

  it('opens the offline data popover when single-clicked after timer', async () => {
    vi.useFakeTimers();
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(syncButton);
    act(() => {
      vi.advanceTimersByTime(260);
    });

    const dialog = screen.getByRole('dialog', { name: /Offline Data|Kahimtang sa Offline Data/i });
    expect(dialog).toBeInTheDocument();
    // Subtext is directly visible under the title
    expect(
      screen.getByText(/naka-save sa imong device|saved on this device/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync Now|I-sync Karon/i })).toBeInTheDocument();
    // Pagdumala sa Offline Data is removed
    expect(screen.queryByText(/Manage Offline Data|Pagdumala sa Offline Data/i)).not.toBeInTheDocument();
    // Boxed card title is removed
    expect(screen.queryByText('Andam na ang offline data')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('triggers sync when double clicked', () => {
    vi.useFakeTimers();
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });

    // Double click: two clicks within 250ms
    fireEvent.click(syncButton);
    fireEvent.click(syncButton);

    // Popover should not stay open
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it('closes the popover when pressing Escape', () => {
    vi.useFakeTimers();
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });
    fireEvent.click(syncButton);
    act(() => {
      vi.advanceTimersByTime(260);
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows preparing description when offlineCacheStatus is preparing', () => {
    vi.useFakeTimers();
    authState.offlineCacheStatus = 'preparing';
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });
    fireEvent.click(syncButton);
    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText(/Gidownload ug gi-save|Saving latest/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('shows error description when offlineCacheStatus is error', () => {
    vi.useFakeTimers();
    authState.offlineCacheStatus = 'error';
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: /Offline Data|Kahimtang sa Offline Data/i });
    fireEvent.click(syncButton);
    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText(/Wala makompleto|Some offline data/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});
