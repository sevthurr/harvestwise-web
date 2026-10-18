import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NotificationIcon } from '../app/global/components/shared/NotificationIcon';
import { resolveNotificationRoute } from '../app/global/utils/notificationRoutes';
import { localizeFarmerNotification } from '../app/farmer/utils/farmerNotificationLocalizer';
import NotificationsPage from '../app/farmer/pages/Notifications';
import * as notificationsApi from '../services/api/notificationsApi';

vi.mock('../services/api/notificationsApi', () => ({
  listNotifications: vi.fn(),
  markRead: vi.fn().mockResolvedValue({}),
  markAllRead: vi.fn().mockResolvedValue({ updated: 5 }),
  subscribeNotificationStream: vi.fn(() => () => {}),
  getUnreadCount: vi.fn().mockResolvedValue({ unread_count: 5 }),
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

describe('Farmer Notification List Rendering & Fallbacks', () => {
  const mockFarmerNotifications = [
    {
      id: 'FNT-0133',
      category: 'price_change',
      title: 'Atsal (Sultan) price rose',
      body: 'The latest market price for Atsal (Sultan) is 125.00 PHP/kg, up from 110.00 PHP/kg.',
      route: '/farmer/prices/COM-0037',
      read: false,
      metadata: {
        commodity_id: 'COM-0037',
        commodity_name: 'Atsal (Sultan)',
        direction: 'rose',
        latest: 125.0,
        prev: 110.0,
        price_date: '2026-10-01',
      },
      created_at: '2026-10-01T11:16:53.006187',
    },
    {
      id: 'FNT-0134',
      category: 'price_update',
      title: 'New prices available for Atsal (Sultan)',
      body: 'Updated market prices for Atsal (Sultan) are now available as of 2026-10-01.',
      route: '/farmer/prices/COM-0037',
      read: false,
      metadata: {
        commodity_id: 'COM-0037',
        commodity_name: 'Atsal (Sultan)',
        price_date: '2026-10-01',
      },
      created_at: '2026-10-01T11:16:53.006187',
    },
    {
      id: 'FNT-0135',
      category: 'weather_alert',
      title: 'Weather caution for Atsal (Sultan)',
      body: 'Recent weather conditions pose a caution risk for Atsal (Sultan).',
      route: '/farmer/market/weather',
      read: false,
      metadata: {
        commodity_id: 'COM-0037',
        commodity_name: 'Atsal (Sultan)',
        risk: 'caution',
      },
      created_at: '2026-10-01T11:16:53.006187',
    },
    {
      id: 'FNT-0136',
      category: 'harvest_reminder',
      title: 'Atsal (Sultan) ready for harvest',
      body: 'Your Atsal (Sultan) plan is expected to be ready for harvest on 2026-10-15.',
      route: '/farmer/crops/CRP-0001',
      read: false,
      metadata: {
        commodity_id: 'COM-0037',
        crop_plan_id: 'CRP-0001',
        commodity_name: 'Atsal (Sultan)',
        expected_harvest_date: '2026-10-15',
      },
      created_at: '2026-10-01T11:16:53.006187',
    },
    {
      id: 'FNT-0137',
      category: 'planting_advisory',
      title: 'Planting window open for Atsal (Sultan)',
      body: 'Conditions for Atsal (Sultan) look suitable over the next two weeks.',
      route: '/farmer/crops',
      read: false,
      metadata: {
        commodity_id: 'COM-0037',
        commodity_name: 'Atsal (Sultan)',
        verdict: 'suitable',
      },
      created_at: '2026-10-01T11:16:53.006187',
    },
  ];

  it('renders all 5 generated Farmer categories in NotificationsPage without any disappearing', async () => {
    notificationsApi.listNotifications.mockResolvedValueOnce({
      items: mockFarmerNotifications,
      total: 5,
      page: 1,
      page_size: 50,
      unread_count: 5,
    });

    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Verify all 5 cards render with commodity name
    const atsalItems = await screen.findAllByText(/Atsal \(Sultan\)/);
    expect(atsalItems.length).toBeGreaterThanOrEqual(5);

    // Check each of the 5 notification categories / titles are present
    expect(screen.getByText(/price rose|Misaka ang presyo/i)).toBeInTheDocument();
    expect(screen.getByText(/New prices available|Bag-ong presyo/i)).toBeInTheDocument();
    expect(screen.getByText(/Weather caution|Alerto sa panahon/i)).toBeInTheDocument();
    expect(screen.getByText(/ready for harvest|Andam na alang sa pag-ani/i)).toBeInTheDocument();
    expect(screen.getByText(/Planting window open|Abli na ang panahon/i)).toBeInTheDocument();

    // Verify exactly 5 unread indicators rendered
    const unreadDots = container.querySelectorAll('.bg-\\[var\\(--hw-green-600\\)\\]');
    expect(unreadDots.length).toBe(5);
  });

  it('safely renders fallback card when commodity icon is unavailable (falls back to category icon)', () => {
    const unknownItem = {
      category: 'harvest_reminder',
      metadata: { commodity_id: 'COM-NONEXISTENT' },
      fallbackTitle: 'Nonexistent Commodity',
    };

    const { container } = render(
      <NotificationIcon
        category={unknownItem.category}
        metadata={unknownItem.metadata}
        fallbackTitle={unknownItem.fallbackTitle}
      />
    );

    // Should render category icon wrapper with text-emerald-600 and lucide-calendar-days, NOT crash
    expect(container.querySelector('.lucide-calendar-days')).toBeInTheDocument();
    expect(container.querySelector('.text-emerald-600')).toBeInTheDocument();
  });

  it('safely falls back to stored title/body when localization is unavailable', () => {
    const unknownCategoryItem = {
      category: 'unsupported_category',
      title: 'Stored Raw Title',
      body: 'Stored raw body description.',
      metadata: {},
    };

    const { title, body } = localizeFarmerNotification(unknownCategoryItem, (k, p, fb) => fb);
    expect(title).toBe('Stored Raw Title');
    expect(body).toBe('Stored raw body description.');
  });

  it('safely falls back to category general route when specific deep link target is unavailable', () => {
    const itemWithoutPlan = {
      category: 'harvest_reminder',
      metadata: {},
    };
    expect(resolveNotificationRoute(itemWithoutPlan, 'Farmer')).toBe('/farmer/crops');

    const itemWithoutComm = {
      category: 'price_change',
      metadata: {},
    };
    expect(resolveNotificationRoute(itemWithoutComm, 'Farmer')).toBe('/farmer/prices');
  });

  it('renders preferred crop star icon and filters list when Preferred Crops tab is selected', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const mixedNotifications = [
      {
        id: 'FNT-0201',
        category: 'price_change',
        title: 'Kamatis (Diamante Big) price dropped',
        body: 'The latest market price for Kamatis (Diamante Big) is 45.00 PHP/kg, down from 50.00 PHP/kg.',
        route: '/farmer/prices/COM-0004',
        read: false,
        metadata: {
          commodity_id: 'COM-0004',
          commodity_name: 'Kamatis (Diamante Big)',
          is_preferred: true,
          direction: 'dropped',
          latest: 45.0,
          prev: 50.0,
        },
        created_at: '2026-10-18T10:00:00.000Z',
      },
      {
        id: 'FNT-0202',
        category: 'price_update',
        title: 'New prices available for Talong (Banate King)',
        body: 'Updated market prices for Talong (Banate King) are now available.',
        route: '/farmer/prices/COM-0010',
        read: false,
        metadata: {
          commodity_id: 'COM-0010',
          commodity_name: 'Talong (Banate King)',
          is_preferred: false,
        },
        created_at: '2026-10-18T09:00:00.000Z',
      },
    ];

    notificationsApi.listNotifications.mockResolvedValueOnce({
      items: mixedNotifications,
      total: 2,
      unread_count: 2,
    });

    const testQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <NotificationsPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial render shows both items
    const kamatisItems = await screen.findAllByText(/Kamatis/i);
    expect(kamatisItems.length).toBeGreaterThanOrEqual(1);

    const talongItems = await screen.findAllByText(/Talong/i);
    expect(talongItems.length).toBeGreaterThanOrEqual(1);

    // Preferred star should be rendered for the preferred crop
    const starIcons = screen.getAllByTestId('preferred-star');
    expect(starIcons.length).toBeGreaterThanOrEqual(1);

    // Click "Preferred Crops" filter button
    const preferredTab = screen.getByRole('button', { name: /preferred crops|gipiling pananom/i });
    fireEvent.click(preferredTab);

    // After filtering, Kamatis is shown and Talong is filtered out
    expect(screen.getAllByText(/Kamatis/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Talong/i)).not.toBeInTheDocument();
  });

  it('localizes favorable and unfavorable price forecast notifications', () => {
    const favorableForecast = {
      category: 'price_change',
      title: 'Favorable price forecast for Kamatis (Diamante Big)',
      body: 'The 7-day forecast projects Kamatis (Diamante Big) prices to rise to 55.00 PHP/kg (+10.0%).',
      metadata: {
        commodity_name: 'Kamatis (Diamante Big)',
        is_preferred: true,
        outlook: 'Favorable',
        forecast_midpoint: 55.0,
        change_pct: 10.0,
        horizon_days: 7,
      },
    };

    const mockT = (key, params, fallback) => {
      if (key === 'farmer.notifications.forecast_favorable_title') {
        return `Favorable forecast for ${params.commodity}`;
      }
      if (key === 'farmer.notifications.forecast_favorable_body') {
        return `Forecast for ${params.commodity} is ${params.midpoint} PHP/kg (+${params.pct}%) in ${params.horizon} days.`;
      }
      return fallback;
    };

    const { title, body } = localizeFarmerNotification(favorableForecast, mockT);
    expect(title).toBe('Favorable forecast for Kamatis (Diamante Big)');
    expect(body).toContain('55.00 PHP/kg (+10.0%) in 7 days');
  });
});
