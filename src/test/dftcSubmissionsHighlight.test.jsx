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
    },
    {
      id: 'SUB-FILE-PRICE',
      data_type: 'price',
      price_type: 'Retail',
      reporting_date: yesterdayIso,
      saved_at: `${yesterdayIso}T08:00:00Z`,
      created_at: `${yesterdayIso}T08:00:00Z`,
      submission_method: 'File Upload',
      original_file_name: 'prices_oct27.xlsx',
      record_count: 10
    },
    {
      id: 'SUB-FILE-ARR',
      data_type: 'arrival_volume',
      reporting_date: yesterdayIso,
      saved_at: `${yesterdayIso}T07:00:00Z`,
      created_at: `${yesterdayIso}T07:00:00Z`,
      submission_method: 'File Upload',
      original_file_name: 'arrivals_oct27.xlsx',
      record_count: 12
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

  it('displays Dataset Name as table header and provides only the specified dropdown options', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderComponent('/dftc/submissions');

    await screen.findAllByText('SUB-TODAY-PRICE');

    // Table header is "Dataset Name"
    const ths = Array.from(document.querySelectorAll('th')).map((th) => th.textContent.trim());
    expect(ths).toContain('Dataset Name');
    expect(ths).not.toContain('Dataset Type');

    // Dropdown options
    const select = document.querySelector('select');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent.trim());
    expect(options).toEqual([
      'All Types',
      'Price Data - File Upload',
      'Price Data - Manual Input',
      'Arrival Data - File Upload',
      'Arrival Data - Manual Upload'
    ]);

    // Test filter: Price Data - File Upload
    fireEvent.change(select, { target: { value: 'Price Data - File Upload' } });
    expect(screen.getByText('SUB-FILE-PRICE')).toBeInTheDocument();
    expect(screen.queryByText('SUB-TODAY-PRICE')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-TODAY-ARR')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-FILE-ARR')).not.toBeInTheDocument();

    // Test filter: Arrival Data - File Upload
    fireEvent.change(select, { target: { value: 'Arrival Data - File Upload' } });
    expect(screen.getByText('SUB-FILE-ARR')).toBeInTheDocument();
    expect(screen.queryByText('SUB-FILE-PRICE')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-TODAY-ARR')).not.toBeInTheDocument();

    // Test filter: Price Data - Manual Input
    fireEvent.change(select, { target: { value: 'Price Data - Manual Input' } });
    expect(screen.getByText('SUB-TODAY-PRICE')).toBeInTheDocument();
    expect(screen.queryByText('SUB-FILE-PRICE')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-FILE-ARR')).not.toBeInTheDocument();

    // Test filter: Arrival Data - Manual Upload
    fireEvent.change(select, { target: { value: 'Arrival Data - Manual Upload' } });
    expect(screen.getByText('SUB-TODAY-ARR')).toBeInTheDocument();
    expect(screen.queryByText('SUB-TODAY-PRICE')).not.toBeInTheDocument();
    expect(screen.queryByText('SUB-FILE-PRICE')).not.toBeInTheDocument();
  });
});
