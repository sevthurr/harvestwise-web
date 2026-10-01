import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { NotificationIcon } from '../app/global/components/shared/NotificationIcon';
import { resolveNotificationRoute } from '../app/global/utils/notificationRoutes';
import { localizeFarmerNotification } from '../app/farmer/utils/farmerNotificationLocalizer';
import NotificationsPage from '../app/farmer/pages/Notifications';
import * as notificationsApi from '../services/api/notificationsApi';
import { t } from '../app/global/i18n/index';

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

describe('A. Direct Navigation Route Resolution', () => {
  it('resolves Farmer categories correctly', () => {
    // Price change with commodity deep link
    expect(
      resolveNotificationRoute({
        category: 'price_change',
        metadata: { commodity_id: 'COM-0037' },
      }, 'Farmer')
    ).toBe('/farmer/prices/COM-0037');

    // Price change without commodity deep link
    expect(
      resolveNotificationRoute({
        category: 'price_change',
        metadata: {},
      }, 'Farmer')
    ).toBe('/farmer/prices');

    // Price update with commodity_id
    expect(
      resolveNotificationRoute({
        category: 'price_update',
        metadata: { commodity_id: 'COM-0037' },
      }, 'Farmer')
    ).toBe('/farmer/prices/COM-0037');

    // Price update with structured commodity name
    expect(
      resolveNotificationRoute({
        category: 'price_update',
        metadata: { commodity_name: 'Atsal (Sultan)' },
      }, 'Farmer')
    ).toBe('/farmer/prices/COM-0037');

    // Price update legacy fallback resolving commodity from title
    expect(
      resolveNotificationRoute({
        category: 'price_update',
        title: 'New prices available for Atsal (Sultan)',
        metadata: {},
      }, 'Farmer')
    ).toBe('/farmer/prices/COM-0037');

    // Price update without commodity metadata
    expect(
      resolveNotificationRoute({
        category: 'price_update',
        metadata: {},
      }, 'Farmer')
    ).toBe('/farmer/prices');

    // Weather alert
    expect(
      resolveNotificationRoute({
        category: 'weather_alert',
        metadata: { commodity_id: 'COM-0037' },
      }, 'Farmer')
    ).toBe('/farmer/market/weather');

    // Harvest reminder with crop plan deep link
    expect(
      resolveNotificationRoute({
        category: 'harvest_reminder',
        metadata: { crop_plan_id: 'PLN-0001' },
      }, 'Farmer')
    ).toBe('/farmer/crops/PLN-0001');

    // Harvest reminder without plan id
    expect(
      resolveNotificationRoute({
        category: 'harvest_reminder',
        metadata: {},
      }, 'Farmer')
    ).toBe('/farmer/crops');

    // Planting advisory
    expect(
      resolveNotificationRoute({
        category: 'planting_advisory',
        metadata: { commodity_id: 'COM-0037' },
      }, 'Farmer')
    ).toBe('/farmer/crops');
  });

  it('resolves DFTC submission notifications correctly', () => {
    expect(
      resolveNotificationRoute({
        category: 'submission_accepted',
        metadata: { submission_id: 'SUB-20260903-01' },
      }, 'DFTC')
    ).toBe('/dftc/submissions/SUB-20260903-01');

    expect(
      resolveNotificationRoute({
        category: 'records_need_correction',
        dedupe_key: 'dftc:records_need_correction:SUB-20260903-02',
      }, 'DFTC')
    ).toBe('/dftc/submissions/SUB-20260903-02');
  });

  it('resolves Admin categories correctly to canonical routes', () => {
    expect(resolveNotificationRoute({ category: 'import_event' }, 'Admin')).toBe('/admin/import');
    expect(resolveNotificationRoute({ category: 'processing_event' }, 'Admin')).toBe('/admin/modules');
    expect(resolveNotificationRoute({ category: 'advisory_event' }, 'Admin')).toBe('/admin/modules');
    expect(resolveNotificationRoute({ category: 'data_event' }, 'Admin')).toBe('/admin/data-sources');
    expect(resolveNotificationRoute({ category: 'system_event' }, 'Admin')).toBe('/admin/system');
    expect(resolveNotificationRoute({ category: 'config_event' }, 'Admin')).toBe('/admin/configuration');
    expect(resolveNotificationRoute({ category: 'user_event', metadata: { user_id: 'USR-01' } }, 'Admin')).toBe('/admin/system/user/USR-01');
    expect(resolveNotificationRoute({ category: 'user_event' }, 'Admin')).toBe('/admin/system');
    expect(resolveNotificationRoute({ category: 'auth_event' }, 'Admin')).toBe('/admin/audit-logs');
  });
});

describe('B. Notification Icons & Event-Based Fallback Behavior', () => {
  describe('Farmer Notification Icons', () => {
    it('positive price_change uses upward price/trend icon and NOT commodity icon', () => {
      const { container } = render(
        <NotificationIcon
          category="price_change"
          metadata={{ change_pct: 7.5, commodity_name: 'Kamatis', commodity_id: 'COM-0004' }}
        />
      );
      expect(container.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(container.querySelector('.lucide-trending-up')).toBeInTheDocument();
      expect(container.querySelector('.text-emerald-600')).toBeInTheDocument();
    });

    it('negative price_change uses downward price/trend icon', () => {
      const { container } = render(
        <NotificationIcon
          category="price_change"
          metadata={{ change_pct: -4.2, commodity_name: 'Atsal' }}
        />
      );
      expect(container.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(container.querySelector('.lucide-trending-down')).toBeInTheDocument();
      expect(container.querySelector('.text-red-600')).toBeInTheDocument();
    });

    it('neutral price_change (change_pct == 0) uses minus icon', () => {
      const { container } = render(
        <NotificationIcon
          category="price_change"
          metadata={{ change_pct: 0, commodity_name: 'Atsal' }}
        />
      );
      expect(container.querySelector('.lucide-minus')).toBeInTheDocument();
    });

    it('price_update uses generic price icon and NOT commodity icon', () => {
      const { container } = render(
        <NotificationIcon
          category="price_update"
          metadata={{ commodity_name: 'Kamatis', commodity_id: 'COM-0004' }}
        />
      );
      expect(container.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(container.querySelector('.lucide-philippine-peso')).toBeInTheDocument();
    });

    it('weather_alert uses severity weather icon and NOT commodity icon', () => {
      // Caution risk
      const { container: cautionContainer } = render(
        <NotificationIcon
          category="weather_alert"
          metadata={{ risk: 'caution', commodity_name: 'Atsal' }}
        />
      );
      expect(cautionContainer.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(cautionContainer.querySelector('.lucide-cloud-rain')).toBeInTheDocument();

      // Severe risk
      const { container: severeContainer } = render(
        <NotificationIcon
          category="weather_alert"
          metadata={{ risk: 'severe', commodity_name: 'Atsal' }}
        />
      );
      expect(severeContainer.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(severeContainer.querySelector('.lucide-cloud-lightning')).toBeInTheDocument();

      // General / favorable risk
      const { container: generalContainer } = render(
        <NotificationIcon
          category="weather_alert"
          metadata={{ risk: 'favorable', commodity_name: 'Atsal' }}
        />
      );
      expect(generalContainer.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(generalContainer.querySelector('.lucide-cloud-sun')).toBeInTheDocument();
    });

    it('harvest_reminder with Top 10 commodity uses commodity illustration', () => {
      const { container } = render(
        <NotificationIcon
          category="harvest_reminder"
          metadata={{ commodity_name: 'Atsal (Sultan)', commodity_id: 'COM-0037' }}
        />
      );
      expect(container.querySelector('[title="Commodity: atsal"]')).toBeInTheDocument();
    });

    it('planting_advisory with Top 10 commodity uses commodity illustration', () => {
      const { container } = render(
        <NotificationIcon
          category="planting_advisory"
          metadata={{ commodity_name: 'Kamatis', commodity_id: 'COM-0004' }}
        />
      );
      expect(container.querySelector('[title="Commodity: kamatis"]')).toBeInTheDocument();
    });

    it('harvest_reminder and planting_advisory with unknown/non-Top-10 commodity fall back safely', () => {
      const { container: harvestFallback } = render(
        <NotificationIcon
          category="harvest_reminder"
          metadata={{ commodity_name: 'DragonFruitUnknownCrop' }}
        />
      );
      expect(harvestFallback.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(harvestFallback.querySelector('.lucide-calendar-days')).toBeInTheDocument();

      const { container: plantingFallback } = render(
        <NotificationIcon
          category="planting_advisory"
          metadata={{ commodity_name: 'ExoticNonTop10Plant' }}
        />
      );
      expect(plantingFallback.querySelector('[title^="Commodity:"]')).not.toBeInTheDocument();
      expect(plantingFallback.querySelector('.lucide-sprout')).toBeInTheDocument();
    });
  });

  describe('DFTC Notification Icons', () => {
    it('uses distinct workflow icons for all 4 DFTC categories', () => {
      const { container: c1 } = render(<NotificationIcon category="submission_accepted" />);
      expect(c1.querySelector('.lucide-circle-check')).toBeInTheDocument();

      const { container: c2 } = render(<NotificationIcon category="submission_failed" />);
      expect(c2.querySelector('.lucide-circle-x')).toBeInTheDocument();

      const { container: c3 } = render(<NotificationIcon category="records_need_correction" />);
      expect(c3.querySelector('.lucide-triangle-alert')).toBeInTheDocument();

      const { container: c4 } = render(<NotificationIcon category="upload_validation_completed" />);
      expect(c4.querySelector('.lucide-clipboard-check')).toBeInTheDocument();
    });
  });

  describe('Admin Notification Icons', () => {
    it('uses assigned system icons for all admin categories', () => {
      const { container: c1 } = render(<NotificationIcon category="import_event" />);
      expect(c1.querySelector('.lucide-upload')).toBeInTheDocument();

      const { container: c2 } = render(<NotificationIcon category="processing_event" />);
      expect(c2.querySelector('.lucide-activity')).toBeInTheDocument();

      const { container: c3 } = render(<NotificationIcon category="advisory_event" />);
      expect(c3.querySelector('.lucide-lightbulb')).toBeInTheDocument();

      const { container: c4 } = render(<NotificationIcon category="data_event" />);
      expect(c4.querySelector('.lucide-database')).toBeInTheDocument();

      const { container: c5 } = render(<NotificationIcon category="system_event" />);
      expect(c5.querySelector('.lucide-server')).toBeInTheDocument();

      const { container: c6 } = render(<NotificationIcon category="config_event" />);
      expect(c6.querySelector('.lucide-sliders-horizontal')).toBeInTheDocument();

      const { container: c7 } = render(<NotificationIcon category="user_event" />);
      expect(c7.querySelector('.lucide-users')).toBeInTheDocument();

      const { container: c8 } = render(<NotificationIcon category="auth_event" />);
      expect(c8.querySelector('.lucide-shield-check')).toBeInTheDocument();
    });
  });
});

describe('E. Farmer Notification Dynamic Localization & Fallback', () => {
  const priceItem = {
    id: 'FNT-01',
    category: 'price_change',
    title: 'Kamatis price rose',
    body: 'The latest market price for Kamatis is 55.00 PHP/kg, up from 50.00 PHP/kg.',
    metadata: {
      commodity_name: 'Kamatis',
      direction: 'rose',
      latest: 55,
      prev: 50,
    },
  };

  it('localizes into English (en)', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tEn, 'en');
    expect(title).toBe('Kamatis price rose');
    expect(body).toBe('The latest market price for Kamatis is 55.00 PHP/kg, up from 50.00 PHP/kg.');
  });

  it('localizes into Davao Bisaya (ceb)', () => {
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tCeb, 'ceb');
    expect(title).toBe('Misaka ang presyo sa Kamatis');
    expect(body).toBe('Ang pinakaulahing presyo sa merkado alang sa Kamatis kay 55.00 PHP/kg, mas taas gikan sa 50.00 PHP/kg.');
  });

  it('localizes into Filipino (tl)', () => {
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;
    const { title, body } = localizeFarmerNotification(priceItem, tTl, 'tl');
    expect(title).toBe('Tumaas ang presyo ng Kamatis');
    expect(body).toBe('Ang pinakahuling presyo sa merkado para sa Kamatis ay 55.00 PHP/kg, tumaas mula 50.00 PHP/kg.');
  });

  it('runtime language switch re-renders existing notification without database change', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;

    const resEn = localizeFarmerNotification(priceItem, tEn, 'en');
    const resCeb = localizeFarmerNotification(priceItem, tCeb, 'ceb');

    expect(resEn.title).toBe('Kamatis price rose');
    expect(resCeb.title).toBe('Misaka ang presyo sa Kamatis');
  });

  it('localizes Atsal (Sultan) price_update with date into EN, CEB, and TL', () => {
    const atsalUpdate = {
      id: 'FNT-0001',
      category: 'price_update',
      title: 'New prices available for Atsal (Sultan)',
      body: 'Updated market prices for Atsal (Sultan) are now available as of 2026-09-19.',
      route: '/farmer/prices',
      metadata: { commodity_id: 'COM-0037' },
    };

    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;

    // EN: Title and Body must be English
    const en = localizeFarmerNotification(atsalUpdate, tEn, 'en');
    expect(en.title).toBe('New prices available for Atsal (Sultan)');
    expect(en.body).toBe('Updated market prices for Atsal (Sultan) are now available as of 2026-09-19.');

    // CEB: Title and Body must be Davao Bisaya
    const ceb = localizeFarmerNotification(atsalUpdate, tCeb, 'ceb');
    expect(ceb.title).toBe('Bag-ong presyo alang sa Atsal (Sultan)');
    expect(ceb.body).toBe('Ang gi-update nga presyo sa merkado alang sa Atsal (Sultan) anaa na karon sugod 2026-09-19.');

    // TL: Title and Body must be Filipino
    const tl = localizeFarmerNotification(atsalUpdate, tTl, 'tl');
    expect(tl.title).toBe('Bagong presyo para sa Atsal (Sultan)');
    expect(tl.body).toBe('Ang na-update na presyo sa merkado para sa Atsal (Sultan) ay available na simula 2026-09-19.');
  });

  it('localizes weather_alert, harvest_reminder, and planting_advisory in EN, CEB, and TL', () => {
    const tEn = (key, params, fallback) => t(key, params, 'en') || fallback;
    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const tTl = (key, params, fallback) => t(key, params, 'tl') || fallback;

    // Weather alert
    const weatherItem = {
      category: 'weather_alert',
      metadata: { commodity_id: 'COM-0037', risk: 'caution' },
    };
    expect(localizeFarmerNotification(weatherItem, tEn, 'en').title).toBe('Weather Caution for Atsal (Sultan)');
    expect(localizeFarmerNotification(weatherItem, tCeb, 'ceb').title).toBe('Alerto sa panahon (Kinahanglan Bantayan) alang sa Atsal (Sultan)');
    expect(localizeFarmerNotification(weatherItem, tTl, 'tl').title).toBe('Alerto sa panahon (Kailangang Bantayan) para sa Atsal (Sultan)');

    // Harvest reminder
    const harvestItem = {
      category: 'harvest_reminder',
      metadata: { commodity_id: 'COM-0037', expected_harvest_date: '2026-10-15' },
    };
    expect(localizeFarmerNotification(harvestItem, tEn, 'en').title).toBe('Atsal (Sultan) ready for harvest');
    expect(localizeFarmerNotification(harvestItem, tCeb, 'ceb').title).toBe('Andam na alang sa pag-ani ang Atsal (Sultan)');
    expect(localizeFarmerNotification(harvestItem, tTl, 'tl').title).toBe('Handa na para sa pag-aani ang Atsal (Sultan)');

    // Planting advisory
    const plantingItem = {
      category: 'planting_advisory',
      metadata: { commodity_id: 'COM-0037', verdict: 'suitable' },
    };
    expect(localizeFarmerNotification(plantingItem, tEn, 'en').title).toBe('Planting window open for Atsal (Sultan)');
    expect(localizeFarmerNotification(plantingItem, tCeb, 'ceb').title).toBe('Abli na ang panahon sa pagtanom alang sa Atsal (Sultan)');
    expect(localizeFarmerNotification(plantingItem, tTl, 'tl').title).toBe('Bukas na ang panahon ng pagtatanim para sa Atsal (Sultan)');
  });

  it('safely falls back to stored title and body for legacy notifications without metadata', () => {
    const legacyItem = {
      id: 'FNT-LEGACY',
      category: 'custom_alert',
      title: 'Legacy system notification message',
      body: 'This is an older message that cannot be parsed.',
      metadata: {},
    };

    const tCeb = (key, params, fallback) => t(key, params, 'ceb') || fallback;
    const { title, body } = localizeFarmerNotification(legacyItem, tCeb, 'ceb');

    expect(title).toBe('Legacy system notification message');
    expect(body).toBe('This is an older message that cannot be parsed.');
    expect(title).not.toContain('farmer.notifications');
  });
});

describe('D. Farmer Notification List Rendering & Fallbacks', () => {
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
});


