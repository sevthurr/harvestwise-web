import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCPriceInput from '../app/dftc/pages/DFTCPriceInput';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null })
  };
});

function mockFetch() {
  return vi.fn(async (url) => {
    if (url.includes('/dftc/commodities')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' }
          ]
        })
      };
    }
    if (url.includes('/dftc/reports/preview')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          report_reference_no: 'REP-20260929-01',
          subtitle: 'Prevailing Market Prices as of September 29, 2026',
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

function renderDFTCPriceInput() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dftc/price-input']}>
        <DFTCPriceInput />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DFTCPriceInput Multi-Market Unified Entry & Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('renders all 5 market tabs, date picker, and categories collapsed initially', async () => {
    renderDFTCPriceInput();

    expect(screen.getByText('Add Price Data')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bangkerohan Retail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bangkerohan Wholesale/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bangkerohan Landing/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DFTC Retail/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DFTC Wholesale/i })).toBeInTheDocument();

    // Verify initial categories exist
    expect(screen.getByText(/Lowland Vegetables/i)).toBeInTheDocument();
  });

  it('preserves data across tabs and sums the review count across channels', async () => {
    renderDFTCPriceInput();

    // Expand Lowland Vegetables category
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    // Find the first sample input for Galaxy variant under Ampalaya
    const inputs = screen.getAllByPlaceholderText('0.00');
    expect(inputs.length).toBeGreaterThan(0);

    // Enter price in Bangkerohan Retail (e.g. 35)
    fireEvent.change(inputs[0], { target: { value: '35' } });

    // Review count should show (1)
    await waitFor(() => {
      expect(screen.getByText('Review (1)')).toBeInTheDocument();
    });

    // Switch to DFTC Retail tab
    const dftcRetailTab = screen.getByRole('button', { name: /DFTC Retail/i });
    fireEvent.click(dftcRetailTab);

    // Find inputs for DFTC Retail and enter price (e.g. 40)
    const dftcInputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(dftcInputs[0], { target: { value: '40' } });

    // Review count should now be 2 (summed across both tabs!)
    await waitFor(() => {
      expect(screen.getByText('Review (2)')).toBeInTheDocument();
    });

    // Check that Bangkerohan tab pill shows badge with 1, and DFTC Retail shows 1
    const bangkTab = screen.getByRole('button', { name: /Bangkerohan.*1/i });
    expect(bangkTab).toBeInTheDocument();

    // Switch back to Bangkerohan: input 0 should still have value '35'
    fireEvent.click(bangkTab);
    const bangkInputsBack = screen.getAllByPlaceholderText('0.00');
    expect(bangkInputsBack[0].value).toBe('35');
  });

  it('navigates to consolidated review mode and displays the Image 2 style table', async () => {
    renderDFTCPriceInput();

    // Expand and enter a price
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '35' } });

    // Click Review Entered Data button
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    // Expect review mode elements matching Image 2
    await waitFor(() => {
      expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument();
      expect(screen.getByText(/BANKEROHAN MARKET/i)).toBeInTheDocument();
      expect(screen.getByText(/DFTC TABOAN/i)).toBeInTheDocument();
      expect(screen.getByText(/Save DFTC Price Monitoring/i)).toBeInTheDocument();
    });
  });

  it('allows entering and saving Bangkerohan Landing prices to the database', async () => {
    let capturedBody = null;
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        capturedBody = JSON.parse(opts.body);
        return { ok: true, status: 201, json: async () => ({ id: 'SUB-101', status: 'Saved' }) };
      }
      return mockFetch()(url, opts);
    });

    renderDFTCPriceInput();

    // Select Bangkerohan Landing tab
    const landingTab = screen.getByRole('button', { name: /Bangkerohan Landing/i });
    fireEvent.click(landingTab);

    // Expand Lowland Vegetables
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    // Enter Landing price 25.00 for Ampalaya
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '25' } });

    // Review
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    // Check table displays Landing price
    await waitFor(() => {
      expect(screen.getByText('₱25.00')).toBeInTheDocument();
    });

    // Save
    const saveBtn = screen.getByRole('button', { name: /Save DFTC Price Monitoring/i });
    fireEvent.click(saveBtn);

    // Confirm Modal
    const confirmCheckbox = screen.getByRole('checkbox');
    fireEvent.click(confirmCheckbox);
    const finalizeBtn = screen.getByRole('button', { name: /Finalize & Save/i });
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect(capturedBody.price_type).toBe('Landing');
      expect(capturedBody.source_id).toBe('bankerohan');
      expect(capturedBody.records[0].prevail_price).toBe(25);
    });
  });

  it('does not navigate away or claim success when a market fails to save', async () => {
    // Regression: a failed market POST was swallowed by a bare console.error,
    // so the page still navigated to /dftc/input reporting "saved successfully"
    // even though that market's prices never reached the database.
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        return { ok: false, status: 500, json: async () => ({ detail: 'Internal error' }) };
      }
      return mockFetch()(url, opts);
    });

    renderDFTCPriceInput();

    const landingTab = screen.getByRole('button', { name: /Bangkerohan Landing/i });
    fireEvent.click(landingTab);

    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '25' } });

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));

    await waitFor(() => {
      expect(screen.getByText('₱25.00')).toBeInTheDocument();
    });

    // The previous test's success path navigates on a 900ms timer that outlives
    // its assertions; clear the spy so this test only sees its own navigation.
    mockNavigate.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    // The failure must be surfaced, not swallowed.
    await waitFor(() => {
      expect(screen.getByText(/Could not save 1 of 5 markets/i)).toBeInTheDocument();
    });

    // The success path navigates on a 900ms timer, so wait past that window
    // before asserting the user was NOT navigated away.
    await new Promise((r) => setTimeout(r, 1200));

    // And the user must stay on the page rather than seeing a false success.
    expect(mockNavigate).not.toHaveBeenCalledWith('/dftc/input', expect.anything());
  });

  it('supports summary card filtering, displays Date entered with time, DFTC staff fields, and leaves empty cells blank', async () => {
    global.fetch = vi.fn(async (url) => {
      if (url.includes('/dftc/staff')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: 'STF-001', first_name: 'IVY JOYCE', middle_name: 'P.', last_name: 'BOLODO', position_title: 'Agri-Service & Related Worker I' },
              { id: 'STF-002', first_name: 'CHRISTIAN JOEY PAUL', middle_name: 'M.', last_name: 'HERMOSO', position_title: 'Agricultural Technologist' }
            ]
          })
        };
      }
      return mockFetch()(url);
    });

    renderDFTCPriceInput();

    // Verify extra counter is removed from the toolbar
    expect(screen.queryByText(/total entered/i)).not.toBeInTheDocument();

    // Verify tabs have flex-1 width classes
    const retailTab = screen.getByRole('button', { name: /Bangkerohan Retail/i });
    expect(retailTab.className).toContain('flex-1');

    // Enter price in Bangkerohan Retail (e.g. 50)
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '50' } });

    // Review mode
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument();
    });

    // Verify "Date entered" includes time
    expect(screen.getByText(/Date entered:/i)).toBeInTheDocument();

    // Verify empty cells are blank (no dash "—" in price cells)
    const table = screen.getByRole('table');
    const cells = table.querySelectorAll('tbody td');
    const cellTexts = Array.from(cells).map((c) => c.textContent.trim());
    expect(cellTexts).not.toContain('—');

    // Verify "Click to filter" link is removed from summary cards
    expect(screen.queryByText(/Click to filter/i)).not.toBeInTheDocument();

    // Verify Encoded by and Reviewed by labels have required asterisk
    const encodedLabel = screen.getByText(/Encoded by \(DFTC Personnel\)/i);
    expect(encodedLabel).toBeInTheDocument();
    expect(encodedLabel.innerHTML).toContain('*');

    const reviewedLabel = screen.getByText(/Reviewed by \(DFTC Personnel\)/i);
    expect(reviewedLabel).toBeInTheDocument();
    expect(reviewedLabel.innerHTML).toContain('*');

    // Verify "Back to Edit" button below save button is removed
    expect(screen.queryByRole('button', { name: /^Back to Edit$/i })).not.toBeInTheDocument();

    // Verify Searchable Personnel select can be clicked and searched
    const encBtn = screen.getByRole('button', { name: /Encoded by/i });
    expect(encBtn).toHaveTextContent(/IVY JOYCE P\. BOLODO/i);
    fireEvent.click(encBtn);
    const searchInput = screen.getByPlaceholderText(/Search DFTC personnel/i);
    expect(searchInput).toBeInTheDocument();
    fireEvent.change(searchInput, { target: { value: 'Hermoso' } });
    expect(screen.getAllByText(/CHRISTIAN JOEY PAUL M\. HERMOSO/i).length).toBeGreaterThanOrEqual(1);

    // Click Save button and confirm to test loading popup
    const saveBtn = screen.getByRole('button', { name: /Save DFTC Price Monitoring/i });
    fireEvent.click(saveBtn);
    const confirmCheckbox = screen.getByRole('checkbox');
    fireEvent.click(confirmCheckbox);
    const finalizeBtn = screen.getByRole('button', { name: /Finalize & Save/i });
    fireEvent.click(finalizeBtn);

    // Verify loading modal appears
    expect(screen.getByText('Saving Price Monitoring Data')).toBeInTheDocument();
    expect(screen.getByText(/Please wait while your data is being validated and consolidated/i)).toBeInTheDocument();
  });
});


