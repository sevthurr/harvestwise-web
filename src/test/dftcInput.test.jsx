import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCInput from '../app/dftc/pages/DFTCInput';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null })
  };
});

function mockSubmissionsFetch() {
  return vi.fn(async (url) => {
    if (url.includes('/dftc/submissions')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'sub-1',
              data_type: 'price',
              source_id: 'bankerohan',
              source_name: 'Bangkerohan Public Market',
              price_type: 'retail',
              reporting_date: '2026-09-30',
              saved_at: '2026-09-30T18:20:00Z',
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-2',
              data_type: 'price',
              source_id: 'bankerohan',
              source_name: 'Bangkerohan Public Market',
              price_type: 'wholesale',
              reporting_date: '2026-09-30',
              saved_at: '2026-09-30T18:20:00Z',
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-3',
              data_type: 'price',
              source_id: 'dftc',
              source_name: 'DFTC Taboan',
              price_type: 'retail',
              reporting_date: '2026-09-30',
              saved_at: '2026-09-30T18:20:00Z',
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-4',
              data_type: 'price',
              source_id: 'dftc',
              source_name: 'DFTC Taboan',
              price_type: 'wholesale',
              reporting_date: '2026-09-30',
              saved_at: '2026-09-30T18:20:00Z',
              record_count: 14,
              submission_method: 'Manual Input'
            }
          ]
        })
      };
    }
    if (url.includes('/dftc/reports/preview')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          report_reference_no: 'REP-20260930-01',
          subtitle: 'Prevailing Market Prices as of September 30, 2026',
          rows: []
        })
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [] })
    };
  });
}

function renderDFTCInput() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dftc/input']}>
        <DFTCInput />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DFTCInput Submit Data Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockSubmissionsFetch();
    localStorage.clear();
  });

  it('renders Submit Data page with action cards and generous spacing', async () => {
    const { container } = renderDFTCInput();

    expect(screen.getByText('Submit Data')).toBeInTheDocument();
    expect(screen.getByText('Input Price Data')).toBeInTheDocument();
    expect(screen.getByText('Input Arrival Volume')).toBeInTheDocument();
    expect(screen.getByText('Upload Data')).toBeInTheDocument();

    // Verify outer container has generous spacing
    const mainContainer = container.querySelector('.max-w-\\[1440px\\]');
    expect(mainContainer.className).toContain('space-y-8');
  });

  it('accurately consolidates Recent Saved Data and displays 56 records for Sep 30, 2026', async () => {
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getByText('Recent Saved Data')).toBeInTheDocument();
      expect(screen.getAllByText(/DFTC Price Monitoring — Sep 30, 2026/i).length).toBeGreaterThanOrEqual(1);
      // Record count should be 14 * 4 = 56 records
      expect(screen.getAllByText('56').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bankerohan & DFTC Taboan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Daily Price Monitoring').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('completely omits Commodity Records section and related controls', async () => {
    renderDFTCInput();

    // Commodity Records heading must not exist
    expect(screen.queryByText('Commodity Records')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics-Supported Commodities')).not.toBeInTheDocument();
    expect(screen.queryByText('Other Commodities')).not.toBeInTheDocument();
    expect(screen.queryByText(/About analytics coverage/i)).not.toBeInTheDocument();
  });

  it('clicking a saved row opens the report preview with accurate personnel metadata', async () => {
    localStorage.setItem(
      'dftc_report_personnel_2026-09-30',
      JSON.stringify({
        encodedBy: 'IVY JOYCE P. BOLODO',
        encodedByRole: 'Agri-Service & Related Worker I',
        reviewedBy: 'CHRISTIAN JOEY PAUL M. HERMOSO',
        reviewedByRole: 'Agricultural Technologist'
      })
    );

    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getAllByText(/DFTC Price Monitoring — Sep 30, 2026/i).length).toBeGreaterThanOrEqual(1);
    });

    const rows = screen.getAllByText(/DFTC Price Monitoring — Sep 30, 2026/i);
    const row = rows[0].closest('tr') || rows[0].closest('button');
    fireEvent.click(row);

    // Preview should open
    await waitFor(() => {
      expect(screen.getByText('Preview Daily Report')).toBeInTheDocument();
      expect(screen.getAllByText(/IVY JOYCE P\. BOLODO/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});
