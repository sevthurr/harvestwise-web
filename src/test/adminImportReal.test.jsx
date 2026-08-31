import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import AdminImport from '../app/admin/pages/AdminImport';
import { ingestionApi } from '../services/api';

vi.mock('../services/api', () => ({
  ingestionApi: {
    uploadFile: vi.fn(),
  },
}));

describe('AdminImport component with real file parsing & API', () => {
  it('parses CSV file dynamically and calls uploadFile with real parameters', async () => {
    ingestionApi.uploadFile.mockResolvedValue({
      status: 'processing',
      message: 'File upload accepted and processing in background.',
    });

    render(<AdminImport />);

    // Select dataset type
    const select = screen.getByLabelText(/Dataset type/i);
    fireEvent.change(select, { target: { value: 'Bangkerohan Retail Prices' } });

    // Enable overwrite checkbox
    const overwriteCheckbox = screen.getByLabelText(/Overwrite existing records/i);
    fireEvent.click(overwriteCheckbox);
    expect(overwriteCheckbox.checked).toBe(true);

    // Create real CSV file
    const csvContent = 'Date,Commodity,Variety,Price,Unit\n2026-08-30,Tomato,Diamante,85.00,kg\n2026-08-30,Eggplant,Banate,60.00,kg';
    const file = new File([csvContent], 'real_prices.csv', { type: 'text/csv' });

    // Upload file
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify preview renders real headers and rows
    await waitFor(() => {
      expect(screen.getByText('File preview — first 2 of 2 rows')).toBeInTheDocument();
      expect(screen.getByText('Tomato')).toBeInTheDocument();
      expect(screen.getByText('Eggplant')).toBeInTheDocument();
    });

    // Click Validate Data
    const validateBtn = screen.getByText('Validate Data');
    fireEvent.click(validateBtn);

    // Verify Validation complete card with real counts (Total: 2, Valid: 2)
    await waitFor(() => {
      expect(screen.getByText('Validation complete')).toBeInTheDocument();
      expect(screen.getByText('Import Valid Records (2)')).toBeInTheDocument();
    });

    // Click Import Valid Records
    const importBtn = screen.getByText('Import Valid Records (2)');
    fireEvent.click(importBtn);

    // Verify ingestionApi.uploadFile call
    await waitFor(() => {
      expect(ingestionApi.uploadFile).toHaveBeenCalledWith(
        file,
        'bankerohan_daily_retail',
        true
      );
      expect(screen.getByText('File upload accepted and processing in background.')).toBeInTheDocument();
    });
  });
});
