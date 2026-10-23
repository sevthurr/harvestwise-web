import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCArrivalInput from '../app/dftc/pages/DFTCArrivalInput';
import { PRICE_CATEGORIES } from '../app/dftc/pages/dftc-add-data-data';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null })
  };
});

// The catalogue the server answers with. A test may pass its own items; the
// default is the catalogue the other tests are written against.
const DEFAULT_CATALOGUE_ITEMS = [
  { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
  { id: 'com-2', name: 'Cabbage', variety: 'Scorpio', category: 'Highland Vegetables', unit_of_measure: 'kg' }
];

function mockFetch(catalogueItems = DEFAULT_CATALOGUE_ITEMS) {
  return vi.fn(async (url, opts) => {
    if (url.includes('/dftc/commodities')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: catalogueItems
        })
      };
    }
    if (url.includes('/dftc/staff')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { first_name: 'MARIA', last_name: 'SANTOS', position_title: 'DFTC Records Clerk' },
            { first_name: 'JUAN', last_name: 'DELA CRUZ', position_title: 'DFTC Supervisor' }
          ]
        })
      };
    }
    if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: 'Saved successfully',
          file_name: 'DFTC-Arrival-Volume-2026-09-30.xlsx'
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

function renderDFTCArrivalInput() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dftc/arrival-input']}>
        <DFTCArrivalInput />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DFTCArrivalInput Unified Entry & Excel-Aligned Review', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('renders period buttons (Daily, Weekly, Monthly), does NOT render redundant source tabs, and renders categories', async () => {
    renderDFTCArrivalInput();

    expect(screen.getByText('Add Arrival Volume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Daily/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Monthly/i })).toBeInTheDocument();

    // Redundant source tabs must NOT be in the tab navigation
    expect(screen.queryByRole('button', { name: /All Sources \(Combined\)/i })).toBeNull();

    expect(screen.getByText(/Lowland Vegetables/i)).toBeInTheDocument();
    expect(screen.getByText(/Highland Vegetables/i)).toBeInTheDocument();
  });

  it('allows switching between Daily, Weekly, and Monthly entry modes', async () => {
    renderDFTCArrivalInput();

    // Click Monthly button
    const monthlyBtn = screen.getByRole('button', { name: /Monthly/i });
    fireEvent.click(monthlyBtn);

    // Month & Year select dropdowns should be visible
    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();

    // Click Weekly button
    const weeklyBtn = screen.getByRole('button', { name: /Weekly/i });
    fireEvent.click(weeklyBtn);
    expect(screen.getByLabelText(/Select week of month/i)).toBeInTheDocument();
    expect(screen.getByText('Period:')).toBeInTheDocument();
  });

  it('supports selecting week number of month', async () => {
    renderDFTCArrivalInput();

    const weeklyBtn = screen.getByRole('button', { name: /Weekly/i });
    fireEvent.click(weeklyBtn);

    // The week options are generated for the currently selected month, which
    // defaults to the real current month — derive the expected label.
    const shortMonth = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'][new Date().getMonth()]
      .slice(0, 3);

    // Week select dropdown should be available with week options
    const weekSelect = screen.getByLabelText(/Select week of month/i);
    expect(screen.getByText(new RegExp(`Week 1 \\(${shortMonth} 1 – 7\\)`, 'i'))).toBeInTheDocument();
    fireEvent.change(weekSelect, { target: { value: '1' } });
    expect(weekSelect.value).toBe('1');
  });

  it('renders icon-based commodity headers, column headers without (kg), selectable units, and calculates total with unit', async () => {
    renderDFTCArrivalInput();

    // Expand Lowland Vegetables category
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    // Column headers should NOT have "(kg)"
    expect(screen.getAllByText('Farm Source').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Other Sources').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Combined Total').length).toBeGreaterThan(0);
    expect(screen.queryByText('Farm Source (kg)')).toBeNull();
    expect(screen.queryByText('Other Sources (kg)')).toBeNull();
    expect(screen.queryByText('Combined Total (kg)')).toBeNull();

    // Commodity header (Ampalaya) and variant (Galaxy)
    expect(screen.getByText('Ampalaya')).toBeInTheDocument();
    expect(screen.getAllByText('Galaxy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+ Add Variant').length).toBeGreaterThan(0);

    // Change unit to MT
    const uomSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(uomSelect, { target: { value: 'kg' } });

    // Look for inputs (Farm Source and Other Sources have placeholder="0")
    const inputs = screen.getAllByPlaceholderText('0');
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    // Enter 500 for Farm Source and 250 for Other Sources
    fireEvent.change(inputs[0], { target: { value: '500' } });
    fireEvent.change(inputs[1], { target: { value: '250' } });

    // Review hyperlink at top should show (1)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Review \(1\)/i })).toBeInTheDocument();
    });

    // Check calculated combined column shows 750 kg
    expect(screen.getAllByText(/750.*kg/).length).toBeGreaterThan(0);
  });

  it('clicking the top "Review (count)" hyperlink directly opens the Review page', async () => {
    renderDFTCArrivalInput();

    // Expand category and enter volume
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '1200' } });

    // Wait for the Review button to become enabled
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Review \(1\)/i })).toBeInTheDocument();
    });

    // Click the top Review hyperlink
    const topReviewLink = screen.getByRole('button', { name: /^Review \(1\)/i });
    fireEvent.click(topReviewLink);

    // Should immediately transition to Review mode with summary cards matching Add Price Data review
    await waitFor(() => {
      expect(screen.getByText('Add Arrival Volume — Review')).toBeInTheDocument();
      expect(screen.getByText('Combined Overall Volume')).toBeInTheDocument();
      expect(screen.getByText('Farm Source')).toBeInTheDocument();
      expect(screen.getByText('Other Sources')).toBeInTheDocument();
    });
  });

  it('counts filled source cells, not commodity rows, on the review summary', async () => {
    renderDFTCArrivalInput();

    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '1000' } });
    fireEvent.change(inputs[1], { target: { value: '500' } });

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Total Source Values Entered: 2/i })).toBeInTheDocument();
    });

    // One commodity, two filled source cells — the summary counts cells, so the
    // combined card matches Farm Source + Other Sources.
    expect(screen.getByRole('button', { name: /Combined Overall Volume 2 entered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Farm Source 1 entered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Other Sources 1 entered/i })).toBeInTheDocument();

    // Saving is still one commodity record, carrying both source columns.
    expect(screen.getByRole('button', { name: /Save DFTC Arrival Volume.*\(1 commodities\)/i })).toBeInTheDocument();
  });

  it('displays the official DFTC Arrival Volume Table without hardcoded (kg) in headers', async () => {
    renderDFTCArrivalInput();

    // Expand category and enter volume
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '1000' } }); // Farm source
    fireEvent.change(inputs[1], { target: { value: '500' } });  // Other sources

    // Click bottom Review button
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Arrival Volume — Review')).toBeInTheDocument();
      // Table headers matching OVERALL TOTAL sheet
      expect(screen.getByText('FARM SOURCE')).toBeInTheDocument();
      expect(screen.getByText('OTHER SOURCES')).toBeInTheDocument();
      expect(screen.getByText('OVERALL TOTAL')).toBeInTheDocument();
      // Check total row matching Excel sheet
      expect(screen.getByText('TOTAL')).toBeInTheDocument();
    });

    // The review is a complete commodity sheet, not only the rows with input.
    expect(screen.getByRole('table')).toHaveTextContent('Kamatis');
  });

  it('submits arrival volume with searchable DFTC personnel and shows saving loading overlay', async () => {
    let requestPayload = null;
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/commodities')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ id: 'com-1', name: 'Ampalaya', category: 'Lowland Vegetables' }]
          })
        };
      }
      if (url.includes('/dftc/staff')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { first_name: 'MARIA', last_name: 'SANTOS', position_title: 'DFTC Records Clerk' },
              { first_name: 'JUAN', last_name: 'DELA CRUZ', position_title: 'DFTC Supervisor' }
            ]
          })
        };
      }
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        requestPayload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: 'Saved successfully',
            file_name: 'DFTC-Arrival-Volume-2026-09-30.xlsx'
          })
        };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    renderDFTCArrivalInput();

    // Enter volume
    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '800' } });

    // Review
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save DFTC Arrival Volume/i })).toBeInTheDocument();
    });

    // Select Encoded By dropdown
    const encodedByTrigger = document.getElementById('encoded-by-select');
    fireEvent.click(encodedByTrigger);

    await waitFor(() => {
      expect(screen.getAllByText(/MARIA SANTOS/i).length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText(/MARIA SANTOS/i)[0]);

    // Click Save DFTC Arrival Volume
    const saveBtn = screen.getByRole('button', { name: /Save DFTC Arrival Volume/i });
    fireEvent.click(saveBtn);

    // Confirm Modal appears
    await waitFor(() => {
      expect(screen.getByText('Confirm Finalize & Save Arrival Volume')).toBeInTheDocument();
    });

    // Check verification checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Click Finalize & Save
    const confirmBtn = screen.getByRole('button', { name: /Finalize & Save/i });
    fireEvent.click(confirmBtn);

    // Verify submission payload
    await waitFor(() => {
      expect(requestPayload).not.toBeNull();
      expect(requestPayload.data_type).toBe('arrival_volume');
      expect(requestPayload.records.length).toBe(1);
      expect(requestPayload.records[0].farm_source_volume_kg).toBe(800);
      expect(requestPayload.encoded_by).toBe('MARIA SANTOS');
    });
  });

  it('does not navigate away or claim success when the save request fails', async () => {
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/commodities')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [{ id: 'com-1', name: 'Ampalaya', category: 'Lowland Vegetables' }] })
        };
      }
      if (url.includes('/dftc/staff')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [{ first_name: 'MARIA', last_name: 'SANTOS', position_title: 'DFTC Records Clerk' }] })
        };
      }
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        return { ok: false, status: 500, json: async () => ({ detail: 'Internal error' }) };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    renderDFTCArrivalInput();

    const lowlandBtn = screen.getByText(/Lowland Vegetables/i).closest('button');
    fireEvent.click(lowlandBtn);

    const inputs = screen.getAllByPlaceholderText('0');
    fireEvent.change(inputs[0], { target: { value: '800' } });

    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save DFTC Arrival Volume/i })).toBeInTheDocument();
    });

    const encodedByTrigger = document.getElementById('encoded-by-select');
    fireEvent.click(encodedByTrigger);
    await waitFor(() => {
      expect(screen.getAllByText(/MARIA SANTOS/i).length).toBeGreaterThanOrEqual(1);
    });
    fireEvent.click(screen.getAllByText(/MARIA SANTOS/i)[0]);

    // The previous test's success path navigates on a 600ms timer that outlives
    // its assertions; clear the spy so this test only sees its own navigation.
    mockNavigate.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Arrival Volume/i }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Finalize & Save Arrival Volume')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    // The failure must be surfaced, not swallowed.
    await waitFor(() => {
      expect(screen.getByText(/Could not save this arrival volume submission/i)).toBeInTheDocument();
    });

    // The success path navigates on a 600ms timer, so wait past that window
    // before asserting the user was NOT navigated away.
    await new Promise((r) => setTimeout(r, 900));

    // And the user must stay on the page with their data intact.
    expect(mockNavigate).not.toHaveBeenCalledWith('/dftc/input', expect.anything());
    expect(screen.getByText('Add Arrival Volume — Review')).toBeInTheDocument();
    expect(screen.getAllByText(/800/).length).toBeGreaterThan(0);
  });
});

describe('DFTCArrivalInput a commodity added at runtime lands in a category the grid renders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('shows the new commodity instead of filing it where nothing renders it', async () => {
    // The modal offered category ids ("lowland") that PRICE_CATEGORIES does
    // not use ("lowland-vegetables"), so the commodity was filed in a bucket
    // the grid never reads: it appeared for nobody, and no volume could ever
    // be entered for it, so it never reached the DB either.
    renderDFTCArrivalInput();

    fireEvent.click(screen.getByRole('button', { name: 'Add Commodity' }));
    const modal = screen.getByText('Add New Commodity').closest('div.fixed');
    // No category is picked: the default category is the one that was broken.
    fireEvent.change(
      within(modal).getByPlaceholderText('e.g. Squash, Ginger'),
      { target: { value: 'Satsuma' } }
    );
    fireEvent.click(within(modal).getByRole('button', { name: 'Add Commodity' }));

    // The grid renders categories collapsed; expand the default category.
    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));

    await waitFor(() => expect(screen.getByText('Satsuma')).toBeTruthy());
  });

  it('offers category ids the grid actually reads', async () => {
    renderDFTCArrivalInput();

    fireEvent.click(screen.getByRole('button', { name: 'Add Commodity' }));
    const modal = screen.getByText('Add New Commodity').closest('div.fixed');
    const categorySelect = within(modal).getAllByRole('combobox')[0];
    const values = Array.from(categorySelect.options).map((o) => o.value);

    expect(values).toContain('lowland-vegetables');
    expect(values).toContain('highland-vegetables');
  });
});

describe('DFTCArrivalInput restores a draft whose commodities sit in legacy category buckets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch();
    localStorage.clear();
  });

  it('merges the legacy lowland bucket into the derived lowland category', async () => {
    const lowlandId = PRICE_CATEGORIES.find((c) => c.name === 'Lowland Vegetables').id;
    // Drafts written before the ids were derived filed Lowland/Highland under
    // legacy bucket keys the grid never reads, so those commodities were lost.
    localStorage.setItem('dftc_arrival_draft', 'true');
    localStorage.setItem('dftc_arrival_draft_data', JSON.stringify({
      periodType: 'Daily',
      customCommodities: {
        lowland: [{
          id: 'custom-com-lowland-1',
          name: 'Satsuma',
          isHW: false,
          variants: [{ id: 'custom-v-custom-com-lowland-1', name: 'Regular' }]
        }],
        [lowlandId]: [{
          id: 'custom-com-lowland-2',
          name: 'Pechay',
          isHW: false,
          variants: [{ id: 'custom-v-custom-com-lowland-2', name: 'Regular' }]
        }]
      }
    }));

    renderDFTCArrivalInput();

    fireEvent.click(screen.getByRole('button', { name: /Resume Draft/i }));

    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));

    // The legacy bucket is merged, not swapped in: both commodities show up.
    await waitFor(() => expect(screen.getByText('Satsuma')).toBeTruthy());
    expect(screen.getByText('Pechay')).toBeTruthy();
  });
});

describe('DFTCArrivalInput rows gained from the DB catalogue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  /** The commodity block (header + variant rows) of one commodity. */
  function commodityBlock(name) {
    return screen.getByText(name).closest('div.cursor-pointer').parentElement;
  }

  it('renders a variety the static mirror does not have', async () => {
    // The catalogue holds "Ampalaya / Milky Wave" (COM-0138). The static
    // mirror only knows Ampalaya/Galaxy, so the row has to come from the
    // catalogue: without it no arrival volume can be entered for the variety.
    global.fetch = mockFetch([
      { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
      { id: 'com-9', name: 'Ampalaya', variety: 'Milky Wave', category: 'Lowland Vegetables', unit_of_measure: 'kg' }
    ]);

    renderDFTCArrivalInput();

    // Every category starts collapsed; open the one the commodity belongs to.
    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));

    await waitFor(() => {
      const block = commodityBlock('Ampalaya');
      expect(within(block).getAllByText('Milky Wave').length).toBeGreaterThan(0);
    });

    // The variety has a row of its own: Galaxy and Milky Wave, each with a
    // farm and an other-source input, in the desktop and the mobile layout.
    const block = commodityBlock('Ampalaya');
    expect(within(block).getAllByPlaceholderText('0')).toHaveLength(8);
  });

  it('skips a catalogue item no category of ours can hold', async () => {
    global.fetch = mockFetch([
      { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
      { id: 'com-9', name: 'Ampalaya', variety: 'Milky Wave', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
      { id: 'com-20', name: 'Bayabas', variety: null, category: 'Exotic Produce', unit_of_measure: 'kg' }
    ]);

    renderDFTCArrivalInput();

    // "Exotic Produce" is not a category of the sheet, so there is nowhere to
    // put the item: searching the whole grid for it must find nothing.
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Bayabas' } });

    expect(screen.queryByText('Bayabas')).toBeNull();

    // The rest of the catalogue still landed: the item was skipped, not fatal.
    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: '' } });
    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));

    await waitFor(() => {
      expect(screen.getAllByText('Milky Wave').length).toBeGreaterThan(0);
    });
  });

  it('does not render a catalogue item the sheet already has twice', async () => {
    global.fetch = mockFetch([
      { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
      { id: 'com-9', name: 'Ampalaya', variety: 'Milky Wave', category: 'Lowland Vegetables', unit_of_measure: 'kg' }
    ]);

    renderDFTCArrivalInput();

    fireEvent.click(screen.getByText(/Lowland Vegetables/i).closest('button'));

    await waitFor(() => {
      const block = commodityBlock('Ampalaya');
      expect(within(block).getAllByText('Milky Wave').length).toBeGreaterThan(0);
    });

    // The variety this user adds themselves carries a generated id, the
    // catalogue row a slug: the dedupe has to be by identity, not by id.
    fireEvent.click(within(commodityBlock('Ampalaya')).getByRole('button', { name: '+ Add Variant' }));
    fireEvent.change(
      within(commodityBlock('Ampalaya')).getByPlaceholderText('Enter variety, grade, or descriptor'),
      { target: { value: 'Milky Wave' } }
    );
    fireEvent.click(within(commodityBlock('Ampalaya')).getByRole('button', { name: 'Add' }));

    // Galaxy is the mirror's row and Milky Wave is this user's: the
    // catalogue's twin of either must not add a second row. Two variants,
    // each with a farm and an other-source input, in the desktop and the
    // mobile layout.
    const block = commodityBlock('Ampalaya');
    expect(within(block).getAllByPlaceholderText('0')).toHaveLength(8);
  });

  it('does not offer a variety twice when the DB and the mirror spell it differently', async () => {
    // The DB spells a Saging variety "Senorita" (COM-0070); the static mirror
    // spells it "Señorita". Folded, they are one variety: the sheet must show
    // one row, and that row must land on the DB row — not on another variety
    // of Saging.
    let requestPayload = null;
    global.fetch = vi.fn(async (url, opts) => {
      if (url.includes('/dftc/commodities')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [
              { id: 'com-70', name: 'Saging', variety: 'Senorita', category: 'Fruits', unit_of_measure: 'kg' }
            ]
          })
        };
      }
      if (url.includes('/dftc/staff')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            items: [{ first_name: 'MARIA', last_name: 'SANTOS', position_title: 'DFTC Records Clerk' }]
          })
        };
      }
      if (url.includes('/dftc/submissions/manual') && opts?.method === 'POST') {
        requestPayload = JSON.parse(opts.body);
        return { ok: true, status: 200, json: async () => ({ message: 'Saved successfully' }) };
      }
      return { ok: true, status: 200, json: async () => ({ items: [] }) };
    });

    renderDFTCArrivalInput();

    fireEvent.click(screen.getByText(/^Fruits$/i).closest('button'));

    await waitFor(() => {
      expect(screen.getAllByText('Señorita').length).toBeGreaterThan(0);
    });

    const block = commodityBlock('Saging');
    // The mirror's spelling is the row that renders — twice, once in the
    // desktop and once in the mobile layout. The DB's spelling must not add a
    // second row for the same variety.
    expect(within(block).getAllByText('Señorita')).toHaveLength(2);
    expect(within(block).queryAllByText('Senorita')).toHaveLength(0);

    // The row must carry its volume to the DB row it belongs to.
    const row = within(block).getAllByText('Señorita')[0].closest('div[style]');
    fireEvent.change(within(row).getAllByPlaceholderText('0')[0], { target: { value: '250' } });

    fireEvent.click(screen.getByRole('button', { name: /Review Entered Data/i }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save DFTC Arrival Volume/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /Save DFTC Arrival Volume/i }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Finalize & Save Arrival Volume')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Finalize & Save/i }));

    await waitFor(() => {
      expect(requestPayload).not.toBeNull();
      expect(requestPayload.records).toHaveLength(1);
      expect(requestPayload.records[0].commodity_id).toBe('com-70');
      expect(requestPayload.records[0].farm_source_volume_kg).toBe(250);
    });
  });
});
