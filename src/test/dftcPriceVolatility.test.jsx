import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCPriceInput from '../app/dftc/pages/DFTCPriceInput';
import { clearPrefillCache } from '../app/dftc/pages/dftcPricePrefill';

const TODAY = '2026-11-06';

function mockVolatilityFetch() {
  return vi.fn(async (url, opts) => {
    if (url.includes('/dftc/volatility-reasons')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 1, reason_name: 'Increased Supply', category: 'Supply' },
            { id: 2, reason_name: 'Increased Consumer Demand', category: 'Demand' },
            { id: 28, reason_name: 'Other (Requires custom note)', category: 'Other' },
          ],
          categories: ['Supply', 'Demand', 'Other'],
        }),
      };
    }
    if (url.includes('/dftc/prices/benchmarks')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          benchmarks: {
            'com-1': {
              commodity_id: 'com-1',
              previous_price: '50.00',
              previous_date: '2026-11-05',
              seven_day_avg: 50.0,
              volatility_threshold_pct: 10.0,
            },
            'ampalaya': {
              commodity_id: 'ampalaya',
              previous_price: '50.00',
              previous_date: '2026-11-05',
              seven_day_avg: 50.0,
              volatility_threshold_pct: 10.0,
            },
            'ampalaya-galaxy': {
              commodity_id: 'ampalaya-galaxy',
              previous_price: '50.00',
              previous_date: '2026-11-05',
              seven_day_avg: 50.0,
              volatility_threshold_pct: 10.0,
            },
          },
        }),
      };
    }
    if (url.includes('/dftc/staff')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 'STF-1', first_name: 'MARIA', middle_name: 'S.', last_name: 'SANTOS', position_title: 'DFTC Staff' },
          ],
        }),
      };
    }
    if (url.includes('/dftc/commodities')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            { id: 'com-1', name: 'Ampalaya', variety: 'Galaxy', category: 'Lowland Vegetables', unit_of_measure: 'kg' },
          ],
        }),
      };
    }
    if (url.includes('/dftc/price-draft')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: null,
          reporting_date: TODAY,
          status: 'draft',
          cells: [],
        }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    };
  });
}

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dftc/price-input']}>
        <DFTCPriceInput />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DFTC Price Volatility Reason Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearPrefillCache();
    localStorage.clear();
    global.fetch = mockVolatilityFetch();
  });

  it('triggers volatility alert displaying previous price (percent), and only shows notes when Other is selected', async () => {
    renderComponent();

    // Wait for the form to settle and Lowland Vegetables to be present
    const lowlandText = await screen.findByText(/Lowland Vegetables/i);
    const lowlandBtn = lowlandText.closest('button');
    fireEvent.click(lowlandBtn);

    // Find sample input for Ampalaya - Galaxy (benchmark prev is 50.00)
    // Entering 65.00 (+30% increase)
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '65' } });

    // Verify significant price movement alert is displayed with "previous price (percent)" format
    await waitFor(() => {
      expect(screen.getByText(/Significant price movement detected/i)).toBeInTheDocument();
      expect(screen.getByText(/previous ₱50\.00 \(\+30(\.0)?%\)/i)).toBeInTheDocument();
    });

    // Reason dropdown is displayed
    const selects = screen.getAllByRole('combobox');
    const reasonSelect = selects.find((s) => s.innerHTML.includes('Increased Consumer Demand'));
    expect(reasonSelect).toBeTruthy();

    // Select standard reason (Increased Consumer Demand)
    fireEvent.change(reasonSelect, { target: { value: '2' } });

    // Additional notes input must NOT be rendered when a standard reason is selected
    expect(screen.queryByPlaceholderText(/Describe the reason/i)).not.toBeInTheDocument();

    // Change reason to 'Other'
    fireEvent.change(reasonSelect, { target: { value: '28' } });

    // Now additional notes input appears in the same field block
    const notesInput = await screen.findByPlaceholderText(/Describe the reason for this price change/i);
    expect(notesInput).toBeInTheDocument();
    expect(notesInput.getAttribute('maxLength')).toBe('255');

    // Type notes within 255 char limit
    fireEvent.change(notesInput, { target: { value: 'Vegetable demand increased during local festival week.' } });
    expect(notesInput.value).toBe('Vegetable demand increased during local festival week.');

    // Review mode navigation
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument();
    });

    // Verify Review page displays the volatility section, price with previous price (percent), reason, and notes
    expect(screen.getByText(/Price Volatility & Market Observations/i)).toBeInTheDocument();
    expect(screen.getByText(/Other \(Requires custom note\)/i)).toBeInTheDocument();
    expect(screen.getByText(/previous ₱50\.00 \(\+30/i)).toBeInTheDocument();
    expect(screen.getByText(/Vegetable demand increased during local festival week\./i)).toBeInTheDocument();
  });

  it('blocks finalization and displays alert when volatile commodity is missing reason', async () => {
    renderComponent();

    const lowlandText = await screen.findByText(/Lowland Vegetables/i);
    const lowlandBtn = lowlandText.closest('button');
    fireEvent.click(lowlandBtn);

    // Enter volatile price 65 (+30%), but do NOT select a reason
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '65' } });

    await waitFor(() => {
      expect(screen.getByText(/Significant price movement detected/i)).toBeInTheDocument();
    });

    // Go to Review mode
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument();
    });

    // Click Finalize button
    const finalizeBtn = screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i });
    fireEvent.click(finalizeBtn);

    // Verify blocking alert modal/message appears
    await waitFor(() => {
      expect(screen.getByText(/Please provide reasons and notes for all 1 flagged commodity price movement/i)).toBeInTheDocument();
    });
  });

  it('blocks finalization when reason is Other but custom notes are missing', async () => {
    renderComponent();

    const lowlandText = await screen.findByText(/Lowland Vegetables/i);
    const lowlandBtn = lowlandText.closest('button');
    fireEvent.click(lowlandBtn);

    // Enter volatile price 65 (+30%)
    const inputs = screen.getAllByPlaceholderText('0.00');
    fireEvent.change(inputs[0], { target: { value: '65' } });

    await waitFor(() => {
      expect(screen.getByText(/Significant price movement detected/i)).toBeInTheDocument();
    });

    // Select 'Other' but do NOT enter notes
    const selects = screen.getAllByRole('combobox');
    const reasonSelect = selects.find((s) => s.innerHTML.includes('Other'));
    fireEvent.change(reasonSelect, { target: { value: '28' } });

    // Go to Review mode
    const reviewBtn = screen.getByRole('button', { name: /Review Entered Data/i });
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Price Data — Review')).toBeInTheDocument();
    });

    // Click Finalize button
    const finalizeBtn = screen.getByRole('button', { name: /Finalize DFTC Price Monitoring/i });
    fireEvent.click(finalizeBtn);

    // Verify blocking alert message appears
    await waitFor(() => {
      expect(screen.getByText(/Please provide reasons and notes for all 1 flagged commodity price movement/i)).toBeInTheDocument();
    });
  });
});
