import ExcelJS from 'exceljs';

// The DFTC arrival workbook, as ExcelJS can build it. Shared by the admin and
// DFTC preview tests: both pages parse the same file, so both need the same
// layout. Column A of the monthly sheets holds a row *number*, which the old
// preview read as a day column — it dropped the first data row and renamed
// JANUARY..DECEMBER to "Day 17", "Day 15", "Day 5", ...

export const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export async function buildArrivalWorkbook() {
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

// Price reports genuinely are day-granular, and they label the day columns with
// a *blank* header cell. That blank is what the arrival fix keys off, so this
// case guards against the two layouts being conflated again.
export async function buildPriceWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('DFTC Retail Prices');
  ws.getRow(7).values = ['NO.', 'COMMODITY', 'UOM', 'DATE', null, null, null, null, null, null];
  ws.getRow(8).values = [null, null, null, null, 1, 2, 3, 4, 5, 6];
  ws.getRow(9).values = [1, 'Tomato', 'kg', '2026-01-01', 10, 11, 12, 13, 14, 15];
  return wb;
}

export async function xlsxFile(wb, name) {
  const bytes = new Uint8Array(await wb.xlsx.writeBuffer());
  // jsdom's File has no arrayBuffer(), which is the one thing the xlsx branch of
  // parseFileReal needs. Duck-type the single member it reads. The bytes go back
  // as a Uint8Array because a jsdom ArrayBuffer fails jszip's cross-realm
  // `instanceof` check; ExcelJS accepts any supported binary type.
  return { name, arrayBuffer: async () => bytes };
}
