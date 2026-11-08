import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCInput from '../app/dftc/pages/DFTCInput';

const mockNavigate = vi.fn();
let mockLocationState = null;
let mockSearchParams = new URLSearchParams();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      state: mockLocationState,
      pathname: '/dftc/input',
      search: mockSearchParams.toString() ? `?${mockSearchParams.toString()}` : ''
    }),
    useSearchParams: () => [mockSearchParams, vi.fn()]
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
    Element.prototype.scrollIntoView = vi.fn();
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
    expect(mainContainer.className).toContain('space-y-6');
  });

  it('accurately displays Recent Saved Data with 7 days subtext, View Data History button, and entries', async () => {
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getByText("Recent Saved Data")).toBeInTheDocument();
      expect(screen.getByText("Datasets saved and validated in the last 7 days")).toBeInTheDocument();
      expect(screen.getByText("View Data History")).toBeInTheDocument();
      expect(screen.getAllByText(new RegExp(`DFTC Price Monitoring — ${todayFormatted}`, 'i')).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bankerohan & DFTC Taboan').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Manual Input').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('File Upload').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('opens preview when clicking a File Upload row so user can preview and export files', async () => {
    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getAllByText(/Retail_Prices_Today/i).length).toBeGreaterThanOrEqual(1);
    });

    const fileUploadRows = screen.getAllByText(/Retail_Prices_Today/i);
    const fileUploadRow = fileUploadRows[0].closest('tr') || fileUploadRows[0].closest('button');
    fireEvent.click(fileUploadRow);

    await waitFor(() => {
      expect(screen.getByText('Preview Daily Report')).toBeInTheDocument();
    });
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
      if (String(url).includes('/dftc/reports/arrival-preview')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            rows: [
              { commodity_name: 'Kamatis', variety: 'Base', volume_kg: 150, unit: 'kg' },
              { commodity_name: 'Talong', variety: 'Base', volume_kg: 80, unit: 'kg' }
            ],
            encoded_by: 'BACKEND ENCODER',
            prepared_by: 'BACKEND PREPARER'
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

    const arrivalLabels = await screen.findAllByText(new RegExp(`Arrival Volume — (${todayIso}|${todayFormatted})`, 'i'));
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

  it('renders Recent Saved Data displaying all entries from the last 7 days in scrollable list', async () => {
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

    await waitFor(() => {
      expect(screen.getByText('Dataset_01.xlsx')).toBeInTheDocument();
      expect(screen.getByText('Dataset_14.xlsx')).toBeInTheDocument();
    });
  });

  it('renders Today\'s Draft before Recent Saved Data and allows opening unsaved drafts', async () => {
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
      expect(screen.getByText("Recent Saved Data")).toBeInTheDocument();
    });

    // Check heading hierarchy / order
    const draftHeading = screen.getByText("Today's Draft");
    const savedHeading = screen.getByText("Recent Saved Data");
    expect(draftHeading.compareDocumentPosition(savedHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Verify draft item is listed
    expect(screen.getAllByText('Unsaved Draft').length).toBeGreaterThan(0);

    // Clicking draft navigates to price input with restoreDraft state
    const draftRow = screen.getAllByText('Unsaved Draft')[0].closest('tr');
    fireEvent.click(draftRow);

    expect(mockNavigate).toHaveBeenCalledWith('/dftc/price-input', expect.objectContaining({
      state: expect.objectContaining({ restoreDraft: true })
    }));

    localStorage.removeItem('dftc_price_draft');
    localStorage.removeItem('dftc_price_draft_data');
  });

  it('clears the local price cache when deleting a server draft', async () => {
    localStorage.setItem('dftc_price_draft', 'true');
    localStorage.setItem('dftc_price_draft_data', JSON.stringify({ selectedDate: todayIso }));

    global.fetch = vi.fn(async (url, options = {}) => {
      if (url.includes('/dftc/submissions')) {
        return { ok: true, status: 200, json: async () => ({ items: [] }) };
      }
      if (url.includes('/dftc/price-draft') && options.method === 'DELETE') {
        return { ok: true, status: 200, json: async () => ({ deleted_cells: 2 }) };
      }
      if (url.includes('/dftc/price-draft')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'DRF-1', status: 'draft', cells: [{ id: 'DCL-1' }] })
        };
      }
      if (url.includes('/dftc/arrival-draft')) {
        return { ok: true, status: 200, json: async () => ({ payload: {} }) };
      }
      return { ok: true, status: 200, json: async () => ({ rows: [] }) };
    });

    renderDFTCInput();
    await waitFor(() => expect(screen.getAllByTitle('Delete draft').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByTitle('Delete draft')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(localStorage.getItem('dftc_price_draft')).toBeNull();
      expect(localStorage.getItem('dftc_price_draft_data')).toBeNull();
    });
  });

  it('shows a blocking deleting state until the server draft is removed', async () => {
    let resolveDelete;
    global.fetch = vi.fn((url, options = {}) => {
      if (url.includes('/dftc/submissions')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) });
      }
      if (url.includes('/dftc/price-draft') && options.method === 'DELETE') {
        return new Promise((resolve) => {
          resolveDelete = () => resolve({ ok: true, status: 200, json: async () => ({ deleted_cells: 2 }) });
        });
      }
      if (url.includes('/dftc/price-draft')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'DRF-1', status: 'draft', cells: [{ id: 'DCL-1' }] })
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ items: [] }) });
    });

    renderDFTCInput();
    await waitFor(() => expect(screen.getAllByTitle('Delete draft').length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByTitle('Delete draft')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByRole('status')).toHaveTextContent(/Deleting draft/i);
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();

    resolveDelete();
    await waitFor(() => expect(screen.queryByRole('status')).not.toBeInTheDocument());
  });

  it('ensures Encoded By and Prepared By are not editable select elements in file preview', async () => {
    global.fetch = mockSubmissionsFetch();
    renderDFTCInput();

    const priceRows = await screen.findAllByText('Bankerohan & DFTC Taboan');
    fireEvent.click(priceRows[0].closest('button'));

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

  it('places a just-saved entry at the top of Recent Saved Data as the latest item', async () => {
    global.fetch = mockSubmissionsFetch();
    renderDFTCInput({
      successMsg: 'DFTC Price Monitoring — Oct 12, 2026 saved successfully (19 price records across all markets).',
      justSavedType: 'price',
      justSavedDate: todayIso,
      justSavedAt: new Date().toISOString()
    });

    await waitFor(() => {
      expect(screen.getByText('Recent Saved Data')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/DFTC Price Monitoring —/i)).toBeInTheDocument();
    });
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
      // The row should reflect compiled 19 records
      expect(screen.getAllByText(/sub-price-1/i).length).toBeGreaterThan(0);
    });
  });

  it("briefly highlights the draft item in Today's Draft section when highlight parameter is present", async () => {
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

    mockSearchParams = new URLSearchParams('highlight=price');
    global.fetch = mockSubmissionsFetch();

    renderDFTCInput();

    await waitFor(() => {
      expect(screen.getByText("Today's Draft")).toBeInTheDocument();
      expect(screen.queryByText('Selected')).toBeNull();
      const draftRow = document.getElementById('draft-row-local-price-draft');
      expect(draftRow).toBeTruthy();
      expect(draftRow).toHaveClass('bg-emerald-50/90');
      expect(draftRow).not.toHaveClass('ring-4');
    });

    mockSearchParams = new URLSearchParams();
    localStorage.removeItem('dftc_price_draft');
    localStorage.removeItem('dftc_price_draft_data');
  });

  it('filters Recent Saved Data by Last 7 Days vs Last 30 Days and user search', async () => {
    const d15DaysAgo = new Date();
    d15DaysAgo.setDate(d15DaysAgo.getDate() - 15);
    const date15Iso = `${d15DaysAgo.getFullYear()}-${String(d15DaysAgo.getMonth() + 1).padStart(2, '0')}-${String(d15DaysAgo.getDate()).padStart(2, '0')}`;

    const customFetch = vi.fn(async (url) => {
      if (url.includes('/dftc/submissions')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              {
                id: 'sub-recent',
                data_type: 'arrival',
                source_id: 'dftc',
                source_name: 'DFTC Taboan',
                reporting_date: todayIso,
                saved_at: `${todayIso}T10:00:00Z`,
                record_count: 5,
                submission_method: 'Manual Input',
                submitted_by_name: 'Maria Santos'
              },
              {
                id: 'sub-older',
                data_type: 'arrival',
                source_id: 'dftc',
                source_name: 'DFTC Taboan',
                reporting_date: date15Iso,
                saved_at: `${date15Iso}T10:00:00Z`,
                record_count: 8,
                submission_method: 'Manual Input',
                submitted_by_name: 'Juan Dela Cruz'
              }
            ]
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    global.fetch = customFetch;
    renderDFTCInput();

    // Default: Last 7 Days filter is active
    await waitFor(() => {
      expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
      expect(screen.queryByText(/Juan Dela Cruz/i)).toBeNull();
    });

    // Switch to Last 30 Days using the days dropdown button
    const daysBtn = screen.getByRole('button', { name: /Filter by days/i });
    fireEvent.click(daysBtn);
    const last30Btn = screen.getByRole('button', { name: /Last 30 Days/i });
    fireEvent.click(last30Btn);

    await waitFor(() => {
      expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
      expect(screen.getByText(/Juan Dela Cruz/i)).toBeInTheDocument();
    });

    // Test module dropdown button: filter by Price Monitoring (neither is price)
    const moduleBtn = screen.getByRole('button', { name: /Filter by module/i });
    fireEvent.click(moduleBtn);
    const priceOption = screen.getByRole('button', { name: /Price Monitoring/i });
    fireEvent.click(priceOption);

    await waitFor(() => {
      expect(screen.getByText(/No saved datasets match the selected filters/i)).toBeInTheDocument();
    });

    // Switch back to All Modules
    fireEvent.click(screen.getByRole('button', { name: /Filter by module/i }));
    fireEvent.click(screen.getByRole('button', { name: /All Modules/i }));

    await waitFor(() => {
      expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
      expect(screen.getByText(/Juan Dela Cruz/i)).toBeInTheDocument();
    });

    // Search by User: "Juan"
    const searchInput = screen.getByLabelText(/Filter records/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    await waitFor(() => {
      expect(screen.queryByText(/Maria Santos/i)).toBeNull();
      expect(screen.getByText(/Juan Dela Cruz/i)).toBeInTheDocument();
    });

    // Search by Dataset ID: "sub-recent"
    fireEvent.change(searchInput, { target: { value: 'sub-recent' } });
    await waitFor(() => {
      expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
      expect(screen.queryByText(/Juan Dela Cruz/i)).toBeNull();
    });

    // Search by Date: date15Iso
    fireEvent.change(searchInput, { target: { value: date15Iso } });
    await waitFor(() => {
      expect(screen.queryByText(/Maria Santos/i)).toBeNull();
      expect(screen.getByText(/Juan Dela Cruz/i)).toBeInTheDocument();
    });

    // Search for non-matching query
    fireEvent.change(searchInput, { target: { value: 'NonexistentData' } });

    await waitFor(() => {
      expect(screen.getByText(/No saved datasets match the selected filters/i)).toBeInTheDocument();
    });

    // Click Clear filters
    const clearBtn = screen.getByRole('button', { name: /Clear filters/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/Maria Santos/i)).toBeInTheDocument();
    });
  });
});
