import { describe, it, expect } from 'vitest';
import { buildReportExportFilename } from '../app/dftc/components/dftcReportExport';

describe('buildReportExportFilename', () => {
  it('generates daily report filename for Bankerohan arrival', () => {
    const filename = buildReportExportFilename({
      market: 'Bankerohan Public Market',
      reportType: 'Arrival',
      period: 'Daily',
      dateStr: '2026-11-06',
      ext: 'pdf'
    });
    expect(filename).toBe('Bankerohan_Arrival_Daily_Report_2026-11-06.pdf');
  });

  it('generates monthly report filename for DFTC price monitoring', () => {
    const filename = buildReportExportFilename({
      market: 'DFTC Taboan',
      reportType: 'Price',
      period: 'Monthly',
      dateStr: '2026-11-06',
      ext: 'pdf'
    });
    expect(filename).toBe('DFTC_Price_Monthly_Report_Nov-2026.pdf');
  });

  it('generates weekly report filename with excel extension', () => {
    const filename = buildReportExportFilename({
      market: 'Bankerohan',
      reportType: 'Price',
      period: 'Weekly',
      dateStr: '2026-11-06',
      ext: 'xlsx'
    });
    expect(filename).toBe('Bankerohan_Price_Weekly_Report_2026-11-06.xlsx');
  });

  it('handles pageIndex for multi-page image exports', () => {
    const filename = buildReportExportFilename({
      market: 'DFTC',
      reportType: 'Arrival',
      period: 'Daily',
      dateStr: '2026-11-06',
      ext: 'png',
      pageIndex: 0
    });
    expect(filename).toBe('DFTC_Arrival_Daily_Report_2026-11-06-Page-1.png');
  });
});

