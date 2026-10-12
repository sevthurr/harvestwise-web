import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCInput from '../app/dftc/pages/DFTCInput';

const mockNavigate = vi.fn();
let mockLocationState = null;
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState, pathname: '/dftc/input' })
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

function renderDFTCInput(state = null) {
  mockLocationState = state;
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
    mockLocationState = null;
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
    expect(screen.getAllByText(/Prepared By/i).length).toBeGreaterThan(0);
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
    expect(screen.getAllByText(/Encoded By/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Reviewed By|Prepared By/i).length).toBeGreaterThan(0);
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

  it('renders Today\'s Draft before Today\'s Saved Data and allows opening unsaved drafts', async () => {
    localStorage.setItem('dftc_price_draft', 'true');
    localStorage.setItem(
      'dftc_price_draft_data',
      JSON.stringify({
        selectedDate: todayIso,
        tabFields: {
          'bankerohan-retail': {
            'com-1-v1': { samples: ['50', '52', '', '', ''], uom: 'kg' }
          }
        }
      })
    );

    global.fetch = mockSubmissionsFetch();
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getByText("Today's Draft")).toBeInTheDocument();
      expect(screen.getByText("Today's Saved Data")).toBeInTheDocument();
    });

    // Check heading hierarchy / order
    const draftHeading = screen.getByText("Today's Draft");
    const savedHeading = screen.getByText("Today's Saved Data");
    expect(draftHeading.compareDocumentPosition(savedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Verify draft item is listed
    expect(screen.getByText('Unsaved Draft')).toBeInTheDocument();

    // Clicking draft navigates to price input with restoreDraft state
    const draftRow = screen.getByText('Unsaved Draft').closest('tr');
    fireEvent.click(draftRow);

    expect(mockNavigate).toHaveBeenCalledWith('/dftc/price-input', expect.objectContaining({
      state: expect.objectContaining({ restoreDraft: true })
    }));

    localStorage.removeItem('dftc_price_draft');
    localStorage.removeItem('dftc_price_draft_data');
  });

  it('ensures Encoded By and Prepared By are not editable select elements in file preview', async () => {
    global.fetch = mockSubmissionsFetch();
    renderDFTCInput();

    const priceRows = await screen.findAllByText('Bankerohan & DFTC Taboan');
    fireEvent.click(priceRows[0].closest('tr'));

    await waitFor(() => {
      expect(screen.getByText('Preview Daily Report')).toBeInTheDocument();
    });

    // Verify Encoded By and Prepared By are displayed
    expect(screen.getAllByText(/Encoded By/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Prepared By/i).length).toBeGreaterThan(0);

    // Verify there are no select dropdowns for personnel
    const selects = screen.queryAllByRole('combobox');
    expect(selects.length).toBe(0);
  });

  it('places a just-saved entry at the top of Today\'s Saved Data as the latest item', async () => {
    global.fetch = mockSubmissionsFetch();
    renderDFTCInput({
      successMsg: 'DFTC Price Monitoring — Oct 12, 2026 saved successfully (19 price records across all markets).',
      justSavedType: 'price',
      justSavedDate: todayIso,
      justSavedAt: new Date().toISOString()
    });

    await waitFor(() => {
      expect(screen.getByText('Today\'s Saved Data')).toBeInTheDocument();
    });

    const rows = await screen.findAllByRole('row');
    // First data row (index 1 after table header row) is the price monitoring entry
    expect(rows[1]).toHaveTextContent(/DFTC Price Monitoring —/i);
  });

  it('displays compiled records count from report preview for manual price monitoring rows', async () => {
    const fetchMock = vi.fn(async (url) => {
      if (url.includes('/dftc/submissions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'sub-price-1',
                data_type: 'price',
                source_id: 'dftc',
                source_name: 'DFTC Taboan',
                price_type: 'retail',
                reporting_date: todayIso,
                saved_at: `${todayIso}T18:20:00Z`,
                record_count: 1, // backend raw submission has 1
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
            report_reference_no: 'REP-20261012-01',
            subtitle: `Prevailing Market Prices as of ${todayFormatted}`,
            rows: Array.from({ length: 19 }, (_, i) => ({
              commodity_name: `Commodity ${i + 1}`,
              bangkerohan_retail: 50 + i
            }))
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    global.fetch = fetchMock;
    renderDFTCInput();

    await waitFor(() => {
      // The row should display 19 in the Records column instead of 1
      expect(screen.getByText('19')).toBeInTheDocument();
    });
  });
});
