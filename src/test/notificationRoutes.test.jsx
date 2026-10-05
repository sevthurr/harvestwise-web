import { describe, it, expect } from 'vitest';

import { resolveNotificationRoute } from '../app/global/utils/notificationRoutes';

describe('Direct Navigation Route Resolution', () => {
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

  it('resolves Admin categories to real pages when the backend sends no route', () => {
    // No import_id, so the form is the only page that can start an import.
    expect(resolveNotificationRoute({ category: 'import_event' }, 'Admin')).toBe('/admin/import');
    expect(resolveNotificationRoute({ category: 'processing_event' }, 'Admin')).toBe('/admin/modules');
    expect(resolveNotificationRoute({ category: 'advisory_event' }, 'Admin')).toBe('/admin/modules');
    expect(resolveNotificationRoute({ category: 'data_event' }, 'Admin')).toBe('/admin/data-sources');
    expect(resolveNotificationRoute({ category: 'auth_event' }, 'Admin')).toBe('/admin/audit-logs');

    // /admin/configuration is an orphan mock page whose buttons do nothing.
    // Config editing lives on the modules page, so a routeless config_event
    // must never resolve to it.
    expect(resolveNotificationRoute({ category: 'config_event' }, 'Admin')).toBe('/admin/modules');

    expect(resolveNotificationRoute({ category: 'user_event', metadata: { user_id: 'USR-01' } }, 'Admin')).toBe('/admin/system/user/USR-01');
    expect(resolveNotificationRoute({ category: 'user_event' }, 'Admin')).toBe('/admin/system?tab=users');
  });

  it('links an import notification to that upload\'s processing history', () => {
    // An import alert is about a finished upload, so it opens that upload's
    // history entry rather than the form that starts one.
    for (const category of ['import_event']) {
      expect(
        resolveNotificationRoute(
          { category, metadata: { import_id: 'IMP-0000000019' } },
          'Admin',
        ),
      ).toBe('/admin/history/IMP-0000000019');
    }

    // The backend sends this route directly for new rows; the metadata is what
    // lets the fallback agree.
    expect(
      resolveNotificationRoute(
        {
          category: 'import_event',
          route: '/admin/history/IMP-0000000019',
          metadata: { import_id: 'IMP-0000000019' },
        },
        'Admin',
      ),
    ).toBe('/admin/history/IMP-0000000019');

    // A pre-fix row: stored route points at the form, but the id is present.
    expect(
      resolveNotificationRoute(
        {
          category: 'import_event',
          route: '/admin/import',
          metadata: { import_id: 'IMP-0000000019' },
        },
        'Admin',
      ),
    ).toBe('/admin/history/IMP-0000000019');

    // A row with no id keeps the form — better than /admin/history/None.
    expect(
      resolveNotificationRoute({ category: 'import_event', route: '/admin/import' }, 'Admin'),
    ).toBe('/admin/import');
  });

  it('passes an import history detail route through untouched', () => {
    // /admin/history/:id is a real page. Only the bare list path is a legacy
    // redirect, so the detail form must not be rewritten to the list.
    expect(
      resolveNotificationRoute(
        { category: 'import_event', route: '/admin/history/IMP-0000000007' },
        'Admin',
      ),
    ).toBe('/admin/history/IMP-0000000007');

    // ...while the bare path still redirects to where the list now lives.
    expect(
      resolveNotificationRoute({ category: 'data_event', route: '/admin/history' }, 'Admin'),
    ).toBe('/admin/data-sources?tab=history');
  });

  it('routes config and system events by audit action, not just category', () => {
    // The backend distinguishes these per action; the fallback must agree or
    // it sends admins to the wrong editor for rows with no route.
    expect(
      resolveNotificationRoute(
        { category: 'config_event', metadata: { action: 'config.adaptive_weight_created' } },
        'Admin',
      ),
    ).toBe('/admin/modules?tab=weights');

    expect(
      resolveNotificationRoute(
        { category: 'config_event', metadata: { action: 'config.threshold_rule_updated' } },
        'Admin',
      ),
    ).toBe('/admin/modules/thresholds');

    // A weather sync is driven from the API Sync tab, not the health tab.
    expect(
      resolveNotificationRoute(
        { category: 'system_event', metadata: { action: 'system.weather_sync' } },
        'Admin',
      ),
    ).toBe('/admin/data-sources?tab=api-sync');

    expect(
      resolveNotificationRoute(
        { category: 'system_event', metadata: { action: 'system.cache_cleared' } },
        'Admin',
      ),
    ).toBe('/admin/system?tab=health');
  });

  it('re-routes legacy config_event rows that still carry /admin/configuration', () => {
    // Rows written before the backend gained _resolve_admin_route. The audit
    // action is still in metadata, so they land on the same real editor.
    expect(
      resolveNotificationRoute(
        {
          category: 'config_event',
          route: '/admin/configuration',
          metadata: { action: 'config.adaptive_weight_created' },
        },
        'Admin',
      ),
    ).toBe('/admin/modules?tab=weights');

    expect(
      resolveNotificationRoute(
        {
          category: 'config_event',
          route: '/admin/configuration',
          metadata: { action: 'config.threshold_module_created' },
        },
        'Admin',
      ),
    ).toBe('/admin/modules/thresholds');

    // An old row with no recoverable action still must not hit the mock page.
    expect(
      resolveNotificationRoute({ category: 'config_event', route: '/admin/configuration' }, 'Admin'),
    ).toBe('/admin/modules');
  });

  it('maps legacy Admin routes to canonical destinations and preserves real deep links', () => {
    // Legacy /admin/history mirrors the router redirect in app/routes.jsx —
    // import history lives under Data Sources, not Import & Validate.
    expect(
      resolveNotificationRoute({ category: 'data_event', route: '/admin/history' }, 'Admin')
    ).toBe('/admin/data-sources?tab=history');

    // Legacy /admin/analytics redirects to Modules.
    expect(
      resolveNotificationRoute({ category: 'processing_event', route: '/admin/analytics' }, 'Admin')
    ).toBe('/admin/modules');

    // A known category keeps its real backend-supplied route: the
    // `if (item.route)` branch wins over the category fallback.
    expect(
      resolveNotificationRoute({ category: 'data_event', route: '/admin/data-sources/SRC-001' }, 'Admin')
    ).toBe('/admin/data-sources/SRC-001');
  });
});
