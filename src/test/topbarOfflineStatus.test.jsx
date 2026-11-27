import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TopBar } from '../app/global/components/layout/TopBar';
import { t as translate } from '../app/global/i18n';
import { formatManilaTime } from '../app/global/utils/apiTransforms';

const authState = vi.hoisted(() => ({
  user: { first_name: 'Juan', last_name: 'Dela Cruz', role: { role_name: 'Farmer' } },
  logout: vi.fn(),
  offlineCacheStatus: 'ready',
  offlineSaveOutcome: 'saved',
  offlineSavedAt: null,
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

// TopBar resolves copy through the default Cebuano language context in this
// test, so each assertion accepts the shipped Cebuano and English values.
const TITLE = /Saved data|Naka-save nga data/i;
const READY_DESC = /Prices, forecasts and your crop plans are saved on this phone\.|Ang mga presyo, forecast, ug plano sa tanom naka-save sa imong phone\./i;
const SAVED = /^Saved$|Naka-save/i;
// Mirror useLanguage: read the same dictionary the component reads, falling
// back to the exact EN text when a key has not landed in the locales yet.
const expectedCopy = (key, params, fallback) => {
  const translated = translate(key, params, 'ceb');
  return translated === key ? fallback : translated;
};
const SAVING = expectedCopy('farmer.offline_pill_saving', {}, 'Saving');
const NOT_SAVED = expectedCopy('farmer.offline_pill_not_saved', {}, 'Not saved');
const PREPARING = /Getting and saving data for offline use\.|Nagkuha ug nagsave sa data para magamit bisan walay internet\./i;
const PREPARING_DESC = /Getting prices and crop plans|Nagkuha sa mga presyo ug plano sa tanom/i;
const ERROR = /Data not saved\. Try again\.|Wala ma-save ang bag-ong data\. Sulayi pag-usab\./i;
const ERROR_DESC = /New data was not saved\.|Wala ma-save ang bag-ong data\./i;

describe('TopBar Offline Data Status & Sync handling', () => {
  beforeEach(() => {
    authState.offlineCacheStatus = 'ready';
    authState.offlineSaveOutcome = 'saved';
    authState.offlineSavedAt = null;
  });

  it('does not render an isolated info (i) tooltip icon in the topbar', () => {
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    expect(syncButton).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Info$/i })).not.toBeInTheDocument();
  });

  it('opens the offline data popover when single-clicked', () => {
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(syncButton);

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toBeInTheDocument();
    expect(syncButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Sync Now|I-sync Karon/i })).toBeInTheDocument();
    // Pagdumala sa Offline Data is removed
    expect(screen.queryByText(/Manage Offline Data|Pagdumala sa Offline Data/i)).not.toBeInTheDocument();
    // Boxed card title is removed
    expect(screen.queryByText('Andam na ang offline data')).not.toBeInTheDocument();
  });

  it('opens the dialog immediately on one tap with plain ready copy and Sync Now', () => {
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    expect(syncButton).toHaveTextContent(SAVED);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(syncButton);

    expect(screen.getByRole('dialog', { name: TITLE })).toBeInTheDocument();
    expect(screen.getByText(READY_DESC)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sync Now|I-sync Karon/i })).toBeInTheDocument();
  });

  it('shows the unchanged-save copy with the saved time when the seed was deduped', () => {
    authState.offlineCacheStatus = 'ready';
    authState.offlineSaveOutcome = 'unchanged';
    authState.offlineSavedAt = '2026-11-26T04:30:00Z';
    const savedTime = formatManilaTime(new Date(authState.offlineSavedAt));
    const unchangedCopy = expectedCopy(
      'farmer.offline_desc_unchanged',
      { time: savedTime },
      'Already saved at {time}. Nothing new was saved.'
    );

    renderTopBar();
    fireEvent.click(screen.getByRole('button', { name: TITLE }));

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toHaveTextContent(unchangedCopy);
    expect(dialog).toHaveTextContent(savedTime);
    expect(dialog).not.toHaveTextContent(READY_DESC);
  });

  it('closes the popover when pressing Escape', () => {
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    fireEvent.click(syncButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an inline banner and preparing description when offlineCacheStatus is preparing', () => {
    authState.offlineCacheStatus = 'preparing';
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    expect(syncButton).toHaveTextContent(SAVING);
    expect(screen.getByRole('status')).toHaveTextContent(PREPARING_DESC);

    fireEvent.click(syncButton);

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toHaveTextContent(PREPARING_DESC);
  });

  it('shows error description when offlineCacheStatus is error', () => {
    authState.offlineCacheStatus = 'error';
    renderTopBar();
    const syncButton = screen.getByRole('button', { name: TITLE });
    expect(syncButton).toHaveTextContent(NOT_SAVED);
    fireEvent.click(syncButton);

    const dialog = screen.getByRole('dialog', { name: TITLE });
    expect(dialog).toHaveTextContent(ERROR_DESC);
  });
});
