/**
 * farmerMyActivities.test.jsx
 *
 * Covers the simplified farm-diary "My Activities" page.
 * AuditLogsView is NOT used by the farmer page any more, so none of the
 * admin-table internals (Log ID column, Action category select, actor filter)
 * should appear here.
 *
 * Only the global api transport is mocked, so the /farmer/activity URL built
 * by farmerApi is still exercised.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyActivities from '../app/farmer/pages/MyActivities';
import {
  formatFarmerActionLabel,
  FARMER_ACTION_LABELS,
} from '../app/farmer/utils/activityActionLabels';

// Language is pinned to English so assertions match the English copy the
// component renders; the Cebuano default would produce untranslated strings.
vi.mock('../app/global/contexts/LanguageContext', async () => {
  const { t, formatDate } = await import('../app/global/i18n');
  return {
    useLanguage: () => ({
      t: (key, params, fallback) => {
        const res = t(key, params, 'en');
        return res === key && fallback ? fallback : res;
      },
      formatDate: (value, options) => formatDate(value, options, 'en'),
      langCode: 'en',
      effectiveLanguage: 'en',
    }),
    LanguageProvider: ({ children }) => children,
  };
});

vi.mock('../app/global/api', () => ({
  apiGet: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'LOG-0001',
        actor_name: 'Juan Dela Cruz',
        action: 'user.profile_updated',
        details: 'Updated profile: first_name',
        ip_address: '127.0.0.1',
        created_at: '2026-11-05T08:00:00Z',
      },
    ],
    total: 1,
    page: 1,
    page_size: 30,
  }),
  apiPost: vi.fn().mockResolvedValue({ ok: true }),
  parseResponse: vi.fn((data) => data),
}));

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyActivities />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MyActivities — simplified feed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('My Activities')).toBeInTheDocument();
  });

  it('renders the friendly action label, not the raw code', async () => {
    renderPage();

    await waitFor(() => {
      // The friendly label for user.profile_updated should be visible
      expect(screen.getByText('Updated your profile')).toBeInTheDocument();
    });

    // Raw action code must NOT be visible as text (it may exist as a title attr)
    expect(screen.queryByText('user.profile_updated')).toBeNull();
  });

  it('renders API timestamps in Manila time', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Updated your profile')).toBeInTheDocument();
    });

    // 08:00 UTC is 4:00 PM in Asia/Manila.
    expect(screen.getByText('4:00 PM')).toBeInTheDocument();
  });

  it('hides technical fields — Log ID, IP address, actor name are not visible', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Updated your profile')).toBeInTheDocument();
    });

    // Log ID should not appear as visible text
    expect(screen.queryByText('LOG-0001')).toBeNull();
    // IP address should not appear
    expect(screen.queryByText('127.0.0.1')).toBeNull();
    // Actor name should not appear (it is the farmer themselves)
    expect(screen.queryByText('Juan Dela Cruz')).toBeNull();
  });

  it('shows a single Filter button, not an Action category select', async () => {
    renderPage();

    // The simplified Filter button should be present
    expect(screen.getByRole('button', { name: /Filter activities/i })).toBeInTheDocument();

    // The admin-style Action category select must NOT be present
    expect(screen.queryByLabelText('Action category')).toBeNull();
    // Actor search input from AuditLogsView must NOT be present
    expect(screen.queryByPlaceholderText(/Search actor name/i)).toBeNull();
  });

  it('shows a secondary Export PDF button', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Export PDF/i })).toBeInTheDocument();
  });
});

describe('formatFarmerActionLabel', () => {
  it('maps known codes to plain sentences', () => {
    expect(formatFarmerActionLabel('auth.login')).toBe('Logged in');
    expect(formatFarmerActionLabel('farmer.crop_plan_created')).toBe('Created a crop plan');
    expect(formatFarmerActionLabel('export.my_activities_pdf')).toBe('Exported your activity history');
    // Every mapped label is non-empty so no card renders blank.
    for (const label of Object.values(FARMER_ACTION_LABELS)) {
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });

  it('falls back to a sentence-cased last segment for unmapped codes', () => {
    expect(formatFarmerActionLabel('farmer.some_new_action')).toBe('Some new action');
    expect(formatFarmerActionLabel('import.completed')).toBe('Completed');
    expect(formatFarmerActionLabel('')).toBe(' ');
    // Prototype keys must not leak an object into the table.
    expect(formatFarmerActionLabel('constructor')).toBe('Constructor');
  });
});
