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

const now = new Date();
const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const todayFormatted = now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

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
              reporting_date: todayIso,
              saved_at: `${todayIso}T18:20:00Z`,
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-2',
              data_type: 'price',
              source_id: 'bankerohan',
              source_name: 'Bangkerohan Public Market',
              price_type: 'wholesale',
              reporting_date: todayIso,
              saved_at: `${todayIso}T18:20:00Z`,
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-3',
              data_type: 'price',
              source_id: 'dftc',
              source_name: 'DFTC Taboan',
              price_type: 'retail',
              reporting_date: todayIso,
              saved_at: `${todayIso}T18:20:00Z`,
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-4',
              data_type: 'price',
              source_id: 'dftc',
              source_name: 'DFTC Taboan',
              price_type: 'wholesale',
              reporting_date: todayIso,
              saved_at: `${todayIso}T18:20:00Z`,
              record_count: 14,
              submission_method: 'Manual Input'
            },
            {
              id: 'sub-file-upload-1',
              data_type: 'price',
              source_id: 'bankerohan',
              source_name: 'Bangkerohan Public Market',
              price_type: 'retail',
              reporting_date: todayIso,
              saved_at: `${todayIso}T19:00:00Z`,
              record_count: 45,
              submission_method: 'File Upload',
              original_file_name: 'Retail_Prices_Today.xlsx'
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
          subtitle: `Prevailing Market Prices as of ${todayFormatted}`,
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

    const mainContainer = container.querySelector('.max-w-\\[1440px\\]');
    expect(mainContainer.className).toContain('space-y-8');
  });

  it('accurately displays Today\'s Saved Data table with Submission Method column and 56 consolidated manual records', async () => {
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getByText("Today's Saved Data")).toBeInTheDocument();
      expect(screen.getByText("Submission Method")).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(`DFTC Price Monitoring — ${todayFormatted}`, 'i')).length).toBeGreaterThanOrEqual(1);
      // Consolidated manual records: 14 * 4 = 56 records
      expect(screen.getAllByText('56').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bankerohan & DFTC Taboan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Daily Price Monitoring').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Manual Input').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('File Upload').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('clicking a File Upload row redirects directly to Submission History details page without opening preview', async () => {
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getAllByText(/Retail_Prices_Today/i).length).toBeGreaterThanOrEqual(1);
    });

    const fileUploadRows = screen.getAllByText(/Retail_Prices_Today/i);
    const fileUploadRow = fileUploadRows[0].closest('tr') || fileUploadRows[0].closest('button');
    fireEvent.click(fileUploadRow);

    expect(mockNavigate).toHaveBeenCalledWith('/dftc/submissions/sub-file-upload-1');
    expect(screen.queryByText('Preview Daily Report')).not.toBeInTheDocument();
    expect(screen.queryByText('Preview Arrival Volume')).not.toBeInTheDocument();
  });

  it('completely omits Commodity Records section and related controls', async () => {
    renderDFTCInput();

    expect(screen.queryByText('Commodity Records')).not.toBeInTheDocument();
    expect(screen.queryByText('Analytics-Supported Commodities')).not.toBeInTheDocument();
    expect(screen.queryByText('Other Commodities')).not.toBeInTheDocument();
    expect(screen.queryByText(/About analytics coverage/i)).not.toBeInTheDocument();
  });

  it('clicking a manual saved row opens the report preview with accurate personnel metadata', async () => {
    localStorage.setItem(
      `dftc_report_personnel_${todayIso}`,
      JSON.stringify({
        encodedBy: 'IVY JOYCE P. BOLODO',
        encodedByRole: 'Agri-Service & Related Worker I',
        reviewedBy: 'CHRISTIAN JOEY PAUL M. HERMOSO',
        reviewedByRole: 'Agricultural Technologist'
      })
    );

    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getAllByText(new RegExp(`DFTC Price Monitoring — ${todayFormatted}`, 'i')).length).toBeGreaterThanOrEqual(1);
    });

    const rows = screen.getAllByText(new RegExp(`DFTC Price Monitoring — ${todayFormatted}`, 'i'));
    const row = rows[0].closest('tr') || rows[0].closest('button');
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText('Preview Daily Report')).toBeInTheDocument();
      expect(screen.getAllByText(/IVY JOYCE P\. BOLODO/i).length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IMG' })).toBeInTheDocument();
    expect(screen.getByText('Prepared By')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Images/i })).toBeInTheDocument();
  });

  it('refetches the submissions list on mount so a just-saved entry is visible', async () => {
    const submissionsFetch = mockSubmissionsFetch();
    global.fetch = submissionsFetch;

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 30 * 60 * 1000, refetchOnMount: false }
      }
    });

    queryClient.setQueryData(['dftc', 'submissions'], { items: [], total: 0, page: 1, page_size: 50 });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dftc/input']}>
          <DFTCInput />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByText(new RegExp(`DFTC Price Monitoring — ${todayFormatted}`, 'i')).length).toBeGreaterThanOrEqual(1);
    });

    const submissionCalls = submissionsFetch.mock.calls.filter(([url]) =>
      String(url).includes('/dftc/submissions')
    );
    expect(submissionCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('opens an arrival-volume report, not the price report, for a manual arrival row', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('/dftc/submissions/arr-sub-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'arr-sub-1',
            data_type: 'arrival_volume',
            reporting_date: todayIso,
            submitted_by_name: 'IVY JOYCE P. BOLODO',
            record_count: 2,
            analytics_records: [
              {
                commodity_name: 'Kamatis',
                variety: 'Base',
                arrival_date: todayIso,
                farm_source_volume_kg: 120,
                other_source_volume_kg: 30,
                volume_kg: 150,
                unit: 'kg'
              },
              {
                commodity_name: 'Talong',
                variety: 'Base',
                arrival_date: todayIso,
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
                reporting_date: todayIso,
                saved_at: `${todayIso}T18:20:00Z`,
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
          json: async () => ({ report_reference_no: 'REP-1', subtitle: `Prevailing Market Prices as of ${todayFormatted}`, rows: [] })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });
    global.fetch = fetchMock;

    renderDFTCInput();

    const arrivalLabels = await screen.findAllByText(new RegExp(`Arrival Volume — ${todayIso}`, 'i'));
    fireEvent.click(arrivalLabels[0].closest('tr') || arrivalLabels[0].closest('button') || arrivalLabels[0]);

    await waitFor(() => {
      expect(screen.getByText('Preview Arrival Volume')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getAllByText('Kamatis').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('VOLUME BY SOURCE (KG)').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OVERALL').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Farm Source').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Other Sources').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Overall Total').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Talong').length).toBeGreaterThan(0);
    expect(screen.getAllByText('150.00').length).toBeGreaterThan(0);

    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Excel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'IMG' })).toBeInTheDocument();
    expect(screen.getByText('Encoded By')).toBeInTheDocument();
    expect(screen.getByText('Prepared By')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Images/i })).toBeInTheDocument();

    expect(screen.queryByText('Preview Daily Report')).not.toBeInTheDocument();
    expect(screen.queryByText(/DFTC Price Monitoring —/i)).not.toBeInTheDocument();
  });

  it('paginates Today\'s Saved Data displaying 10 items per page with Prev/Next controls', async () => {
    // 14 uploaded datasets saved today
    const customItems = Array.from({ length: 14 }, (_, idx) => ({
      id: `file-sub-${idx + 1}`,
      data_type: 'price',
      source_id: 'bankerohan',
      source_name: 'Bangkerohan Public Market',
      price_type: 'retail',
      reporting_date: todayIso,
      saved_at: `${todayIso}T12:${String(idx).padStart(2, '0')}:00Z`,
      record_count: 50,
      submission_method: 'File Upload',
      original_file_name: `Dataset_${String(idx + 1).padStart(2, '0')}.xlsx`
    }));

    global.fetch = vi.fn(async (url) => {
      if (url.includes('/dftc/submissions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: customItems })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    renderDFTCInput();

    // Verify pagination summary text
    await waitFor(() => {
      expect(screen.getByText(/Showing 1–10 of 14 datasets/i)).toBeInTheDocument();
    });

    // Page 1 should display items 14 down to 5 (or first 10 sorted by time)
    expect(screen.getAllByRole('button', { name: 'Next' }).length).toBeGreaterThan(0);

    // Click Next
    const nextButtons = screen.getAllByRole('button', { name: 'Next' });
    fireEvent.click(nextButtons[0]);

    // Page 2 should now show 11–14
    await waitFor(() => {
      expect(screen.getByText(/Showing 11–14 of 14 datasets/i)).toBeInTheDocument();
    });
  });
});
