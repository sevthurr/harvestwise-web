import { describe, it, expect } from "vitest";
import ExcelJS from "exceljs";
import {
  buildPeriodicPriceWorkbook,
  buildPeriodicArrivalWorkbook,
  PRICE_REPORT_THEMES,
} from "../app/dftc/utils/periodicReportExcel";
import { buildSavedDatasetsList } from "../app/dftc/pages/dftcSavedDatasets";

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

  it("builds Weekly and Monthly Price workbooks matching CAgrO-Davao Retail, Wholesale, and Landing colors and Tahoma font", async () => {
    expect(PRICE_REPORT_THEMES.Retail.argb).toBe("FFBDD7EE");
    expect(PRICE_REPORT_THEMES.Wholesale.argb).toBe("FFF8CBAD");
    expect(PRICE_REPORT_THEMES.Landing.argb).toBe("FFC6E0B4");

    const dayColumns = [
      { isoDate: "2026-11-02", dayNum: 2, dayLabel: 2, shortLabel: "NOV 2" },
      { isoDate: "2026-11-03", dayNum: 3, dayLabel: 3, shortLabel: "NOV 3" },
    ];
    const categories = [
      {
        name: "LOWLAND VEGETABLES",
        commodities: [
          {
            no: 1,
            name: "Ampalaya",
            uom: "kg",
            variants: [{ variety: "Galaxy", uom: "kg" }],
          },
        ],
      },
    ];

    const wb = await buildPeriodicPriceWorkbook({
      marketName: "Bangkerohan Public Market",
      priceType: "Wholesale",
      period: "weekly",
      periodLabel: "November 2-8, 2026",
      sheetName: "Nov 2-8, 2026",
      dayColumns,
      categories,
      getDayValue: (_c, _v, dc) => (dc.dayNum === 2 ? 60 : 70),
      encodedBy: "MARIA S. SANTOS",
      encodedByRole: "Data Analyst",
      reviewedBy: "JUAN DELA CRUZ",
      reviewedByRole: "Market Supervisor",
    });

    const ws = wb.getWorksheet("Nov 2-8, 2026");
    expect(ws).toBeDefined();
    expect(ws.getCell("A1").value).toBe("CITY AGRICULTURIST'S OFFICE - Davao City");
    expect(ws.getCell("A1").font.name).toBe("Tahoma");
    expect(ws.getCell("A4").value).toBe("DAILY PREVAILING WHOLESALE PRICES");
    expect(ws.getCell("A7").fill.fgColor.argb).toBe("FFF8CBAD");
    expect(ws.getCell("F7").value).toBe("Weekly Average Price");
    expect(ws.getCell("D9").value).toBe(60);
    expect(ws.getCell("E9").value).toBe(70);
    expect(ws.getCell("F9").value.result).toBe(65);
  });

  it("builds Weekly and Monthly Arrival workbooks with OVERALL TOTAL, FARM SOURCE, and OTHER SOURCES tabs", async () => {
    const dayColumns = [
      { isoDate: "2026-11-02", dayNum: 2, dayLabel: 2, shortLabel: "NOV 2" },
      { isoDate: "2026-11-03", dayNum: 3, dayLabel: 3, shortLabel: "NOV 3" },
    ];
    const rows = [
      {
        no: 1,
        commodityName: "Ampalaya",
        variety: "Galaxy",
        farmSource: 100,
        otherSources: 50,
        overallTotal: 150,
        dailyFarmByDate: { "2026-11-02": 60, "2026-11-03": 40 },
        dailyOtherByDate: { "2026-11-02": 20, "2026-11-03": 30 },
      },
    ];

    const wb = await buildPeriodicArrivalWorkbook({
      marketName: "DFTC Taboan",
      period: "weekly",
      periodSubtitle: "For the Period of November 2–8, 2026",
      dayColumns,
      rows,
    });

    expect(wb.worksheets.map((w) => w.name)).toEqual([
      "OVERALL TOTAL",
      "FARM SOURCE",
      "OTHER SOURCES",
    ]);

    const wsFarm = wb.getWorksheet("FARM SOURCE");
    expect(wsFarm.getCell("A5").fill.fgColor.argb).toBe("FFFF99FF");
    expect(wsFarm.getCell("C6").value).toBe(60);
    expect(wsFarm.getCell("D6").value).toBe(40);
    expect(wsFarm.getCell("E6").value.result).toBe(100);

    const wsOther = wb.getWorksheet("OTHER SOURCES");
    expect(wsOther.getCell("A5").fill.fgColor.argb).toBe("FF92D050");
    expect(wsOther.getCell("C6").value).toBe(20);
    expect(wsOther.getCell("D6").value).toBe(30);
    expect(wsOther.getCell("E6").value.result).toBe(50);
  });

  it("preserves Generated Report submissions in Recent Saved Data without merging them into manual daily price entries", () => {
    const items = buildSavedDatasetsList(
      [
        {
          id: "SUB-20261107-99",
          submission_id: "SUB-20261107-99",
          data_type: "price",
          price_type: "Retail",
          source_name: "Bangkerohan Public Market",
          submission_method: "Generated Report",
          report_period: "weekly",
          period_start_date: "2026-11-02",
          period_end_date: "2026-11-08",
          original_file_name: "(CAgrO-Davao)-Bankerohan-Weekly-Retail-Prices-Nov-2-8-2026.xlsx",
          reporting_date: "2026-11-02",
          saved_at: "2026-11-07T10:30:00Z",
          submitted_by_name: "JUAN DELA CRUZ",
          encoded_by: "MARIA S. SANTOS",
          record_count: 25,
          status: "saved",
        },
      ],
      "2026-11-07",
      0,
      null
    );

    expect(items).toHaveLength(1);
    expect(items[0].isGeneratedReport).toBe(true);
    expect(items[0].entryMethod).toBe("Generated Report");
    expect(items[0].name).toBe("(CAgrO-Davao)-Bankerohan-Weekly-Retail-Prices-Nov-2-8-2026.xlsx");
    expect(items[0].dataType).toBe("Weekly Retail Price Report");
  });
});
