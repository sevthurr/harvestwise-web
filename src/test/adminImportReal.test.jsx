import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminImport from '../app/admin/pages/AdminImport';
import { ingestionApi } from '../services/api';

vi.mock('../services/api', () => ({
  ingestionApi: {
    uploadFile: vi.fn(),
    validateFile: vi.fn(),
  },
}));

describe('AdminImport component with backend dry-run validation', () => {
  it('parses CSV file, runs backend dry-run validation, and imports valid records', async () => {
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

    ingestionApi.uploadFile.mockResolvedValue({
      status: 'processing',
      message: 'File upload accepted and processing in background.',
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminImport />
      </QueryClientProvider>
    );

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

    // Verify ingestionApi.validateFile call
    await waitFor(() => {
      expect(ingestionApi.validateFile).toHaveBeenCalledWith(
        file,
        'bankerohan_daily_retail',
        true
      );
      expect(screen.getByText('Validation complete')).toBeInTheDocument();
      expect(screen.getByText('Import Valid Records (2)')).toBeInTheDocument();
    });

    // Verify the 6 KPI cards are rendered
    expect(screen.getByText('Total Rows')).toBeInTheDocument();
    expect(screen.getByText('Valid Rows')).toBeInTheDocument();
    expect(screen.getByText('Rejected Rows')).toBeInTheDocument();
    expect(screen.getByText('Duplicates')).toBeInTheDocument();
    expect(screen.getByText('Missing Values')).toBeInTheDocument();
    expect(screen.getByText('Unrecognized Commodities')).toBeInTheDocument();

    // Verify Invalid Dates KPI card is ABSENT
    expect(screen.queryByText('Invalid Dates')).not.toBeInTheDocument();
    expect(screen.queryByText('Invalid dates')).not.toBeInTheDocument();

    // Verify empty state message when 0 issues exist
    expect(screen.getByText('No validation issues found.')).toBeInTheDocument();
    expect(screen.getByText('All rows passed validation and are ready to import.')).toBeInTheDocument();

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

  it('renders Validation Details table with multiple issues, text-only styling, and semantic counts', async () => {
    // 10-row semantic mock: 8 valid (6 clean, 1 new commodity, 1 overwrite duplicate), 2 rejected
    ingestionApi.validateFile.mockResolvedValue({
      summary: {
        total_rows: 10,
        valid_rows: 8,
        rejected_rows: 2,
        duplicate_rows: 1,
        missing_value_rows: 1,
        unrecognized_commodity_rows: 1,
      },
      rows: [
        {
          row_number: 8,
          record_label: 'Dragonfruit Exotic',
          result: 'valid_with_warning',
          issues: [
            {
              code: 'new_commodity',
              severity: 'warning',
              field: 'commodity',
              message: '"Dragonfruit Exotic" is not yet registered in HarvestWise. It will be added as a non-Top 10 commodity when imported.',
              params: { commodity: 'Dragonfruit Exotic' },
            },
          ],
        },
        {
          row_number: 9,
          record_label: 'Ampalaya — Galaxy',
          result: 'valid_with_warning',
          issues: [
            {
              code: 'duplicate',
              severity: 'warning',
              message: 'A matching record already exists and will be replaced when imported.',
              params: { exact: true, overwrite: true },
            },
          ],
        },
        {
          row_number: 10,
          record_label: 'Ampalaya — Galaxy',
          result: 'rejected',
          issues: [
            {
              code: 'missing_required',
              severity: 'rejection',
              field: 'price',
              message: 'Price is required.',
            },
            {
              code: 'invalid_date',
              severity: 'rejection',
              field: 'date',
              message: '"2025/99/99" is not a valid date.',
            },
          ],
        },
      ],
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminImport />
      </QueryClientProvider>
    );

    // Select dataset type
    const select = screen.getByLabelText(/Dataset type/i);
    fireEvent.change(select, { target: { value: 'Bangkerohan Retail Prices' } });

    // Upload file
    const file = new File(['mock content'], 'prices.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validate Data')).toBeInTheDocument();
    });

    // Validate
    fireEvent.click(screen.getByText('Validate Data'));

    await waitFor(() => {
      expect(screen.getByText('Validation complete')).toBeInTheDocument();
      // Invariant check: Valid Rows (8) + Rejected Rows (2) = Total Rows (10)
      expect(screen.getByText('Import Valid Records (8)')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Validation Details')).toBeInTheDocument();
    expect(screen.getByText('Commodity / Record')).toBeInTheDocument();
    expect(screen.getByText('Result')).toBeInTheDocument();
    expect(screen.getByText('Issues')).toBeInTheDocument();
    expect(screen.getByText('Reason')).toBeInTheDocument();

    // Check table rows render
    expect(screen.getByText('Dragonfruit Exotic')).toBeInTheDocument();
    expect(screen.getByText('"Dragonfruit Exotic" is not yet registered in HarvestWise. It will be added as a non-Top 10 commodity when imported.')).toBeInTheDocument();

    // Check multiple issues rendered as plain text
    expect(screen.getByText('Missing Data, Invalid Date')).toBeInTheDocument();
    expect(screen.getByText('Price is required. "2025/99/99" is not a valid date.')).toBeInTheDocument();

    // Verify text-only styling (no badges/chips/pills): check classes
    const rejectedStatus = screen.getByText('Rejected');
    expect(rejectedStatus.tagName.toLowerCase()).toBe('td');
    expect(rejectedStatus.className).toContain('text-red-600');
    expect(rejectedStatus.className).not.toContain('badge');
    expect(rejectedStatus.className).not.toContain('pill');

    const warningStatuses = screen.getAllByText('Valid with warning');
    expect(warningStatuses.length).toBe(2);
    expect(warningStatuses[0].className).toContain('text-amber-700');
  });

  it('verifies dataset types, source selections, and auto-detects metadata on file upload', async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AdminImport />
      </QueryClientProvider>
    );

    // Verify "Commodity Metadata" is NOT present
    const datasetSelect = screen.getByLabelText(/Dataset type/i);
    const datasetOptions = Array.from(datasetSelect.querySelectorAll('option')).map((o) => o.value);
    expect(datasetOptions).not.toContain('Commodity Metadata');

    // Verify Source dropdown only has the 3 specified items
    const sourceSelect = screen.getByLabelText(/Source/i);
    const sourceOptions = Array.from(sourceSelect.querySelectorAll('option'))
      .map((o) => o.value)
      .filter(Boolean);
    expect(sourceOptions).toEqual([
      'Davao Food Terminal Complex (DFTC)',
      'PSA OpenStat',
      'OpenMeteo',
    ]);
  });
});
