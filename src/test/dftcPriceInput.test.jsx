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
    if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
      bodies.push(JSON.parse(opts.body));
      return { ok: true, status: 201, json: async () => ({ id: 'SUB-1', status: 'Saved' }) };
    }
    return fetchImpl(url, opts);
  });
  renderWithFetch(global.fetch);
  fireEvent.change(expandLowland()[0], { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
  await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
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

describe('DFTCPriceInput prefill provenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The memo is module-level and survives across tests in this file.
    clearPrefillCache();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('leaves every input empty when only old records exist and the fresh date has none', async () => {
    // Regression: the report-preview endpoint resolves price_date <= day, so a
    // date with no rows of its own rendered a three-week-old price as today's.
    renderWithFetch(byDayOn([THREE_WEEKS_AGO]));

    // Give the lookup a chance to land before asserting emptiness.
    await waitFor(() => {
      expect(global.fetch.mock.calls.some((c) => c[0].includes('/dftc/prices/by-day'))).toBe(true);
    });
    await new Promise((r) => setTimeout(r, 50));

    expect(screen.queryByText(/Amending existing entry/i)).not.toBeInTheDocument();
    const inputs = expandLowland();
    expect(inputs[0].value).toBe('');
    expect(screen.queryByText(/Starting point from/i)).not.toBeInTheDocument();
    expect(screen.getByText('Review (0)')).toBeInTheDocument();
  });

  it('clears the form when switching from a full date to one with zero records', async () => {
    // The defect report: 2026-10-01..03 hold no rows at any age, so opening one
    // of them showed the previously selected date's numbers and saved them under
    // the wrong date. Both the empty result and the failed request must clear.
    const EMPTY_DAY = isoDaysAgo(30);
    const HANGING_DAY = isoDaysAgo(31);
    const base = byDayOn([TODAY, YESTERDAY]);
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/prices/by-day')) {
        const date = new URL(url, 'http://x').searchParams.get('reporting_date');
        // Never settles: the point is that the form must not keep showing the
        // previous date's numbers while the new lookup is still in flight.
        if (date === HANGING_DAY || date === isoDaysAgo(32)) return new Promise(() => {});
      }
      return base(url, opts);
    }));

    await waitFor(() => {
      expect(screen.getByText('Review (2)')).toBeInTheDocument();
    });

    const datePicker = screen.getByLabelText(/Date:/i);

    // Cleared synchronously, not after the response arrives.
    fireEvent.change(datePicker, { target: { value: HANGING_DAY } });
    expect(expandLowland()[0].value).toBe('');
    expect(screen.getByText('Review (0)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Today/i }));
    await waitFor(() => expect(screen.getByText('Review (2)')).toBeInTheDocument());

    fireEvent.change(datePicker, { target: { value: EMPTY_DAY } });

    // That day, and the day before it, have no records at all.
    await waitFor(() => {
      expect(screen.getByText('Review (0)')).toBeInTheDocument();
    });
    expect(expandLowland()[0].value).toBe('');
    expect(screen.queryByText(/Amending existing entry/i)).not.toBeInTheDocument();
  });

  it('prefills from the previous day, marks the rows, and omits untouched values from the payload', async () => {
    renderWithFetch(byDayOn([YESTERDAY]));

    await waitFor(() => {
      expect(screen.getByText(/Starting point from/i)).toBeInTheDocument();
    });
    const inputs = expandLowland();
    expect(inputs[0].value).toBe('35');
    // Untouched carried values are not counted as entries to save.
    expect(screen.getByText('Review (0)')).toBeInTheDocument();
    expect(screen.getAllByText(/from /i).length).toBeGreaterThan(0);

    // Type the one value; only that one may reach the payload.
    fireEvent.change(inputs[0], { target: { value: '40' } });
    await waitFor(() => expect(screen.getByText('Review (1)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    // No removal may be issued for a previous-day row: it has no row on this date.
    await waitFor(() => expect(screen.getByText(/Saving Price Monitoring Data/i)).toBeInTheDocument());
  });

  it('sends an edited carried value and never an untouched one', async () => {
    const bodies = [];
    const base = byDayOn([YESTERDAY]);
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        bodies.push(JSON.parse(opts.body));
        return { ok: true, status: 201, json: async () => ({ id: 'SUB-2', status: 'Saved' }) };
      }
      return base(url, opts);
    }));

    await waitFor(() => {
      expect(screen.getByText(/Starting point from/i)).toBeInTheDocument();
    });
    const inputs = expandLowland();
    expect(inputs[BATONG_INPUT_INDEX].value).toBe('20');

    // Ampalaya is edited; Batong stays as carried.
    fireEvent.change(inputs[0], { target: { value: '41' } });

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    const retailBody = bodies.find((b) => b.price_type === 'Retail' && b.source_id === 'bankerohan');
    expect(retailBody).toBeDefined();
    // Exactly the edited value — the untouched carried one is excluded.
    expect(retailBody.records).toHaveLength(1);
    expect(retailBody.records[0].commodity_id).toBe('com-1');
    expect(retailBody.records[0].prevail_price).toBe(41);
    expect(retailBody.remove_records).toEqual([]);
  });

  it('amends same-day records and removes one when the field is cleared', async () => {
    const bodies = [];
    const base = byDayOn([TODAY]);
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        bodies.push(JSON.parse(opts.body));
        return { ok: true, status: 201, json: async () => ({ id: 'SUB-3', status: 'Saved' }) };
      }
      return base(url, opts);
    }));

    await waitFor(() => {
      expect(screen.getByText(/Amending existing entry/i)).toBeInTheDocument();
    });
    const inputs = expandLowland();
    expect(inputs[0].value).toBe('35');
    expect(inputs[BATONG_INPUT_INDEX].value).toBe('20');
    // Same-day values count as entries; there is no previous-day carry here.
    expect(screen.getByText('Review (2)')).toBeInTheDocument();

    fireEvent.change(inputs[0], { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('Review (1)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    const retailBody = bodies.find((b) => b.price_type === 'Retail' && b.source_id === 'bankerohan');
    // The cleared row is deleted; the untouched sibling is re-saved, not deleted.
    expect(retailBody.remove_records).toEqual([AMPALAYA_DB_ID]);
    expect(retailBody.records.map((r) => r.commodity_id)).toEqual(['com-2']);
  });

  it('still loads the other four markets when one market ref returns 404', async () => {
    const base = byDayOn([YESTERDAY]);
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/prices/by-day')) {
        const q = new URL(url, 'http://x').searchParams;
        if (q.get('price_type') === 'Landing' && q.get('reporting_date') === YESTERDAY) {
          return { ok: false, status: 404, json: async () => ({ detail: "Source 'bankerohan' not found." }) };
        }
      }
      return base(url, opts);
    }));

    // One rejected request must not discard the other four markets' prefill.
    await waitFor(() => {
      expect(screen.getByText(/Starting point from/i)).toBeInTheDocument();
    });
    expect(expandLowland()[0].value).toBe('35');
  });

  it('writes only the vids the user typed on a date with no same-day records', async () => {
    // Payload-level guard. Rendering assertions pass with or without the
    // carried-value exclusion, which is why they never caught the defect:
    // the numbers were on screen either way, and the wrong ones got saved.
    const bodies = await saveAndCapture(byDayOn([YESTERDAY]));

    for (const body of bodies) {
      const ids = body.records.map((r) => r.commodity_id).sort();
      expect(ids).toEqual([AMPALAYA_DB_ID]);
      // Nothing from the previous day may be deleted on this date.
      expect(body.remove_records ?? []).toEqual([]);
      expect(body.reporting_date).toBe(TODAY);
    }
  });

  it('keeps the carried and edited flags across an autosaved draft reload', async () => {
    // Without provenance in the draft, an F5 mid-session turns untouched
    // carried values back into values that get auto-saved.
    const first = renderWithFetch(byDayOn([YESTERDAY]));
    await waitFor(() => expect(screen.getByText(/Starting point from/i)).toBeInTheDocument());

    // Edit one of the two carried values; the other stays untouched.
    fireEvent.change(expandLowland()[0], { target: { value: '44' } });

    // Autosave fires after 1500ms.
    await waitFor(
      () => expect(localStorage.getItem('dftc_price_draft_data')).not.toBeNull(),
      { timeout: 4000 }
    );
    const draft = JSON.parse(localStorage.getItem('dftc_price_draft_data'));
    expect(draft.carried['bangkerohan-retail'].length).toBeGreaterThan(0);
    expect(draft.dirty.length).toBeGreaterThan(0);

    // Resume that draft in a fresh mount and save.
    first.unmount();
    const bodies = [];
    const base = mockFetch();
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        bodies.push(JSON.parse(opts.body));
        return { ok: true, status: 201, json: async () => ({ id: 'SUB-9', status: 'Saved' }) };
      }
      return base(url, opts);
    }));
    fireEvent.click(await screen.findByRole('button', { name: /Resume Draft/i }));

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    const retailBody = bodies.find((b) => b.price_type === 'Retail' && b.source_id === 'bankerohan');
    expect(retailBody.records.map((r) => r.commodity_id)).toEqual([AMPALAYA_DB_ID]);
    expect(retailBody.remove_records).toEqual([]);
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

    const bodies = [];
    const base = mockFetch();
    renderWithFetch(vi.fn(async (url, opts) => {
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        bodies.push(JSON.parse(opts.body));
        return { ok: true, status: 201, json: async () => ({ id: 'SUB-8', status: 'Saved' }) };
      }
      return base(url, opts);
    }));

    fireEvent.click(await screen.findByRole('button', { name: /Resume Draft/i }));
    await waitFor(() => expect(screen.getByText('Review (1)')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Price Monitoring/i }));
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    await waitFor(() => expect(bodies.length).toBeGreaterThan(0));
    const retailBody = bodies.find((b) => b.price_type === 'Retail' && b.source_id === 'bankerohan');
    expect(retailBody.records.map((r) => r.commodity_id)).toEqual([AMPALAYA_DB_ID]);
  });
});


