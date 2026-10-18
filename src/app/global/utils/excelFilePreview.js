// Workbook preview parser shared by the admin and DFTC upload pages.
//
// It used to be duplicated in `admin/pages/AdminImport.jsx` and
// `dftc/pages/DFTCUpload.jsx`. The copies had drifted, so the same DFTC
// arrival workbook produced two different previews depending on which page
// uploaded it — the DFTC copy lost the day-column, merged-header, duplicate
// header, percent and formula handling, and always opened on sheet 0. Both
// pages now share this one implementation, so the preview they render is
// identical by construction.
//
// Two shapes are returned, depending on the file:
//   xlsx/xlsm/xls/ods — headers and rows are extracted per sheet, and
//     `extractPreviewForRows` is handed back so the caller can re-extract when
//     the user switches sheets without re-reading the file.
//   everything else — the delimited-text fallback, which has no sheet concept.

function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (typeof file.text === "function") {
      file.text().then(resolve).catch(reject);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result || "");
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// A cell only marks a "day column" when the header above it is blank.
//
// The DFTC arrival workbook puts a row *number* in the first column of its
// monthly sheets, so the old "is the cell below a number between 1 and 31"
// test matched that 1, decided the sheet was day-granular, dropped the first
// data row, and renamed JANUARY..DECEMBER to "Day 17", "Day 5", ... Genuine
// day-column price reports label those columns with an empty header cell
// (NO. | COMMODITY | UOM | DATE | <blank> | 1 | 2 | 3 ...), so requiring the
// blank header keeps them working.
function isDayNumber(value) {
  const n = parseInt(String(value ?? "").trim(), 10);
  return !Number.isNaN(n) && n >= 1 && n <= 31;
}

const MONTH_HEADER_RE =
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t)?|oct(ober)?|nov(ember)?|dec(ember)?)/i;

function isMonthHeader(value) {
  return MONTH_HEADER_RE.test(String(value ?? "").trim());
}

// Workbook headers are not guaranteed unique, and the preview keys rows by
// header name — a collision silently drops a column's values. Suffix repeats.
function uniqueHeaders(names) {
  const seen = new Map();
  return names.map((name) => {
    const count = (seen.get(name) || 0) + 1;
    seen.set(name, count);
    return count === 1 ? name : `${name} (${count})`;
  });
}

// DFTC writes its share columns as fractions under a percent cell format
// (0.20169 displayed as 20.17%). Values already in percent points are left
// alone, so a file that stores 20.17 does not become 2017%.
function formatPercentCell(header, value) {
  const text = String(value ?? "").trim();
  if (!text) return value;
  const n = Number(text);
  if (!Number.isFinite(n)) return value;
  const isPercentHeader = /percent|%/.test(String(header).toLowerCase());
  if (!isPercentHeader) return value;
  const pct = Math.abs(n) <= 1 ? n * 100 : n;
  return `${pct.toFixed(2)}%`;
}

async function parseFileReal(selectedFile) {
  const ext = (selectedFile.name.split('.').pop() || '').toLowerCase();

  if (['xlsx', 'xlsm', 'xls', 'ods'].includes(ext)) {
    try {
      const ExcelJSModule = await import("exceljs");
      const Workbook = ExcelJSModule.default?.Workbook ?? ExcelJSModule.Workbook;
      const wb = new Workbook();
      const buffer = await selectedFile.arrayBuffer();
      await wb.xlsx.load(buffer);

      const allSheets = wb.worksheets || [];
      const validWorksheets = allSheets.filter(w => !/\(2\)|\boverflow\b/i.test(w.name));
      if (validWorksheets.length === 0 && allSheets.length > 0) {
        validWorksheets.push(allSheets[0]);
      }
      if (validWorksheets.length === 0) return { headers: [], rows: [], rawRows: [], sheetNames: [], sheetsData: {}, totalRowCount: 0 };

      // Must return a primitive for every input. A bare object here reaches
      // the table as `String(obj)` and renders "[object Object]".
      const formatCellValue = (v) => {
        if (v == null) return '';
        if (typeof v !== 'object') return v;
        if (v instanceof Date) return v.toISOString();
        if (v.text !== undefined) return v.text;
        if (Array.isArray(v.richText)) {
          return v.richText.map(t => t.text || '').join('');
        }
        // A formula cell only carries `result` when the file was saved with a
        // cached value. DFTC writes none for a sum over blank cells, so
        // 148 cells across the volume workbooks — every all-empty OVERALL
        // TOTAL on the Apple/Asparagus rows among them — arrived as
        // `{formula: "SUM(C9:N9)"}` with nothing for the branches above to
        // match, and fell through to `return v`.
        if ('result' in v) return v.result == null ? '' : String(v.result);
        if ('formula' in v || 'sharedFormula' in v) return '';
        if ('error' in v) return String(v.error);
        return '';
      };

      const sheetNames = validWorksheets.map(w => w.name);
      const sheetsData = {};

      validWorksheets.forEach(ws => {
        const rowsData = [];
        ws.eachRow({ includeEmpty: true }, (row) => {
          const maxCols = Math.max(row.values?.length || 0, ws.columnCount || 0, 35);
          const vals = [];
          for (let c = 1; c <= maxCols; c++) {
            const cell = row.getCell(c);
            vals.push(formatCellValue(cell.value));
          }
          rowsData.push(vals);
        });
        sheetsData[ws.name] = rowsData;
      });

      const extractPreviewForRows = (rowsData) => {
        if (!rowsData || rowsData.length === 0) return { headers: [], rows: [] };

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(15, rowsData.length); i++) {
          const rVals = rowsData[i].map(v => String(v ?? '').trim().toUpperCase());
          if (rVals.some(v => v === "COMMODITY" || v.startsWith("COMMODIT"))) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const rawHdr = rowsData[headerRowIdx];
          const nextRow = rowsData[headerRowIdx + 1];
          const parentAt = (i) => {
            const v = rawHdr ? rawHdr[i] : undefined;
            return v == null ? '' : String(v).trim();
          };

          // A day column is a 1..31 number sitting under a *blank* header.
          // Month columns in the DFTC arrival workbook are labelled
          // JANUARY..DECEMBER and the leading "No." column holds a row
          // number, so neither can be mistaken for a day column.
          const dayColumns = (nextRow || []).map((v, i) => parentAt(i) === '' && isDayNumber(v));
          const hasDayRow = dayColumns.some(Boolean);

          // A second header line shows up when a parent label spans merged
          // cells (FARM SOURCE over Volume/Percentage), which leaves blank
          // parent cells above the sub-labels. Only treat it as a header when
          // it adds labels under those blanks and carries no commodity name,
          // so a genuine first data row is never swallowed.
          const hasSubHeader = !hasDayRow && !!nextRow && nextRow.some((v, i) => {
            if (parentAt(i) !== '' && parentAt(i) !== `col_${i + 1}`) return false;
            const text = v == null ? '' : String(v).trim();
            return text !== '' && !isDayNumber(text);
          }) && String(nextRow[1] ?? '').trim() === '';

          const dataStartIdx = hasDayRow || hasSubHeader ? headerRowIdx + 2 : headerRowIdx + 1;
          const maxCols = Math.max(rawHdr?.length || 0, nextRow?.length || 0);

          const headers = [];
          let carriedParent = '';
          for (let i = 0; i < maxCols; i++) {
            const own = parentAt(i);
            if (own !== '' && !own.startsWith('col_')) carriedParent = own;
            if (hasSubHeader && carriedParent !== '') {
              const sub = nextRow && nextRow[i] != null ? String(nextRow[i]).trim() : '';
              // A merged parent repeats across the columns it spans, so carry
              // it forward instead of dropping the sub-label's context.
              if (sub !== '' && own !== '') headers.push(`${own} — ${sub}`);
              else if (own !== '') headers.push(own);
              else if (sub !== '') headers.push(`${carriedParent} — ${sub}`);
              else headers.push(`col_${i + 1}`);
            } else if (dayColumns[i]) {
              headers.push(`Day ${parseInt(String(nextRow[i]).trim(), 10)}`);
            } else if (own !== '') {
              headers.push(own);
            } else {
              headers.push(`col_${i + 1}`);
            }
          }

          const dataRows = rowsData.slice(dataStartIdx).filter(r => {
            const rowStr = r.map(v => String(v ?? '').trim().toLowerCase()).join(" ");
            if (rowStr.startsWith("prepared") || rowStr.startsWith("checked") || rowStr.startsWith("approved")) return false;
            // Ensure commodity column (index 1) is present
            const comm = String(r[1] ?? '').trim();
            return comm.length > 0;
          });

          // Trim trailing empty generated column headers
          let lastNonEmptyCol = -1;
          for (let i = headers.length - 1; i >= 0; i--) {
            const h = headers[i];
            const hasData = dataRows.some(r => r[i] !== undefined && r[i] !== null && String(r[i]).trim() !== '');
            if (hasData || (h && !h.startsWith('col_'))) {
              lastNonEmptyCol = i;
              break;
            }
          }
          const activeHeaders = uniqueHeaders(headers.slice(0, lastNonEmptyCol + 1));

          const rows = dataRows.map(r => {
            const rowObj = {};
            activeHeaders.forEach((h, i) => {
              const cell = r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : '';
              rowObj[h] = formatPercentCell(h, cell);
            });
            return rowObj;
          });

          return { headers: activeHeaders, rows };
        }

        const headers = uniqueHeaders((rowsData[0] || []).map((h, i) => String(h).trim() || `col_${i + 1}`));
        const rows = rowsData.slice(1).map(r => {
          const rowObj = {};
          headers.forEach((h, i) => {
            const cell = r[i] !== undefined && r[i] !== null ? String(r[i]).trim() : '';
            rowObj[h] = formatPercentCell(h, cell);
          });
          return rowObj;
        });
        return { headers, rows };
      };

      let totalRowCount = 0;
      const previewsBySheet = {};
      validWorksheets.forEach(ws => {
        const preview = extractPreviewForRows(sheetsData[ws.name]);
        previewsBySheet[ws.name] = preview;
        totalRowCount += preview.rows.length;
      });

      // Land on a monthly sheet when the workbook has one. DFTC files open on
      // "OVERALL TOTAL", which is a single annual row per commodity, so the
      // upload used to present the one table that cannot show months.
      const primarySheetName =
        validWorksheets.find(ws => (previewsBySheet[ws.name].headers || []).some(isMonthHeader))?.name
        || validWorksheets[0].name;
      const { headers, rows } = previewsBySheet[primarySheetName];

      return {
        headers,
        rows,
        rawRows: sheetsData[primarySheetName] || [],
        primarySheetName,
        sheetNames,
        sheetsData,
        totalRowCount,
        extractPreviewForRows,
      };
    } catch (err) {
      console.warn("Excel parsing fallback to text:", err);
    }
  }

  const text = await readFileText(selectedFile);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], rawRows: [], sheetNames: [], sheetsData: {}, totalRowCount: 0 };

  const delimiter = ext === 'tsv' ? '\t' : ',';

  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h, i) => h.replace(/^"|"$/g, '').trim() || `col_${i + 1}`);
  const rows = [];
  const rawRows = lines.slice(0, 30).map(l => parseLine(l));

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseLine(lines[i]);
    const rowObj = {};
    let hasAnyData = false;
    headers.forEach((h, idx) => {
      const val = (parsed[idx] || '').replace(/^"|"$/g, '').trim();
      if (val) hasAnyData = true;
      rowObj[h] = val;
    });
    if (hasAnyData) rows.push(rowObj);
  }

  return { headers, rows, rawRows, sheetNames: [], sheetsData: {}, totalRowCount: rows.length };
}

export { parseFileReal };
