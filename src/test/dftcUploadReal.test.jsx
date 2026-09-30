import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DFTCUpload from '../app/dftc/pages/DFTCUpload';
import { ingestionApi } from '../services/api';

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

describe('DFTCUpload component with Admin-like upload, preview, and dry-run validation', () => {
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
        <DFTCUpload />
      </QueryClientProvider>
    );

    // Verify PageHeader and Back button
    expect(screen.getByText('Upload Dataset')).toBeInTheDocument();
    expect(screen.getByText('Back to Submit Data')).toBeInTheDocument();

    // Select dataset type
    const select = screen.getByLabelText(/Dataset type/i);
    fireEvent.change(select, { target: { value: 'DFTC Wholesale Prices' } });

    // Enable overwrite checkbox
    const overwriteCheckbox = screen.getByLabelText(/Overwrite existing records/i);
    fireEvent.click(overwriteCheckbox);
    expect(overwriteCheckbox.checked).toBe(true);

    // Create real CSV file
    const csvContent = 'Date,Commodity,Variety,Price,Unit\n2026-08-30,Tomato,Diamante,85.00,kg\n2026-08-30,Eggplant,Banate,60.00,kg';
    const file = new File([csvContent], 'dftc_wholesale_prices.csv', { type: 'text/csv' });

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
        'dftc_daily_wholesale',
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
        'dftc_daily_wholesale',
        true
      );
      expect(screen.getByText('Standardizing & Storing Records…')).toBeInTheDocument();
    });
  });

  it('renders Validation Details table with multiple issues and semantic filtering', async () => {
    ingestionApi.validateFile.mockResolvedValue({
      summary: {
        total_rows: 5,
        valid_rows: 3,
        rejected_rows: 2,
        duplicate_rows: 1,
        missing_value_rows: 1,
        unrecognized_commodity_rows: 1,
      },
      rows: [
        {
          row_number: 2,
          record_label: 'Dragonfruit Exotic',
          result: 'valid_with_warning',
          issues: [
            {
              code: 'new_commodity',
              severity: 'warning',
              message: 'Unrecognized commodity name "Dragonfruit Exotic"',
            },
          ],
        },
        {
          row_number: 4,
          record_label: 'Eggplant Banate',
          result: 'rejected',
          issues: [
            {
              code: 'duplicate',
              severity: 'error',
              message: 'Duplicate record already in database.',
            },
          ],
        },
      ],
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DFTCUpload />
      </QueryClientProvider>
    );

    const select = screen.getByLabelText(/Dataset type/i);
    fireEvent.change(select, { target: { value: 'DFTC Retail Prices' } });

    const csvContent = 'Date,Commodity,Variety,Price,Unit\n2026-08-30,Tomato,Diamante,85.00,kg';
    const file = new File([csvContent], 'dftc_retail.csv', { type: 'text/csv' });

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validate Data')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Validate Data'));

    await waitFor(() => {
      expect(screen.getByText('Validation Details')).toBeInTheDocument();
      expect(screen.getByText('Dragonfruit Exotic')).toBeInTheDocument();
      expect(screen.getByText('Eggplant Banate')).toBeInTheDocument();
      expect(screen.getByText('All Issues (2)')).toBeInTheDocument();
    });
  });

  it('completes the import flow and displays stored summary card with reset action', async () => {
    ingestionApi.validateFile.mockResolvedValue({
      summary: {
        total_rows: 3,
        valid_rows: 3,
        rejected_rows: 0,
        duplicate_rows: 0,
        missing_value_rows: 0,
        unrecognized_commodity_rows: 0,
      },
      rows: [],
    });

    ingestionApi.uploadFile.mockResolvedValue({
      status: 'processing',
      import_id: 'IMP-0099',
      submission_id: 'SUB-20260903-01',
      message: 'File upload accepted and processing in background.',
    });

    ingestionApi.getHistoryDetail.mockResolvedValue({
      status: 'completed',
      records_imported: 3,
      submission_id: 'SUB-20260903-01',
    });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DFTCUpload />
      </QueryClientProvider>
    );

    const select = screen.getByLabelText(/Dataset type/i);
    fireEvent.change(select, { target: { value: 'DFTC Arrival Volume' } });

    const csvContent = 'Date,Commodity,Variety,Farm_Volume,Other_Volume,Total_Volume,Unit\n2026-08-30,Tomato,Diamante,100,50,150,kg';
    const file = new File([csvContent], 'dftc_arrival.csv', { type: 'text/csv' });

    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Validate Data')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Validate Data'));

    await waitFor(() => {
      expect(screen.getByText('Import Valid Records (3)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Import Valid Records (3)'));

    await waitFor(() => {
      expect(screen.getByText('Import Completed & Stored')).toBeInTheDocument();
      expect(screen.getByText('Upload Summary')).toBeInTheDocument();
      expect(screen.getByText('SUB-20260903-01')).toBeInTheDocument();
      expect(screen.getByText('IMP-0099')).toBeInTheDocument();
      expect(screen.getByText('3 records')).toBeInTheDocument();
      expect(screen.getByText('View Submission History')).toBeInTheDocument();
      expect(screen.getByText('Upload another file')).toBeInTheDocument();
    }, { timeout: 4000 });

    // Test clicking reset / Upload another file
    fireEvent.click(screen.getByText('Upload another file'));

    expect(screen.getByText('Drop file here or click to upload')).toBeInTheDocument();
    expect(screen.queryByText('Import Completed & Stored')).not.toBeInTheDocument();
  });
});

