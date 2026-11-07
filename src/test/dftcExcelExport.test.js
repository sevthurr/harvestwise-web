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
});
