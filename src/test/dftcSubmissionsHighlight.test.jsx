import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCSubmissions from '../app/dftc/pages/DFTCSubmissions';
import * as apiModule from '../app/global/api';

const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

vi.mock('../app/global/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'usr-1', name: 'Maria Santos', role_name: 'DFTC' }
  })
}));

vi.mock('../app/global/api', () => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn((r) => r)
}));

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const yesterday = new Date(now);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

describe('DFTCSubmissions sorting and highlight', () => {
  const mockSubmissions = [
    {
      id: 'SUB-OLD-1',
      data_type: 'price',
      price_type: 'Wholesale',
      reporting_date: yesterdayIso,
      saved_at: `${yesterdayIso}T09:00:00Z`,
      created_at: `${yesterdayIso}T09:00:00Z`,
      submission_method: 'Manual Input',
      record_count: 5
    },
    {
      id: 'SUB-TODAY-PRICE',
      data_type: 'price',
      price_type: 'Wholesale',
      reporting_date: yesterdayIso,
      // Saved today!
      saved_at: `${todayIso}T15:43:00Z`,
      created_at: `${yesterdayIso}T09:00:00Z`,
      submission_method: 'Manual Input',
      record_count: 5
    },
    {
      id: 'SUB-TODAY-ARR',
      data_type: 'arrival_volume',
      reporting_date: todayIso,
      saved_at: `${todayIso}T10:00:00Z`,
      created_at: `${todayIso}T10:00:00Z`,
      submission_method: 'Manual Input',
      record_count: 8
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    apiModule.apiGet.mockResolvedValue({ items: mockSubmissions, total: mockSubmissions.length });
    apiModule.parseResponse.mockImplementation((r) => r);
  });

  function renderComponent(url = '/dftc/submissions') {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }
    });
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <DFTCSubmissions />
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  it('sorts submissions so the item saved today with yesterday coverage appears at the top', async () => {
    renderComponent('/dftc/submissions');

    const els = await screen.findAllByText('SUB-TODAY-PRICE');
    expect(els.length).toBeGreaterThan(0);

    const rows = document.querySelectorAll('tbody tr');
    // The top row must be SUB-TODAY-PRICE (saved at 15:43 today)
    expect(rows[0]).toHaveTextContent('SUB-TODAY-PRICE');
  });

  it('highlights price datasets processed today when highlight=price query param is present', async () => {
    renderComponent('/dftc/submissions?highlight=price');

    const els = await screen.findAllByText('SUB-TODAY-PRICE');
    expect(els.length).toBeGreaterThan(0);

    const highlightedRows = document.querySelectorAll('tr[data-highlighted="true"]');
    expect(highlightedRows.length).toBe(1);
    expect(highlightedRows[0]).toHaveTextContent('SUB-TODAY-PRICE');
  });

  it('highlights arrival datasets processed today when highlight=arrival query param is present', async () => {
    renderComponent('/dftc/submissions?highlight=arrival');

    const els = await screen.findAllByText('SUB-TODAY-ARR');
    expect(els.length).toBeGreaterThan(0);

    const highlightedRows = document.querySelectorAll('tr[data-highlighted="true"]');
    expect(highlightedRows.length).toBe(1);
    expect(highlightedRows[0]).toHaveTextContent('SUB-TODAY-ARR');
  });
});
