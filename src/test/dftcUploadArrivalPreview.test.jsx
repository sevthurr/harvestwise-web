import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCUpload from '../app/dftc/pages/DFTCUpload';
import { ingestionApi } from '../services/api';
import {
  MONTHS,
  buildArrivalWorkbook,
  xlsxFile,
} from './fixtures/dftcVolumeWorkbook';

// The DFTC upload page must preview the DFTC arrival workbook exactly as the
// admin import page does. It used to carry its own copy of the parser, and the
// copy had drifted: it renamed JANUARY..DECEMBER to "Day 17"/"Day 5", dropped
// the first data row, rendered uncached formulas as "[object Object]", showed
// raw fractions instead of percentages, and always opened on "OVERALL TOTAL"
// — the one sheet that is a single annual row per commodity.
//
// The parser is now shared, so these assertions are about the *page*: that it
// consumes the shared result correctly. `primarySheetName` in particular is
// easy to ignore, and doing so silently discards the parser's sheet choice
// while every parser-level test still passes.

vi.mock('../services/api', () => ({
  ingestionApi: {
    uploadFile: vi.fn(),
    validateFile: vi.fn(),
    getHistoryDetail: vi.fn(),
  },
}));

vi.mock('react-router', () => ({
  useNavigate: () => vi.fn(),
}));

async function uploadWorkbook() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <DFTCUpload />
    </QueryClientProvider>
  );

  const file = await xlsxFile(await buildArrivalWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx');
  fireEvent.change(document.querySelector('input[type="file"]'), { target: { files: [file] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  ingestionApi.validateFile.mockResolvedValue({
    summary: {
      total_rows: 2,
      valid_rows: 2,
      rejected_rows: 0,
      duplicate_rows: 0,
      missing_value_rows: 0,
      unrecognized_commodity_rows: 0,
    },
    rows: [],
  });
});

describe('DFTCUpload — arrival preview matches the admin preview', () => {
  it('opens on the monthly sheet, not OVERALL TOTAL', async () => {
    await uploadWorkbook();

    await waitFor(() => {
      expect(
        screen.getByText('File preview — sheet "FARM SOURCE" (first 2 of 2 rows)')
      ).toBeInTheDocument();
    });

    // The annual sheet is still reachable from the sheet picker.
    expect(screen.getByRole('option', { name: 'OVERALL TOTAL' })).toBeInTheDocument();
  });

  it('keeps the month names instead of renaming them to Day numbers', async () => {
    await uploadWorkbook();

    await waitFor(() => {
      expect(screen.getByText('JANUARY')).toBeInTheDocument();
    });
    for (const month of MONTHS) {
      expect(screen.getByText(month)).toBeInTheDocument();
    }
    expect(screen.queryByText(/^Day \d+$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^col_\d+$/)).not.toBeInTheDocument();
  });

  it('keeps the first data row, which the row-number column used to swallow', async () => {
    await uploadWorkbook();

    await waitFor(() => {
      expect(screen.getByText('Ahos')).toBeInTheDocument();
    });
    expect(screen.getByText('Tomato')).toBeInTheDocument();
  });

  it('validates as an arrival dataset, so the backend parses it as one', async () => {
    await uploadWorkbook();

    await waitFor(() => {
      expect(screen.getByText(/first 2 of 2 rows/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Validate Data'));

    await waitFor(() => {
      expect(ingestionApi.validateFile).toHaveBeenCalledWith(
        expect.anything(),
        'arrival',
        expect.any(Boolean)
      );
    });
  });
});
