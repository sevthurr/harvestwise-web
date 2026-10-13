import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../app/global/components/layout/TopBar';
import { AdminLayout } from '../app/global/components/layout/AdminLayout';
import { DFTCLayout } from '../app/global/components/layout/DFTCLayout';
import * as notificationsApi from '../services/api/notificationsApi';

vi.mock('../app/global/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'USR-001', username: 'testuser', email: 'test@harvestwise.test', role: { role_name: 'Farmer' } },
    logout: vi.fn(),
  }),
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


const queryClient = new QueryClient();

function renderTopBar(count, onNotificationClick = vi.fn()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TopBar notificationCount={count} onNotificationClick={onNotificationClick} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}


describe('Notification Bell & Numbered Badge', () => {
  it('hides badge when unreadCount is 0 and has accessible label', () => {
    renderTopBar(0);


    const bell = screen.getByRole('button', { name: 'Notifications' });
    expect(bell).toBeInTheDocument();
    expect(bell.getAttribute('aria-label')).toBe('Notifications');
    // No number badge rendered
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows exact count 1 and accessible label', () => {
    renderTopBar(1);

    const bell = screen.getByRole('button', { name: 'Notifications, 1 unread' });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows exact count 9 and accessible label', () => {
    renderTopBar(9);

    const bell = screen.getByRole('button', { name: 'Notifications, 9 unread' });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows 9+ for 10 unread and accessible label with exact count', () => {
    renderTopBar(10);

    const bell = screen.getByRole('button', { name: 'Notifications, 10 unread' });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('shows 9+ for 25 unread and accessible label with exact count', () => {
    renderTopBar(25);

    const bell = screen.getByRole('button', { name: 'Notifications, 25 unread' });
    expect(bell).toBeInTheDocument();
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('bell click calls onNotificationClick without mutating count directly', () => {
    const handleClick = vi.fn();
    const { rerender } = renderTopBar(5, handleClick);

    const bell = screen.getByRole('button', { name: 'Notifications, 5 unread' });
    fireEvent.click(bell);
    expect(handleClick).toHaveBeenCalledTimes(1);

    // Count is not cleared by click
    rerender(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TopBar notificationCount={5} onNotificationClick={handleClick} />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('applies active styling and aria-current="page" when on notifications route', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/farmer/notifications']}>
          <TopBar notificationCount={3} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const bell = screen.getByRole('button', { name: 'Notifications, 3 unread' });
    expect(bell).toHaveAttribute('aria-current', 'page');
    expect(bell.className).toContain('bg-[var(--hw-green-50)]');
    expect(bell.className).toContain('text-[var(--hw-green-700)]');
  });

  it('does not apply active styling when not on notifications route', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/farmer/dashboard']}>
          <TopBar notificationCount={3} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const bell = screen.getByRole('button', { name: 'Notifications, 3 unread' });
    expect(bell).not.toHaveAttribute('aria-current');
    expect(bell.className).not.toContain('bg-[var(--hw-green-50)]');
  });

  it('renders unread badge and label correctly in AdminLayout', async () => {
    vi.spyOn(notificationsApi, 'getUnreadCount').mockResolvedValueOnce({ unread_count: 8 });
    const localQC = new QueryClient();

    render(
      <QueryClientProvider client={localQC}>
        <MemoryRouter initialEntries={['/admin']}>
          <AdminLayout />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const bell = screen.getByRole('button', { name: 'Notifications, 8 unread' });
      expect(bell).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('renders unread badge and label correctly in DFTCLayout', async () => {
    vi.spyOn(notificationsApi, 'getUnreadCount').mockResolvedValueOnce({ unread_count: 4 });
    const localQC = new QueryClient();

    render(
      <QueryClientProvider client={localQC}>
        <MemoryRouter initialEntries={['/dftc']}>
          <DFTCLayout />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      const bell = screen.getByRole('button', { name: 'Notifications, 4 unread' });
      expect(bell).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });
  });
});
