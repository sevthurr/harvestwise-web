import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCArrivalInput from '../app/dftc/pages/DFTCArrivalInput';

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
  return vi.fn(async (url, opts) => {
    if (url.includes('/dftc/commodities')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
            { id: 'com-2', name: 'Cabbage', variety: 'Scorpio', category: 'Highland Vegetables', unit_of_measure: 'kg' }
          ]
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

  it('supports selecting week number of month (e.g. Week 1 of September 2026)', async () => {
    renderDFTCArrivalInput();

    const weeklyBtn = screen.getByRole('button', { name: /Weekly/i });
    fireEvent.click(weeklyBtn);

    // Week select dropdown should be available with week options
    const weekSelect = screen.getByLabelText(/Select week of month/i);
    expect(screen.getByText(/Week 1 \(Sep 1 – 7\)/i)).toBeInTheDocument();
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
      expect(screen.getByText('MARIA SANTOS')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('MARIA SANTOS'));

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
});
