import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCPriceInput from '../app/dftc/pages/DFTCPriceInput';
import { clearPrefillCache } from '../app/dftc/pages/dftcPricePrefill';

// The catalog row the form renders. PRICE_CATEGORIES is rendered from the DB
// catalog map, so the slug below is what resolveCommodityId looks up.
const AMPALAYA_DB_ID = 'com-1';

const AMPALAYA_BY_DAY_ITEM = {
  commodity_id: AMPALAYA_DB_ID,
  commodity_name: 'Ampalaya',
  variety: 'Galaxy',
  category: 'Lowland Vegetables',
  uom: 'kg',
  price_min: 35,
  price_max: 35,
  prevail_price: 35,
  observation_status: 'Reported value'
};

const BATONG_BY_DAY_ITEM = {
  commodity_id: 'com-2',
  commodity_name: 'Batong',
  variety: 'Negrostar',
  category: 'Lowland Vegetables',
  uom: 'kg',
  price_min: 20,
  price_max: 20,
  prevail_price: 20,
  observation_status: 'Reported value'
};

// Each variant renders 5 sample inputs, so Batong — the second commodity in the
// category — starts at input index 5, not 1.
const BATONG_INPUT_INDEX = 5;

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

const TODAY = isoDaysAgo(0);
const YESTERDAY = isoDaysAgo(1);
const THREE_WEEKS_AGO = isoDaysAgo(21);

/**
 * by-day returns records for the dates in `dates`, but only for the Bangkerohan
 * Retail tab. The other four tabs stay empty, which keeps the per-tab carry rule
 * observable and the counts unambiguous.
 */
function byDayOn(dates) {
  const set = new Set(dates);
  return vi.fn(async (url) => {
    if (url.includes('/dftc/price-draft')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: null,
          reporting_date: new URL(url, 'http://x').searchParams.get('reporting_date'),
          status: 'draft',
          cells: []
        })
      };
    }
    if (url.includes('/dftc/prices/by-day')) {
      const q = new URL(url, 'http://x').searchParams;
      const bangkerohanRetail =
        q.get('source_id') === 'bankerohan' && q.get('price_type') === 'Retail';
      const items = set.has(q.get('reporting_date')) && bangkerohanRetail
        ? [AMPALAYA_BY_DAY_ITEM, BATONG_BY_DAY_ITEM]
        : [];
      return { ok: true, status: 200, json: async () => ({ items, total: items.length }) };
    }
    return mockFetch()(url);
  });
}

function renderWithFetch(fetchImpl) {
  global.fetch = fetchImpl;
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

/** Expand the first category (idempotent) and return its sample inputs. */
function expandLowland() {
  const open = screen.queryAllByPlaceholderText('0.00');
  if (open.length === 0) {
    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));
  }
  return screen.getAllByPlaceholderText('0.00');
}

/** Fill in one price, review, confirm, and return every captured POST body. */
async function saveAndCapture(fetchImpl) {
  const bodies = [];
  global.fetch = vi.fn(async (url, opts) => {
    if (url.includes('/dftc/price-draft/finalize') && opts?.method === 'POST') {
      bodies.push(JSON.parse(opts.body));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'SUB-1',
          source_id: 'SRC-0001',
          data_type: 'price',
          price_type: null,
          reporting_date: TODAY,
          submission_method: 'Manual Input',
          submitted_by_user_id: 'USR-1',
          submitted_by_name: null,
          last_edited_by_user_id: 'USR-1',
          status: 'Saved',
          saved_at: new Date().toISOString(),
          validation_completed_at: null,
          generated_report_id: null,
          created_at: new Date().toISOString(),
          record_count: 1,
        }),
      };
    }
    return fetchImpl(url, opts);
  });
  renderWithFetch(global.fetch);
  fireEvent.change(expandLowland()[0], { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
  await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));
  await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
  return bodies;
}

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
            { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
            { id: 'com-2', name: 'Batong', variety: 'Negrostar', category: 'Lowland Vegetables', unit_of_measure: 'kg' }
          ]
        })
      };
    }
    // Exact-date lookup. /dftc/reports/preview must never be used here: it
    // resolves price_date <= day and would carry an older day's prices forward.
    if (url.includes('/dftc/prices/by-day')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          source_id: 'src-1',
          price_type: 'Retail',
          reporting_date: new URL(url, 'http://x').searchParams.get('reporting_date'),
          items: [],
          total: 0
        })
      };
    }
    // Shared draft for the day. Empty by default: no cells, status "draft".
    if (url.includes('/dftc/price-draft')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: null,
          reporting_date: new URL(url, 'http://x').searchParams.get('reporting_date'),
          status: 'draft',
          cells: []
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
    // Session memo is module-level and outlives a test file run.
    clearPrefillCache();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('never requests the carry-forward report preview endpoint', async () => {
    renderDFTCPriceInput();

    await waitFor(() => {
      const called = global.fetch.mock.calls.map((c) => c[0]);
      expect(called.some((u) => u.includes('/dftc/prices/by-day'))).toBe(true);
    });
    const called = global.fetch.mock.calls.map((c) => c[0]);
    expect(called.some((u) => u.includes('/dftc/reports/preview'))).toBe(false);
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
      expect(screen.getByText(/Finalize DFTC Price Monitoring/i)).toBeInTheDocument();
    });
  });

  it('allows entering and saving Bangkerohan Landing prices to the database', async () => {
    let capturedBody = null;
    const cells = [];
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'PUT') {
        cells.push(JSON.parse(opts.body));
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DCL-1',
            commodity_id: body.commodity_id,
            source_id: body.source_id,
            price_type: body.price_type,
            uom: body.uom,
            price_min: body.price_min,
            price_max: body.price_max,
            prevail_price: body.prevail_price,
            observation_status: body.observation_status,
            version: 1,
            updated_by_user_id: 'USR-1',
            updated_at: new Date().toISOString(),
          }),
        };
      }
      if (url.includes('/dftc/price-draft/finalize') && opts?.method === 'POST') {
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'SUB-101',
            source_id: 'SRC-0001',
            data_type: 'price',
            price_type: null,
            reporting_date: TODAY,
            submission_method: 'Manual Input',
            submitted_by_user_id: 'USR-1',
            submitted_by_name: null,
            last_edited_by_user_id: 'USR-1',
            status: 'Saved',
            saved_at: new Date().toISOString(),
            validation_completed_at: null,
            generated_report_id: null,
            created_at: new Date().toISOString(),
            record_count: 1,
          }),
        };
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

    // Finalize the shared draft.
    const saveBtn = screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i });
    fireEvent.click(saveBtn);

    // Confirm Modal
    const confirmCheckbox = screen.getByRole('checkbox');
    fireEvent.click(confirmCheckbox);
    const finalizeBtn = screen.getByRole('button', { name: /Finalize & Save/i });
    fireEvent.click(finalizeBtn);

    // finalize posts the reporting date; the per-cell truth (source, price_type,
    // price) travels on the draft-cell PUTs that precede it.
    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    });
    expect(capturedBody.reporting_date).toBe(TODAY);

    await waitFor(() => {
      expect(cells.length).toBeGreaterThan(0);
    });
    const landingCell = cells.find((c) => c.price_type === 'Landing');
    expect(landingCell).toBeTruthy();
    expect(landingCell.source_id).toBe('bankerohan');
    expect(landingCell.prevail_price).toBe(25);
  });

  it('does not navigate away or claim success when finalize fails', async () => {
    // Regression: a failed write was swallowed by a bare console.error, so the
    // page still navigated to /dftc/input reporting "saved successfully" even
    // though that day's prices never reached the database.
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DCL-1',
            commodity_id: body.commodity_id,
            source_id: body.source_id,
            price_type: body.price_type,
            uom: body.uom,
            price_min: body.price_min,
            price_max: body.price_max,
            prevail_price: body.prevail_price,
            observation_status: body.observation_status,
            version: 1,
            updated_by_user_id: 'USR-1',
            updated_at: new Date().toISOString(),
          }),
        };
      }
      if (url.includes('/dftc/price-draft/finalize') && opts?.method === 'POST') {
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

    fireEvent.click(screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    // The failure must be surfaced, not swallowed.
    await waitFor(() => {
      expect(screen.getByText(/Could not finalize/i)).toBeInTheDocument();
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
    // The review is a complete commodity sheet, not only the rows with input.
    expect(table).toHaveTextContent('Kamatis');
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

    // Click Finalize and confirm to test loading popup
    const saveBtn = screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i });
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

describe('DFTCPriceInput prefill provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The memo is module-level and survives across tests in this file.
    clearPrefillCache();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('keeps a day with no draft or records empty and does not carry prices forward', async () => {
    // Reversed by the shared-draft change: today is no longer a blank capture
    // surface. What still holds is that a day with neither a draft nor records
    // renders empty, and that no previous-day price is carried into it.
    renderWithFetch(byDayOn([THREE_WEEKS_AGO]));

    await waitFor(() => expect(screen.getByText('Review (0)')).toBeInTheDocument());

    expect(screen.queryByText(/Amending existing entry/i)).not.toBeInTheDocument();
    const inputs = expandLowland();
    expect(inputs[0].value).toBe('');
    expect(screen.queryByText(/Starting point from/i)).not.toBeInTheDocument();
  });

  it('clears the form when switching from a full date to one with zero records', async () => {
    // The defect report: 2026-10-01..03 hold no rows at any age, so opening one
    // of them showed the previously selected date's numbers and saved them under
    // the wrong date. Both the empty result and the failed request must clear.
    const EMPTY_DAY = isoDaysAgo(30);
    const HANGING_DAY = isoDaysAgo(31);
    const historicalDay = isoDaysAgo(2);
    const base = byDayOn([historicalDay]);
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/prices/by-day')) {
        const date = new URL(url, 'http://x').searchParams.get('reporting_date');
        // Never settles: the point is that the form must not keep showing the
        // previous date's numbers while the new lookup is still in flight.
        if (date === HANGING_DAY || date === isoDaysAgo(32)) return new Promise(() => {});
      }
      return base(url, opts);
    }));

    const datePicker = screen.getByLabelText(/Date:/i);
    fireEvent.change(datePicker, { target: { value: historicalDay } });
    await waitFor(() => expect(screen.getByText('Review (2)')).toBeInTheDocument());

    // Cleared synchronously, not after the response arrives.
    fireEvent.change(datePicker, { target: { value: HANGING_DAY } });
    expect(expandLowland()[0].value).toBe('');
    expect(screen.getByText('Review (0)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Today/i }));
    await waitFor(() => expect(screen.getByText('Review (0)')).toBeInTheDocument());

    fireEvent.change(datePicker, { target: { value: EMPTY_DAY } });

    // That day, and the day before it, have no records at all.
    await waitFor(() => {
      expect(screen.getByText('Review (0)')).toBeInTheDocument();
    });
    expect(expandLowland()[0].value).toBe('');
    expect(screen.queryByText(/Amending existing entry/i)).not.toBeInTheDocument();
  });

  it('amends a draft cell and deletes it when the field is cleared', async () => {
    // The meaningful clear case: the cell already exists in the SHARED DRAFT
    // (another inputter put it there, or it was autosaved earlier). Clearing it
    // must remove it from the draft with a DELETE, not leave a stale value for
    // finalize to resurrect. A cell that only came from a record prefill has no
    // draft row, so clearing it correctly sends nothing.
    const puts = [];
    const deletes = [];
    const finalizes = [];
    const amendDay = isoDaysAgo(2);
    const base = byDayOn([amendDay]);
    renderWithFetch(vi.fn(async (url, opts) => {
      // The shared draft holds one Ampalaya cell for the day being amended.
      if (url.includes('/dftc/price-draft?') && (opts?.method ?? 'GET') === 'GET') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DRF-1',
            reporting_date: amendDay,
            status: 'draft',
            cells: [
              {
                id: 'DCL-1',
                commodity_id: AMPALAYA_DB_ID,
                source_id: 'bankerohan',
                price_type: 'Retail',
                uom: 'kg',
                price_min: 35,
                price_max: 35,
                prevail_price: 35,
                observation_status: 'Reported value',
                version: 1,
                updated_by_user_id: 'USR-9',
                updated_at: new Date().toISOString(),
              },
            ],
          }),
        };
      }
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        puts.push(body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DCL-2',
            commodity_id: body.commodity_id,
            source_id: body.source_id,
            price_type: body.price_type,
            uom: body.uom,
            price_min: body.price_min,
            price_max: body.price_max,
            prevail_price: body.prevail_price,
            observation_status: body.observation_status,
            version: 2,
            updated_by_user_id: 'USR-1',
            updated_at: new Date().toISOString(),
          }),
        };
      }
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'DELETE') {
        deletes.push(new URL(url, 'http://x').searchParams);
        return { ok: true, status: 204, json: async () => ({}) };
      }
      if (url.includes('/dftc/price-draft/finalize') && opts?.method === 'POST') {
        finalizes.push(JSON.parse(opts.body));
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'SUB-3',
            source_id: 'SRC-0001',
            data_type: 'price',
            price_type: null,
            reporting_date: amendDay,
            submission_method: 'Manual Input',
            submitted_by_user_id: 'USR-1',
            submitted_by_name: null,
            last_edited_by_user_id: 'USR-1',
            status: 'Saved',
            saved_at: new Date().toISOString(),
            validation_completed_at: null,
            generated_report_id: null,
            created_at: new Date().toISOString(),
            record_count: 1,
          }),
        };
      }
      return base(url, opts);
    }));

    fireEvent.change(screen.getByLabelText(/Date:/i), { target: { value: amendDay } });
    await waitFor(() => expect(screen.getByText(/Amending existing entry/i)).toBeInTheDocument());
    const inputs = expandLowland();
    // The draft cell (35) wins over the record prefill for the same variant.
    expect(inputs[0].value).toBe('35');
    expect(inputs[BATONG_INPUT_INDEX].value).toBe('20');
    expect(screen.getByText('Review (2)')).toBeInTheDocument();

    // Clear the drafted cell. Its key is in the shared draft, so this must DELETE
    // it rather than push a PUT.
    fireEvent.change(inputs[0], { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('Review (1)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    // Clear -> DELETE for the drafted Ampalaya cell; never a PUT for it.
    await waitFor(() => expect(deletes.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(deletes.some((q) => q.get('commodity_id') === AMPALAYA_DB_ID)).toBe(true);
    expect(puts.some((p) => p.commodity_id === AMPALAYA_DB_ID)).toBe(false);
    await waitFor(() => expect(finalizes.length).toBeGreaterThan(0));
  });

  it('writes only the vids the user typed on a date with no same-day records', async () => {
    // Payload-level guard. Rendering assertions pass with or without the
    // carried-value exclusion, which is why they never caught the defect:
    // the numbers were on screen either way, and the wrong ones got saved.
    // Under the shared-draft flow the per-cell PUT is the payload that matters:
    // an untouched previous-day value must never be written.
    const puts = [];
    const base = byDayOn([YESTERDAY]);
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        puts.push(body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DCL-1',
            commodity_id: body.commodity_id,
            source_id: body.source_id,
            price_type: body.price_type,
            uom: body.uom,
            price_min: body.price_min,
            price_max: body.price_max,
            prevail_price: body.prevail_price,
            observation_status: body.observation_status,
            version: 1,
            updated_by_user_id: 'USR-1',
            updated_at: new Date().toISOString(),
          }),
        };
      }
      return base(url, opts);
    });

    renderWithFetch(global.fetch);
    fireEvent.change(expandLowland()[0], { target: { value: '25' } });

    // The autosave debounce is 1500ms, so the default 1000ms waitFor is too short.
    await waitFor(() => expect(puts.length).toBeGreaterThan(0), { timeout: 3000 });
    for (const body of puts) {
      expect(body.commodity_id).toBe(AMPALAYA_DB_ID);
      expect(body.reporting_date).toBe(TODAY);
    }
  });

  it('treats a draft stored without provenance as all same-day', async () => {
    // Backward compatibility: a draft written by the previous code has no
    // `carried` key. Restoring it as carried would silently drop the values the
    // user retyped.
    const legacyField = {
      samples: ['30', '', '', '', ''],
      uom: 'kg',
      low: 30,
      high: 30,
      prevailing: 30
    };
    localStorage.setItem('dftc_price_draft', 'true');
    localStorage.setItem(
      'dftc_price_draft_data',
      JSON.stringify({
        selectedDate: TODAY,
        tabFields: { 'bangkerohan-retail': { 'ampalaya-galaxy': legacyField } },
        customVariants: {},
        customCommodities: {}
      })
    );

    const puts = [];
    const base = mockFetch();
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/price-draft/cell') && opts?.method === 'PUT') {
        const body = JSON.parse(opts.body);
        puts.push(body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'DCL-1',
            commodity_id: body.commodity_id,
            source_id: body.source_id,
            price_type: body.price_type,
            uom: body.uom,
            price_min: body.price_min,
            price_max: body.price_max,
            prevail_price: body.prevail_price,
            observation_status: body.observation_status,
            version: 1,
            updated_by_user_id: 'USR-1',
            updated_at: new Date().toISOString(),
          }),
        };
      }
      return base(url, opts);
    });
    renderWithFetch(global.fetch);

    fireEvent.click(await screen.findByRole('button', { name: /Resume Draft/i }));
    await waitFor(() => expect(screen.getByText('Review (1)')).toBeInTheDocument());

    // The restored value is present but the category is still collapsed, exactly
    // as an ordinary prefill leaves it — expand it to reach the input.
    const inputs = expandLowland();
    expect(inputs[0].value).toBe('30');

    // Touch the restored value so the autosave flushes it to the shared draft.
    // The value must differ: React suppresses onChange for a no-op change, so
    // retyping '30' would never dirty the cell.
    fireEvent.change(inputs[0], { target: { value: '31' } });

    // The autosave debounce is 1500ms, so the default 1000ms waitFor is too short.
    await waitFor(() => expect(puts.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(puts.map((p) => p.commodity_id)).toEqual([AMPALAYA_DB_ID]);
    expect(puts[0].prevail_price).toBe(31);
  });
});


