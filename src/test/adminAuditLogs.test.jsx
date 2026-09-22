import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminAuditLogs from '../app/admin/pages/AdminAuditLogs';

vi.mock('../app/global/api', () => ({
  apiGet: vi.fn().mockResolvedValue({
    items: [
      {
        id: 'LOG-0012',
        actor_name: 'Kaye Mayugba',
        action: 'import.completed',
        details: 'Imported Bankerohan-Retail-2025.xlsx (bankerohan_daily_retail) — 2772 records.',
        ip_address: '192.168.1.1',
        created_at: '2026-09-11T15:28:00Z',
      },
    ],
    total: 1,
    page: 1,
    page_size: 20,
  }),
  parseResponse: vi.fn((data) => data),
}));

describe('AdminAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rows without hover effects, renders action as plain text, and includes tooltip on details', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AdminAuditLogs />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText('LOG-0012').length).toBeGreaterThanOrEqual(1);
    });

    // Check table row has no hover:bg class
    const tableRow = container.querySelector('tbody tr');
    expect(tableRow).not.toBeNull();
    expect(tableRow?.className).not.toContain('hover:bg');

    // Check action is rendered as plain text (no badge border/bg classes)
    const actionElements = screen.getAllByText('import.completed');
    expect(actionElements.length).toBeGreaterThanOrEqual(1);
    for (const el of actionElements) {
      expect(el.className).not.toContain('border-');
      expect(el.className).not.toContain('bg-');
    }

    // Check details element has title attribute for tooltip fallback and button trigger
    const detailsButtons = screen.getAllByTitle('Imported Bankerohan-Retail-2025.xlsx (bankerohan_daily_retail) — 2772 records.');
    expect(detailsButtons.length).toBeGreaterThanOrEqual(1);
  });
});
