import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminHistory from '../app/admin/pages/AdminHistory';
import { ingestionApi } from '../services/api';

vi.mock('../services/api', () => ({
  ingestionApi: { getHistory: vi.fn() },
}));

// The history search advertised "commodity, or variety" but read them off
// `details`, which mapHistory never populated — so those branches could never
// match anything. Search now covers the fields ImportHistoryResponse actually
// returns. Rows are counted rather than matched by text because the table is
// rendered twice (desktop table + mobile list).
const ARRIVAL = {
  id: 'IMP-1',
  uploaded_by_user_id: 'USR-9',
  uploaded_by_name: 'Kaye Mayugba',
  original_file_name: 'DFTC-VOLUME-2025-Final.xlsx',
  submission_id: 'SUB-ARR1',
  file_format: '.xlsx',
  started_at: '2026-09-11T15:28:00Z',
  finished_at: '2026-09-11T15:28:04Z',
  records_imported: 937,
  status: 'completed',
  error_message: null,
};

const PRICE = {
  id: 'IMP-2',
  uploaded_by_user_id: 'USR-4',
  uploaded_by_name: 'Rafael Cruz',
  original_file_name: 'Bankerohan-Retail-January.xlsx',
  submission_id: 'SUB-PRC2',
  file_format: '.xlsx',
  started_at: '2026-09-12T09:00:00Z',
  finished_at: null,
  records_imported: null,
  status: 'failed',
  error_message: 'Duplicate header row detected at row 3.',
};

const searchBox = () => screen.getByPlaceholderText(/Search file name/i);
const rowCount = (container) => container.querySelectorAll('tbody tr').length;

async function renderHistory(items) {
  ingestionApi.getHistory.mockResolvedValue({
    items,
    total: items.length,
    page: 1,
    page_size: 20,
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminHistory />
      </MemoryRouter>
    </QueryClientProvider>
  );
  await waitFor(() => expect(rowCount(utils.container)).toBe(items.length));
  return utils;
}

async function search(container, term, expectedRows) {
  fireEvent.change(searchBox(), { target: { value: term } });
  await waitFor(() => expect(rowCount(container)).toBe(expectedRows));
}

describe('AdminHistory search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('matches on the file name', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'volume', 1);
    expect(screen.getByText(/Showing 1 of 2 activities/)).toBeInTheDocument();
  });

  it('matches on the submission ID, which the old branch could not reach', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'SUB-PRC2', 1);
    await search(container, 'SUB-ARR1', 1);
  });

  it('matches on the failure reason shown in the Result column', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'duplicate header', 1);
  });

  it('matches on status', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'failed', 1);
    await search(container, 'completed', 1);
  });

  it('matches on the uploader', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'kaye', 1);
    await search(container, 'rafael', 1);
  });

  it('matches on the records-processed count', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, '937', 1);
  });

  it('replaces the table with the empty state for a term that matches nothing', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    fireEvent.change(searchBox(), { target: { value: 'zzzz-no-such-thing' } });

    // The table falls back to a single colSpan=5 empty-state row.
    await waitFor(() => {
      expect(container.querySelector('tbody td[colspan="5"]')).not.toBeNull();
    });
    expect(screen.getByText(/Showing 0 of 2 activities/)).toBeInTheDocument();
  });

  it('restores both rows when the search is cleared', async () => {
    const { container } = await renderHistory([ARRIVAL, PRICE]);
    await search(container, 'volume', 1);
    await search(container, '', 2);
    expect(screen.queryByText(/Showing \d+ of 2 activities/)).not.toBeInTheDocument();
  });

  it('no longer advertises fields the list endpoint never returns', async () => {
    await renderHistory([ARRIVAL]);
    const placeholder = searchBox().getAttribute('placeholder');
    expect(placeholder).not.toMatch(/commodity/i);
    expect(placeholder).not.toMatch(/variety/i);
    expect(placeholder).not.toMatch(/module/i);
  });
});
