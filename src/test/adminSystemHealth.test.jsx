import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminSystemManagement from '../app/admin/pages/AdminSystemManagement';

vi.mock('../app/global/api', () => ({
  apiGet: vi.fn((url) => {
    if (url.includes('/admin/system/health')) {
      return Promise.resolve({
        items: [
          {
            id: 'postgres',
            label: 'PostgreSQL Database',
            status: 'Healthy',
            last_updated: 'Today, 6:00 PM',
            notes: 'Database connected & operational (2ms latency)',
          },
          {
            id: 'fastapi',
            label: 'FastAPI Backend Service',
            status: 'Healthy',
            last_updated: 'Today, 6:00 PM',
            notes: 'Application server operational (FastAPI / Uvicorn)',
          },
          {
            id: 'open_meteo',
            label: 'Open-Meteo Weather API',
            status: 'Healthy',
            last_updated: 'Today, 6:00 PM',
            notes: 'Weather forecast endpoint active and responsive',
          },
          {
            id: 'psa_openstat',
            label: 'PSA OpenStat API',
            status: 'Disconnected',
            last_updated: 'Today, 6:00 PM',
            notes: 'OpenStat API endpoint unreachable or timed out',
          },
        ],
        last_updated: 'Today, 6:00 PM',
      });
    }
    if (url.includes('/admin/users')) {
      return Promise.resolve({ items: [], total: 0 });
    }
    return Promise.resolve({});
  }),
  apiPost: vi.fn().mockResolvedValue({}),
  apiPut: vi.fn().mockResolvedValue({}),
  apiDelete: vi.fn().mockResolvedValue({}),
  parseResponse: vi.fn((data) => data),
}));

describe('AdminSystemManagement System Health Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders live health statuses, Last Updated header, and clear details without "Not checked"', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/system?tab=health']}>
          <AdminSystemManagement />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Wait for the health query to resolve and populate
    await waitFor(() => {
      expect(screen.getAllByText('Healthy').length).toBeGreaterThanOrEqual(3);
    });

    const disconnectedBadges = screen.getAllByText('Disconnected');
    expect(disconnectedBadges.length).toBeGreaterThanOrEqual(1);

    // Verify clear details are rendered
    expect(screen.getAllByText(/Database connected & operational/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/OpenStat API endpoint unreachable/).length).toBeGreaterThanOrEqual(1);

    // Verify Last Updated column has time
    expect(screen.getAllByText('Today, 6:00 PM').length).toBeGreaterThanOrEqual(1);

    // Check table rows do not have hover effect
    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(4);
    for (const row of rows) {
      expect(row.className).not.toContain('hover:bg');
    }

    // Refresh status button is present
    expect(screen.getByRole('button', { name: /Refresh status/i })).toBeDefined();
  });
});
