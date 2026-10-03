import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseFileReal } from '../app/admin/pages/AdminImport';

// The DFTC arrival workbook: three sheets, two of them monthly. Column A of
// the monthly sheets holds a row *number*, which the old preview read as a day
// column — it dropped the first data row and renamed JANUARY..DECEMBER to
// "Day 17", "Day 15", "Day 5", ... These tests pin the sheet layout end to end
// through the real parser rather than a fixture object.

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

async function buildWorkbook() {
  const wb = new ExcelJS.Workbook();

  const overall = wb.addWorksheet('OVERALL TOTAL');
  overall.getRow(4).values = [
    'No.', 'Commodity', 'FARM SOURCE', null, 'OTHER SOURCES', null, 'OVERALL TOTAL',
  ];
  overall.getRow(5).values = [
    null, null, 'Volume (kg)', 'Percentagae (%)', 'Volume (kg)', 'Percentage (%)', null,
  ];
  overall.getRow(6).values = ['1', 'Ampalaya', 1234.5, 0.20169, 890.25, 0.72431, 2124.75];
  overall.getRow(7).values = ['2', 'Tomato', 500, 0.4, 750, 0.6, 1250];

  for (const name of ['FARM SOURCE', 'OTHER SOURCE']) {
    const ws = wb.addWorksheet(name);
    // Four blank/title rows, so the header sits on row 5 like the real file.
    ws.getRow(5).values = ['No.', 'Commodity', ...MONTHS, 'OVERALL TOTAL'];
    ws.getRow(6).values = ['1', 'Ahos', 255.51, 300.2, 410.75, 380.1, 455.9, 500.3, 610.4,
      580.2, 700.9, 640.15, 520.6, 480.75, 5835.85];
    ws.getRow(7).values = ['2', 'Tomato', 90, 95, 120, 140, 160, 150, 130, 110, 100, 95, 90, 1280];
  }

  return wb;
}

async function xlsxFile(wb, name) {
  const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
  // jsdom's File has no arrayBuffer(), which is the one thing the xlsx branch
  // of parseFileReal needs. Duck-type the single member it reads. The bytes go
  // back as a Uint8Array because a jsdom ArrayBuffer fails jszip's
  // cross-realm `instanceof` check; ExcelJS accepts any supported binary type.
  return { name, arrayBuffer: async () => bytes };
}

describe('AdminImport preview — DFTC arrival workbook', () => {
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

describe('AdminImport preview — day-column price workbooks still work', () => {
  // Price reports genuinely are day-granular, and they label the day columns
  // with a *blank* header cell. That blank is what the arrival fix keys off, so
  // this case guards against the two layouts being conflated again.
  async function priceWorkbook() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('DFTC Retail Prices');
    ws.getRow(7).values = ['NO.', 'COMMODITY', 'UOM', 'DATE', null, null, null, null, null, null];
    ws.getRow(8).values = [null, null, null, null, 1, 2, 3, 4, 5, 6];
    ws.getRow(9).values = [1, 'Tomato', 'kg', '2026-01-01', 10, 11, 12, 13, 14, 15];
    return wb;
  }

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
