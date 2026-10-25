import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

function makeSubmissions(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: `SUB-${String(i + 1).padStart(3, '0')}`,
    data_type: 'price',
    price_type: 'Wholesale',
    reporting_date: todayIso,
    saved_at: `${todayIso}T09:00:00Z`,
    created_at: `${todayIso}T09:00:00Z`,
    submission_method: 'Manual Input',
    record_count: 5
  }));
}

describe('DFTCSubmissions error and pagination safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
    apiModule.parseResponse.mockImplementation((r) => r);
  });

  function renderComponent() {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } }
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dftc/submissions']}>
          <DFTCSubmissions />
        </MemoryRouter>
      </QueryClientProvider>
    );
    return queryClient;
  }

  it('shows an error banner instead of a false empty list when the fetch fails', async () => {
    apiModule.apiGet.mockRejectedValue(new Error('network down'));
    renderComponent();

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Submission history could not be loaded');
    expect(screen.queryByText('No datasets match the selected filters.')).toBeNull();
  });

  it('keeps the last good list visible and surfaces the banner when a resync refetch fails', async () => {
    apiModule.apiGet.mockResolvedValueOnce({ items: makeSubmissions(2), total: 2 });
    const queryClient = renderComponent();

    expect((await screen.findAllByText('SUB-002')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('alert')).toBeNull();

    apiModule.apiGet.mockRejectedValue(new Error('resync failed'));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['dftc-submissions'] });
    });

    await screen.findByRole('alert');
    expect(screen.getAllByText('SUB-002').length).toBeGreaterThan(0);
    expect(screen.queryByText('No datasets match the selected filters.')).toBeNull();
  });

  it('recovers when Retry succeeds after a failed load', async () => {
    apiModule.apiGet.mockRejectedValueOnce(new Error('boom'));
    renderComponent();
    await screen.findByRole('alert');

    apiModule.apiGet.mockResolvedValue({ items: makeSubmissions(2), total: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect((await screen.findAllByText('SUB-002')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('clamps pagination back to a valid page when the list shrinks', async () => {
    apiModule.apiGet.mockResolvedValueOnce({ items: makeSubmissions(25), total: 25 });
    const queryClient = renderComponent();

    await screen.findAllByText('SUB-025');
    expect(screen.getByText(/^Showing 1–20 of 25 datasets$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText(/^Showing 21–25 of 25 datasets$/)).toBeInTheDocument();

    apiModule.apiGet.mockResolvedValue({ items: makeSubmissions(5), total: 5 });
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ['dftc-submissions'] });
    });

    expect(await screen.findByText(/^Showing 1–5 of 5 datasets$/)).toBeInTheDocument();
    expect(screen.getAllByText('SUB-005').length).toBeGreaterThan(0);
  });
});
