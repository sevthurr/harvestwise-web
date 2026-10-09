import { describe, it, expect } from 'vitest';
import { parseFileReal } from '../app/global/utils/excelFilePreview';
import {
  MONTHS,
  buildArrivalWorkbook,
  buildPriceWorkbook,
  xlsxFile,
} from './fixtures/dftcVolumeWorkbook';

// These tests pin the DFTC arrival sheet layout end to end through the real
// parser rather than a fixture object. The parser is shared with the DFTC
// upload page — see dftcUploadArrivalPreview.test.jsx for the render-level
// parity check — so what is asserted here is what both pages now display.

const buildWorkbook = buildArrivalWorkbook;

describe('Preview parser — DFTC arrival workbook', () => {
  it('opens on a monthly sheet, not the annual OVERALL TOTAL sheet', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));

    expect(result.primarySheetName).toBe('FARM SOURCE');
    expect(result.headers).toEqual(['No.', 'Commodity', ...MONTHS, 'OVERALL TOTAL']);
  });

  it('keeps the month names instead of renaming them to Day numbers', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));

    for (const month of MONTHS) {
      expect(result.headers).toContain(month);
    }
    expect(result.headers.some((h) => /^Day \d+$/.test(h))).toBe(false);
    expect(result.headers.some((h) => /^col_\d+$/.test(h))).toBe(false);
  });

  it('does not drop the first data row over the row-number column', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));

    expect(result.rows[0]).toMatchObject({ 'No.': '1', Commodity: 'Ahos', JANUARY: '255.51' });
    expect(result.rows[1]).toMatchObject({ 'No.': '2', Commodity: 'Tomato' });
    expect(result.rows).toHaveLength(2);
  });

  it('merges the two header levels on the OVERALL TOTAL sheet', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));
    const overall = result.extractPreviewForRows(result.sheetsData['OVERALL TOTAL']);

    // The merged parents (C4:D4, E4:F4) leave blank header cells, which used
    // to surface as col_4 / col_6 and lose Volume (kg) / Percentage (%).
    expect(overall.headers).toEqual([
      'No.',
      'Commodity',
      'FARM SOURCE — Volume (kg)',
      'FARM SOURCE — Percentagae (%)',
      'OTHER SOURCES — Volume (kg)',
      'OTHER SOURCES — Percentage (%)',
      'OVERALL TOTAL',
    ]);
    expect(overall.rows).toHaveLength(2);
  });

  it('renders share columns as percentages, not raw fractions', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));
    const overall = result.extractPreviewForRows(result.sheetsData['OVERALL TOTAL']);

    expect(overall.rows[0]['FARM SOURCE — Percentagae (%)']).toBe('20.17%');
    expect(overall.rows[0]['OTHER SOURCES — Percentage (%)']).toBe('72.43%');
    // Volume columns must not be touched.
    expect(overall.rows[0]['FARM SOURCE — Volume (kg)']).toBe('1234.5');
  });

  it('previews every sheet, so the monthly ones are reachable', async () => {
    const result = await parseFileReal(await xlsxFile(await buildWorkbook(), 'DFTC-VOLUME-2025-Final.xlsx'));

    expect(result.sheetNames).toEqual(['OVERALL TOTAL', 'FARM SOURCE', 'OTHER SOURCE']);
    const other = result.extractPreviewForRows(result.sheetsData['OTHER SOURCE']);
    expect(other.headers).toEqual(['No.', 'Commodity', ...MONTHS, 'OVERALL TOTAL']);
    expect(other.rows[0].Commodity).toBe('Ahos');
  });
});

describe('Preview parser — day-column price workbooks still work', () => {
  const priceWorkbook = buildPriceWorkbook;

  it('derives Day N columns from the blank header + day-number row', async () => {
    const result = await parseFileReal(await xlsxFile(await priceWorkbook(), 'DFTC-Retail-2026.xlsx'));

    expect(result.headers).toEqual(['NO.', 'COMMODITY', 'UOM', 'DATE', 'Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ COMMODITY: 'Tomato', 'Day 1': '10', 'Day 6': '15' });
  });

  it('does not force a monthly sheet when the workbook has none', async () => {
    const result = await parseFileReal(await xlsxFile(await priceWorkbook(), 'DFTC-Retail-2026.xlsx'));

    expect(result.primarySheetName).toBe('DFTC Retail Prices');
    expect(result.headers.some((h) => /^Day \d+$/.test(h))).toBe(true);
  });
});
