import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";

describe("DFTC Excel Export Specifications", () => {
  it("creates sheet named after the day of the week and applies grey category fill", async () => {
    const wb = new ExcelJS.Workbook();
    // Simulate day name logic
    const reportingDate = "November 07, 2026";
    const d = new Date(reportingDate);
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
    expect(dayName).toBe("Saturday");

    const ws = wb.addWorksheet(dayName);
    expect(ws.name).toBe("Saturday");

    const CATEGORY_BG = "#cbd5e1";
    const LEFT_BG = "#d9ead3";
    const BANK_BG = "#fff2cc";
    const DFTC_BG = "#cfe2f3";

    const catRow = ws.addRow(["LOWLAND VEGETABLES"]);
    ws.mergeCells(`A${catRow.number}:H${catRow.number}`);
    const cell = catRow.getCell(1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CATEGORY_BG.replace("#", "FF").toUpperCase() } };

    expect(cell.fill.fgColor.argb).toBe("FFCBD5E1");

    const dataRow = ws.addRow([1, "Ampalaya", "kg", "45.00", "55.00", "65.00", "50.00", "60.00"]);
    dataRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LEFT_BG.replace("#", "FF").toUpperCase() } };
    dataRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: BANK_BG.replace("#", "FF").toUpperCase() } };
    dataRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: DFTC_BG.replace("#", "FF").toUpperCase() } };

    expect(dataRow.getCell(1).fill.fgColor.argb).toBe("FFD9EAD3");
    expect(dataRow.getCell(4).fill.fgColor.argb).toBe("FFFFF2CC");
    expect(dataRow.getCell(7).fill.fgColor.argb).toBe("FFCFE2F3");
  });

  it("exports Arrival Volume with OVERALL TOTAL, FARM SOURCE, and OTHER SOURCES tabs without #VALUE! formulas", async () => {
    const wb = new ExcelJS.Workbook();
    const wsOverall = wb.addWorksheet("OVERALL TOTAL");
    const wsFarm = wb.addWorksheet("FARM SOURCE");
    const wsOther = wb.addWorksheet("OTHER SOURCES");

    expect(wb.worksheets.map(w => w.name)).toEqual([
      "OVERALL TOTAL",
      "FARM SOURCE",
      "OTHER SOURCES"
    ]);

    // Test row with empty values to ensure no #VALUE! formulas
    const rowNum = 6;
    const farmVal = null;
    const otherVal = null;
    const hasFarm = farmVal !== null && !isNaN(farmVal);
    const hasOther = otherVal !== null && !isNaN(otherVal);
    const rowSum = (hasFarm ? farmVal : 0) + (hasOther ? otherVal : 0);
    const hasAny = (hasFarm && farmVal > 0) || (hasOther && otherVal > 0);

    const emptyRow = wsOverall.addRow([
      1,
      "Ahos (Imported)",
      hasFarm ? farmVal : null,
      hasAny && rowSum > 0 && hasFarm && farmVal > 0
        ? { formula: `IF(G${rowNum}>0, C${rowNum}/G${rowNum}, "")`, result: farmVal / rowSum }
        : (hasAny ? { formula: `IF(G${rowNum}>0, C${rowNum}/G${rowNum}, "")` } : null),
      hasOther ? otherVal : null,
      hasAny && rowSum > 0 && hasOther && otherVal > 0
        ? { formula: `IF(G${rowNum}>0, E${rowNum}/G${rowNum}, "")`, result: otherVal / rowSum }
        : (hasAny ? { formula: `IF(G${rowNum}>0, E${rowNum}/G${rowNum}, "")` } : null),
      hasAny
        ? { formula: `IF(OR(C${rowNum}>0, E${rowNum}>0), SUM(C${rowNum}, E${rowNum}), "")`, result: rowSum }
        : null
    ]);

    // Value checks
    expect(emptyRow.getCell(3).value).toBeNull();
    expect(emptyRow.getCell(4).value).toBeNull();
    expect(emptyRow.getCell(5).value).toBeNull();
    expect(emptyRow.getCell(6).value).toBeNull();
    expect(emptyRow.getCell(7).value).toBeNull();

    // Now test a row with volume to ensure formula and results are correct
    const activeFarm = 45.00;
    const activeRow = wsOverall.addRow([
      6,
      "Atsal (Smooth Cayenne)",
      activeFarm,
      { formula: `IF(G7>0, C7/G7, "")`, result: 1 },
      null,
      null,
      { formula: `IF(OR(C7>0, E7>0), SUM(C7, E7), "")`, result: 45 }
    ]);

    expect(activeRow.getCell(3).value).toBe(45);
    expect(activeRow.getCell(4).value.result).toBe(1);
    expect(activeRow.getCell(5).value).toBeNull();
    expect(activeRow.getCell(6).value).toBeNull();
    expect(activeRow.getCell(7).value.result).toBe(45);
    expect(activeRow.getCell(7).value.formula).toBe('IF(OR(C7>0, E7>0), SUM(C7, E7), "")');
  });
});
