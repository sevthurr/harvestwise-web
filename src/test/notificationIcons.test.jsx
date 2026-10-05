import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';

import { NotificationIcon } from '../app/global/components/shared/NotificationIcon';

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

describe('Notification Icons & Event-Based Fallback Behavior', () => {
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
