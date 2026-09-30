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

    // Same shared shell as the arrival preview.
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IMG' })).toBeInTheDocument();
    expect(screen.getByText('Prepared By')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Images/i })).toBeInTheDocument();
  });

  it('refetches the submissions list on mount so a just-saved entry is visible', async () => {
    // Mirrors the app's real queryClient defaults (staleTime 30 min,
    // refetchOnMount false). Saving on the price/arrival pages invalidates
    // ["dftc","submissions"] while this page is unmounted, which only marks it
    // stale — without a forced refetch on mount the page renders the pre-save
    // cache and the newly saved entry is missing.
    const submissionsFetch = mockSubmissionsFetch();
    global.fetch = submissionsFetch;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 30 * 60 * 1000, refetchOnMount: false }
      }
    });

    // Pre-seed the cache with the stale, pre-save payload.
    queryClient.setQueryData(['dftc', 'submissions'], { items: [], total: 0, page: 1, page_size: 50 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dftc/input']}>
          <DFTCInput />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // The seeded payload was empty, so a visible Sep 30 report proves a refetch.
    await waitFor(() => {
      expect(screen.getAllByText(/DFTC Price Monitoring — Sep 30, 2026/i).length).toBeGreaterThanOrEqual(1);
    });

    const submissionCalls = submissionsFetch.mock.calls.filter(([url]) =>
      String(url).includes('/dftc/submissions')
    );
    expect(submissionCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('opens an arrival-volume report, not the price report, for an arrival row', async () => {
    // Regression: DFTCFilePreview is hardwired to the price report, so an
    // arrival row used to open a price preview for the same date.
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/dftc/submissions/arr-sub-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'arr-sub-1',
            data_type: 'arrival_volume',
            reporting_date: '2026-09-30',
            submitted_by_name: 'IVY JOYCE P. BOLODO',
            record_count: 2,
            analytics_records: [
              {
                commodity_name: 'Kamatis',
                variety: 'Base',
                arrival_date: '2026-09-30',
                farm_source_volume_kg: 120,
                other_source_volume_kg: 30,
                volume_kg: 150,
                unit: 'kg'
              },
              {
                commodity_name: 'Talong',
                variety: 'Base',
                arrival_date: '2026-09-30',
                farm_source_volume_kg: 80,
                other_source_volume_kg: null,
                volume_kg: 80,
                unit: 'kg'
              }
            ],
            other_records: []
          })
        };
      }
      if (String(url).includes('/dftc/submissions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'arr-sub-1',
                data_type: 'arrival_volume',
                source_id: 'dftc_volume',
                source_name: 'DFTC Taboan',
                reporting_date: '2026-09-30',
                saved_at: '2026-09-30T18:20:00Z',
                record_count: 2,
                submission_method: 'Manual Input'
              }
            ]
          })
        };
      }
      if (String(url).includes('/dftc/reports/preview')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ report_reference_no: 'REP-1', subtitle: 'Prevailing Market Prices as of September 30, 2026', rows: [] })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });
    global.fetch = fetchMock;

    renderDFTCInput();

    const arrivalLabels = await screen.findAllByText(/Arrival Volume — 2026-09-30/i);
    // Desktop renders a table row, mobile renders a card button.
    fireEvent.click(arrivalLabels[0].closest('tr') || arrivalLabels[0].closest('button') || arrivalLabels[0]);

    await waitFor(() => {
      expect(screen.getByText('Preview Arrival Volume')).toBeInTheDocument();
    });

    // Arrival volume rows load from the submission detail endpoint.
    await waitFor(() => {
      expect(screen.getAllByText('Kamatis').length).toBeGreaterThan(0);
    });

    // The arrival report uses the same banded document layout as the price
    // report: source-volume group, overall total column, and personnel block.
    expect(screen.getAllByText('VOLUME BY SOURCE (KG)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OVERALL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Farm Source').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Other Sources').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overall Total').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Talong').length).toBeGreaterThan(0);
    expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);

    // Same chrome as the price preview: format tabs, personnel, shared actions.
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IMG' })).toBeInTheDocument();
    expect(screen.getByText('Encoded By')).toBeInTheDocument();
    expect(screen.getByText('Prepared By')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Images/i })).toBeInTheDocument();

    // The price report must NOT be rendered.
    expect(screen.queryByText('Preview Daily Report')).not.toBeInTheDocument();
    expect(screen.queryByText(/DFTC Price Monitoring —/i)).not.toBeInTheDocument();
  });
});
