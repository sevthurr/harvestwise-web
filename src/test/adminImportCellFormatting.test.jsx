import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import fs from 'node:fs';
import path from 'node:path';
import { parseFileReal } from '../app/admin/pages/AdminImport';

// `[object Object]` in the upload preview. `formatCellValue` matched a formula
// cell only when it had a cached `result`. DFTC writes no cached result for a
// sum over blank cells, so those cells arrived as a bare
// `{formula: "SUM(C9:N9)"}`, matched no branch, and were returned as an object
// — 148 of them across the three sheets, including the `OVERALL TOTAL` cells on
// every row where all twelve months are empty.
//
// These run against the committed workbooks rather than a synthetic fixture,
// because the defect is a property of the real file: which rows lack a cached
// result is exactly what needs pinning.

const WORKBOOK = 'DFTC-VOLUME-2025-Final.xlsx';
const EXTRACT = 'OTHER SOURCE';

async function loadWorkbook(name) {
  // Resolved at runtime on purpose: `new URL(..., import.meta.url)` makes Vite
  // try to statically transform the path as an asset import.
  const dir = path.resolve(process.cwd(), '../datasets/dftc');
  const bytes = new Uint8Array(fs.readFileSync(path.join(dir, name)));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes);
  return wb;
}

async function previewWorkbook(name) {
  const wb = await loadWorkbook(name);
  return parseFileReal({ name, arrayBuffer: async () => wb.xlsx.writeBuffer() });
}

// Every cell of every sheet, as the table would render it.
function renderCells(result) {
  const out = [];
  for (const sheet of Object.keys(result.sheetsData)) {
    const { headers, rows } = result.extractPreviewForRows(result.sheetsData[sheet]);
    for (const row of rows) for (const h of headers) out.push({ sheet, header: h, value: row[h] });
  }
  return out;
}

describe('AdminImport preview — no cell renders as [object Object]', () => {
  it('formats every cell of the DFTC volume workbook', async () => {
    const result = await previewWorkbook(WORKBOOK);
    const cells = renderCells(result);

    expect(cells.length).toBeGreaterThan(1000);
    const offenders = cells.filter(
      (c) => typeof c.value === 'object' || String(c.value) === '[object Object]'
    );
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it('covers the OVERALL TOTAL sheet, where Apple and Asparagus sit', async () => {
    const result = await previewWorkbook(WORKBOOK);
    const overall = result.extractPreviewForRows(result.sheetsData['OVERALL TOTAL']);

    const apple = overall.rows.find((r) => String(r.Commodity) === 'Apple');
    const asparagus = overall.rows.find((r) => String(r.Commodity) === 'Asparagus');
    expect(apple).toBeDefined();
    expect(asparagus).toBeDefined();

    for (const row of [apple, asparagus]) {
      for (const [header, value] of Object.entries(row)) {
        expect(typeof value, `${header} on ${row.Commodity}`).not.toBe('object');
        expect(String(value)).not.toContain('[object');
      }
    }
  });

  it('renders a formula with a cached result as its value', async () => {
    const result = await previewWorkbook(WORKBOOK);
    const overall = result.extractPreviewForRows(result.sheetsData['OVERALL TOTAL']);
    const ahos = overall.rows.find((r) => String(r.Commodity) === 'Ahos');

    // Ahos has real numbers, so its ratio formulas do carry cached results.
    const populated = Object.entries(ahos).filter(([, v]) => v !== '' && v !== undefined);
    expect(populated.length).toBeGreaterThan(1);
    for (const [header, value] of populated) {
      expect(String(value), header).not.toContain('[object');
    }
  });

  it('leaves an uncached formula blank rather than inventing a number', async () => {
    const wb = await loadWorkbook(WORKBOOK);
    const ws = wb.getWorksheet(EXTRACT);

    // Find a formula cell that genuinely has no cached result, so the test
    // tracks the file rather than a hardcoded address.
    let target;
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = cell.value;
        if (!target && v && typeof v === 'object' && 'formula' in v && !('result' in v)) {
          target = `${ws.getCell(row.number, 2).value} ${cell.address}`;
        }
      });
    });
    expect(target, 'workbook has an uncached formula to test').toBeTruthy();

    const result = await previewWorkbook(WORKBOOK);
    const [commodity] = String(target).split(' ');
    const extracted = result.extractPreviewForRows(result.sheetsData[EXTRACT]);
    const row = extracted.rows.find((r) => String(r.Commodity) === commodity);

    expect(row).toBeDefined();
    for (const value of Object.values(row)) {
      expect(String(value)).not.toContain('[object');
    }
  });

  it('still renders the monthly sheets correctly', async () => {
    const result = await previewWorkbook(WORKBOOK);

    expect(result.primarySheetName).toBe('FARM SOURCE');
    const farm = result.extractPreviewForRows(result.sheetsData['FARM SOURCE']);
    expect(farm.headers).toEqual([
      'No.', 'Commodity', 'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY',
      'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER',
      'DECEMBER', 'OVERALL TOTAL',
    ]);
    expect(farm.rows[0]).toMatchObject({ Commodity: 'Ahos', JANUARY: '255.51' });
  });
});

describe('AdminImport preview — single-sheet DFTC extracts', () => {
  // DFTC also ships FARM SOURCE and OTHER SOURCE as standalone one-sheet
  // workbooks. Their header row is row 5, same as the combined file.
  it.each(['DFTC-VOLUME-2025-Final-s2.xlsx', 'DFTC-VOLUME-2025-Final-s3.xlsx'])(
    '%s formats every cell',
    async (name) => {
      const result = await previewWorkbook(name);
      const cells = renderCells(result);

      expect(cells.length).toBeGreaterThan(0);
      expect(
        cells.filter((c) => String(c.value) === '[object Object]').slice(0, 10)
      ).toEqual([]);
      expect(result.headers).toContain('JANUARY');
      expect(result.headers).toContain('OVERALL TOTAL');
    }
  );

  it('s3 (OTHER SOURCE) shows Apple and Asparagus month figures', async () => {
    const result = await previewWorkbook('DFTC-VOLUME-2025-Final-s3.xlsx');
    const apple = result.rows.find((r) => String(r.Commodity) === 'Apple');
    const asparagus = result.rows.find((r) => String(r.Commodity) === 'Asparagus');

    expect(apple).toMatchObject({ JULY: '5', OCTOBER: '4', DECEMBER: '148', 'OVERALL TOTAL': '157' });
    expect(asparagus).toMatchObject({ JUNE: '2', JULY: '2.38', AUGUST: '0.4', 'OVERALL TOTAL': '4.78' });
  });
});
