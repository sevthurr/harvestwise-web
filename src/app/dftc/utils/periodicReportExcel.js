import ExcelJS from "exceljs";

export const PRICE_REPORT_THEMES = {
  Retail: {
    hex: "#BDD7EE",
    argb: "FFBDD7EE",
    title: "DAILY PREVAILING RETAIL PRICES",
  },
  Wholesale: {
    hex: "#F8CBAD",
    argb: "FFF8CBAD",
    title: "DAILY PREVAILING WHOLESALE PRICES",
  },
  Landing: {
    hex: "#C6E0B4",
    argb: "FFC6E0B4",
    title: "DAILY PREVAILING LANDING PRICES",
  },
};

export function getExcelColumnLetter(colNumber) {
  let dividend = colNumber;
  let columnName = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    columnName = String.fromCharCode(65 + modulo) + columnName;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return columnName;
}

/**
 * Build a Weekly or Monthly Price Report ExcelJS Workbook matching the official
 * CAgrO-Davao Bankerohan / DFTC Taboan template.
 */
export async function buildPeriodicPriceWorkbook({
  categories = [],
  getDayValue,
  dayColumns = [],
  period = "monthly",
  market = "Bangkerohan Public Market",
  marketName = "",
  priceType = "Retail",
  periodLabel = "",
  sheetName = "Report",
  encodedBy = "",
  encodedByRole = "Data Analyst",
  reviewedBy = "",
  reviewedByRole = "Market Supervisor",
}) {
  const effectiveMarket = marketName || market;
  const wb = new ExcelJS.Workbook();
  const safeSheetName =
    String(sheetName || "Report")
      .replace(/[\\/*?:[\]]/g, " ")
      .trim()
      .slice(0, 31) || "Report";

  const ws = wb.addWorksheet(safeSheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  const theme = PRICE_REPORT_THEMES[priceType] || PRICE_REPORT_THEMES.Retail;
  const headerFill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: theme.argb },
  };
  const thinBorder = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };

  const numDays = dayColumns.length;
  const avgColIdx = 4 + numDays;
  const firstDayColLetter = getExcelColumnLetter(4);
  const lastDayColLetter = getExcelColumnLetter(3 + Math.max(1, numDays));

  // Column widths matching reference workbooks
  ws.getColumn(1).width = 5.5;
  ws.getColumn(2).width = 24;
  ws.getColumn(3).width = 10;
  for (let i = 0; i < numDays; i++) {
    ws.getColumn(4 + i).width = period === "weekly" ? 10 : 7.5;
  }
  ws.getColumn(avgColIdx).width = 22;

  const isDftc =
    String(effectiveMarket).toLowerCase().includes("dftc") ||
    String(effectiveMarket).toLowerCase().includes("taboan");
  const marketDisplay = isDftc ? "DFTC Taboan, Davao City" : "Bankerohan, Davao City";
  const avgHeaderLabel =
    period === "weekly" ? "Weekly Average Price" : "Monthly Average Price";

  // Row 1: Office header
  const r1 = ws.getRow(1);
  r1.height = 13.5;
  r1.getCell(1).value = "CITY AGRICULTURIST'S OFFICE - Davao City";
  r1.getCell(1).font = { name: "Tahoma", size: 10, italic: true };

  // Row 2: Division header
  const r2 = ws.getRow(2);
  r2.height = 13.5;
  r2.getCell(1).value = "Agribusiness Development Services Division (ADSD)";
  r2.getCell(1).font = { name: "Tahoma", size: 10, italic: true };

  // Row 3: Blank
  ws.getRow(3).height = 13.5;

  // Row 4: Report Title
  const r4 = ws.getRow(4);
  r4.height = 18;
  r4.getCell(1).value = theme.title;
  r4.getCell(1).font = { name: "Tahoma", size: 14, bold: true };

  // Row 5: Period
  const r5 = ws.getRow(5);
  r5.height = 13.5;
  r5.getCell(1).value = `Period: ${periodLabel}`;
  r5.getCell(1).font = { name: "Tahoma", size: 10 };

  // Row 6: Market
  const r6 = ws.getRow(6);
  r6.height = 13.5;
  r6.getCell(1).value = `Market: ${marketDisplay}`;
  r6.getCell(1).font = { name: "Tahoma", size: 10 };

  // Row 7: Table Header
  const r7 = ws.getRow(7);
  r7.height = 16;
  r7.getCell(1).value = "No.";
  r7.getCell(2).value = "Commodity";
  r7.getCell(3).value = "UOM";
  r7.getCell(4).value = "DATE";
  if (numDays > 1) {
    ws.mergeCells(7, 4, 7, 3 + numDays);
  }
  r7.getCell(avgColIdx).value = avgHeaderLabel;
  ws.mergeCells(7, avgColIdx, 8, avgColIdx);

  for (let c = 1; c <= avgColIdx; c++) {
    const cell = r7.getCell(c);
    cell.fill = headerFill;
    cell.border = thinBorder;
    cell.font = {
      name: "Tahoma",
      size: c === avgColIdx ? 9 : 8,
      bold: true,
      color: { argb: "FF000000" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  }

  // Row 8: First Category + Day Numbers
  const firstCat = categories[0];
  const r8 = ws.getRow(8);
  r8.height = 15;
  r8.getCell(1).value = firstCat?.name ? String(firstCat.name).toUpperCase() : "LOWLAND VEGETABLES";
  for (let i = 0; i < numDays; i++) {
    r8.getCell(4 + i).value = dayColumns[i].dayLabel ?? dayColumns[i].dayNum;
  }

  for (let c = 1; c <= avgColIdx; c++) {
    const cell = r8.getCell(c);
    cell.fill = headerFill;
    cell.border = thinBorder;
    if (c <= 3) {
      cell.font = {
        name: "Tahoma",
        size: 8,
        bold: true,
        italic: true,
        underline: true,
        color: { argb: "FF000000" },
      };
      cell.alignment = { horizontal: "left", vertical: "middle" };
    } else if (c < avgColIdx) {
      cell.font = {
        name: "Tahoma",
        size: 8,
        bold: true,
        color: { argb: "FF000000" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }
  }

  let currentRowIdx = 9;

  for (let catIdx = 0; catIdx < categories.length; catIdx++) {
    const cat = categories[catIdx];
    if (catIdx > 0) {
      const catRow = ws.getRow(currentRowIdx++);
      catRow.height = 15;
      catRow.getCell(1).value = String(cat?.name || "").toUpperCase();
      for (let c = 1; c <= avgColIdx; c++) {
        const cell = catRow.getCell(c);
        cell.fill = headerFill;
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          left: c === 1 ? { style: "thin", color: { argb: "FF000000" } } : undefined,
          right: c === avgColIdx ? { style: "thin", color: { argb: "FF000000" } } : undefined,
        };
        if (c === 1) {
          cell.font = {
            name: "Tahoma",
            size: 8,
            bold: true,
            italic: true,
            underline: true,
            color: { argb: "FF000000" },
          };
          cell.alignment = { horizontal: "left", vertical: "middle" };
        }
      }
    }

    for (const comm of cat.commodities || []) {
      const variants = comm.variants?.length ? comm.variants : [{ variety: null, uom: comm.uom }];
      variants.forEach((v, vIdx) => {
        const isFirst = vIdx === 0;
        const rowNum = currentRowIdx++;
        const row = ws.getRow(rowNum);
        row.height = 14.25;

        // Col 1: No.
        const cNo = row.getCell(1);
        cNo.value = isFirst ? comm.no : null;
        cNo.font = { name: "Tahoma", size: 8 };
        cNo.alignment = { horizontal: "center", vertical: "middle" };
        cNo.border = thinBorder;

        // Col 2: Commodity + Variety
        const cName = row.getCell(2);
        if (isFirst && v.variety) {
          cName.value = {
            richText: [
              { text: comm.name, font: { name: "Tahoma", size: 8, bold: true } },
              { text: ` (${v.variety})`, font: { name: "Tahoma", size: 8, bold: false } },
            ],
          };
        } else if (isFirst) {
          cName.value = comm.name;
          cName.font = { name: "Tahoma", size: 8, bold: true };
        } else {
          cName.value = `   (${v.variety})`;
          cName.font = { name: "Tahoma", size: 8, bold: false };
        }
        cName.alignment = { horizontal: "left", vertical: "middle" };
        cName.border = thinBorder;

        // Col 3: UOM
        const cUom = row.getCell(3);
        cUom.value = v.uom || comm.uom || "kg";
        cUom.font = { name: "Tahoma", size: 8 };
        cUom.alignment = { horizontal: "center", vertical: "middle" };
        cUom.border = thinBorder;

        // Day columns
        const activeDayVals = [];
        for (let dIdx = 0; dIdx < numDays; dIdx++) {
          const dCol = dayColumns[dIdx];
          const val = getDayValue ? getDayValue(comm.name, v.variety, dCol) : null;
          const numVal = val != null && !Number.isNaN(Number(val)) ? Number(val) : null;
          if (numVal != null) activeDayVals.push(numVal);

          const cDay = row.getCell(4 + dIdx);
          cDay.value = numVal != null ? Number(numVal.toFixed(2)) : null;
          cDay.numFmt = "#,##0.00";
          cDay.font = { name: "Tahoma", size: 8 };
          cDay.alignment = { horizontal: "right", vertical: "middle" };
          cDay.border = thinBorder;
        }

        // Average column
        const cAvg = row.getCell(avgColIdx);
        const avgVal =
          activeDayVals.length > 0
            ? Number(
                (
                  activeDayVals.reduce((acc, x) => acc + x, 0) / activeDayVals.length
                ).toFixed(2)
              )
            : null;
        cAvg.value =
          avgVal != null
            ? {
                formula: `IF(COUNT(${firstDayColLetter}${rowNum}:${lastDayColLetter}${rowNum})>0, AVERAGE(${firstDayColLetter}${rowNum}:${lastDayColLetter}${rowNum}), "")`,
                result: avgVal,
              }
            : null;
        cAvg.numFmt = "#,##0.00";
        cAvg.font = { name: "Tahoma", size: 8, bold: true };
        cAvg.alignment = { horizontal: "right", vertical: "middle" };
        cAvg.border = thinBorder;
      });
    }
  }

  // Signatory block
  if (encodedBy || reviewedBy) {
    currentRowIdx += 2;
    const sigLabelRow = ws.getRow(currentRowIdx++);
    sigLabelRow.getCell(2).value = "Prepared by:";
    sigLabelRow.getCell(2).font = { name: "Tahoma", size: 9, italic: true };
    sigLabelRow.getCell(Math.min(avgColIdx, 8)).value = "Noted by:";
    sigLabelRow.getCell(Math.min(avgColIdx, 8)).font = { name: "Tahoma", size: 9, italic: true };

    currentRowIdx += 1;
    const sigNameRow = ws.getRow(currentRowIdx++);
    sigNameRow.getCell(2).value = String(encodedBy || "").toUpperCase();
    sigNameRow.getCell(2).font = { name: "Tahoma", size: 9, bold: true };
    sigNameRow.getCell(Math.min(avgColIdx, 8)).value = String(reviewedBy || "").toUpperCase();
    sigNameRow.getCell(Math.min(avgColIdx, 8)).font = { name: "Tahoma", size: 9, bold: true };

    const sigRoleRow = ws.getRow(currentRowIdx++);
    sigRoleRow.getCell(2).value = encodedByRole || "Data Analyst";
    sigRoleRow.getCell(2).font = { name: "Tahoma", size: 8 };
    sigRoleRow.getCell(Math.min(avgColIdx, 8)).value = reviewedByRole || "Market Supervisor";
    sigRoleRow.getCell(Math.min(avgColIdx, 8)).font = { name: "Tahoma", size: 8 };
  }

  return wb;
}

/**
 * Build a Weekly or Monthly Arrival Volume ExcelJS Workbook with 3 tabs:
 * 1) OVERALL TOTAL
 * 2) FARM SOURCE (with daily breakdown columns + OVERALL TOTAL)
 * 3) OTHER SOURCE (with daily breakdown columns + OVERALL TOTAL)
 * Strictly matching DFTC-VOLUME-2025-Final.xlsx.
 */
export async function buildPeriodicArrivalWorkbook({
  rows = [],
  dayColumns = [],
  market = "DFTC Taboan",
  marketName = "",
  periodSubtitle = "",
  encodedBy = "",
  encodedByRole = "Data Analyst",
  reviewedBy = "",
  reviewedByRole = "Market Supervisor",
}) {
  const wb = new ExcelJS.Workbook();
  const effectiveMarket = marketName || market;
  const isBankerohan =
    String(effectiveMarket).toLowerCase().includes("bank") ||
    String(effectiveMarket).toLowerCase().includes("bangk");
  const titleText = isBankerohan
    ? "VOLUME (KG) OF COMMODITIES DROPPED AT BANKEROHAN PUBLIC MARKET"
    : "VOLUME (KG) OF COMMODITIES DROPPED AT DFTC";

  const thinBorder = {
    top: { style: "thin", color: { argb: "FF000000" } },
    left: { style: "thin", color: { argb: "FF000000" } },
    bottom: { style: "thin", color: { argb: "FF000000" } },
    right: { style: "thin", color: { argb: "FF000000" } },
  };
  const pinkFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF99FF" } };
  const greenFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92D050" } };
  const yellowFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } };

  // ── Sheet 1: OVERALL TOTAL ──
  const wsOverall = wb.addWorksheet("OVERALL TOTAL", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  wsOverall.columns = [
    { width: 6 },
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 18 },
  ];

  wsOverall.mergeCells("A1:G1");
  wsOverall.getCell("A1").value = titleText;
  wsOverall.getCell("A1").font = { name: "Tahoma", size: 12, bold: true };
  wsOverall.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  wsOverall.mergeCells("A2:G2");
  wsOverall.getCell("A2").value = periodSubtitle;
  wsOverall.getCell("A2").font = { name: "Tahoma", size: 11 };
  wsOverall.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  wsOverall.addRow([]);

  const h1 = wsOverall.addRow(["No.", "Commodity", "FARM SOURCE", "", "OTHER SOURCES", "", "OVERALL TOTAL"]);
  const h2 = wsOverall.addRow(["", "", "Volume (kg)", "Percentage (%)", "Volume (kg)", "Percentage (%)", ""]);
  wsOverall.mergeCells("A4:A5");
  wsOverall.mergeCells("B4:B5");
  wsOverall.mergeCells("C4:D4");
  wsOverall.mergeCells("E4:F4");
  wsOverall.mergeCells("G4:G5");

  for (const r of [h1, h2]) {
    r.height = 18;
    r.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > 7) return;
      cell.font = { name: "Tahoma", size: 9, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
      if (colNumber === 3 || colNumber === 4) cell.fill = pinkFill;
      else if (colNumber === 5 || colNumber === 6) cell.fill = greenFill;
      else if (colNumber === 7) cell.fill = yellowFill;
    });
  }

  const startDataRow = 6;
  const endDataRow = startDataRow + rows.length - 1;
  let sumFarm = 0;
  let sumOther = 0;
  let sumCombined = 0;

  rows.forEach((r) => {
    if (r.farmSource != null) sumFarm += Number(r.farmSource);
    if (r.otherSources != null) sumOther += Number(r.otherSources);
    if (r.overallTotal != null) sumCombined += Number(r.overallTotal);
  });

  rows.forEach((r, idx) => {
    const rowIdx = startDataRow + idx;
    const fVal = r.farmSource != null && Number(r.farmSource) > 0 ? Number(r.farmSource.toFixed(2)) : null;
    const oVal = r.otherSources != null && Number(r.otherSources) > 0 ? Number(r.otherSources.toFixed(2)) : null;
    const cVal = r.overallTotal != null && Number(r.overallTotal) > 0 ? Number(r.overallTotal.toFixed(2)) : null;

    const fPctResult = cVal && cVal > 0 && fVal != null ? Number((fVal / cVal).toFixed(4)) : null;
    const oPctResult = cVal && cVal > 0 && oVal != null ? Number((oVal / cVal).toFixed(4)) : null;

    const row = wsOverall.addRow([
      r.no,
      r.variety ? `${r.commodityName} (${r.variety})` : r.commodityName,
      fVal,
      fPctResult != null
        ? { formula: `IF(G${rowIdx}>0, C${rowIdx}/G${rowIdx}, "")`, result: fPctResult }
        : null,
      oVal,
      oPctResult != null
        ? { formula: `IF(G${rowIdx}>0, E${rowIdx}/G${rowIdx}, "")`, result: oPctResult }
        : null,
      cVal != null
        ? { formula: `IF(OR(C${rowIdx}>0,E${rowIdx}>0), SUM(C${rowIdx},E${rowIdx}), "")`, result: cVal }
        : null,
    ]);
    row.height = 15;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > 7) return;
      cell.font = { name: "Tahoma", size: 9, bold: colNumber === 7 && cVal != null };
      cell.border = thinBorder;
      if (colNumber === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
      else if (colNumber === 2) cell.alignment = { horizontal: "left", vertical: "middle" };
      else {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        if (colNumber === 3 || colNumber === 5 || colNumber === 7) cell.numFmt = "#,##0.00";
        else if (colNumber === 4 || colNumber === 6) cell.numFmt = "0.00%";
      }
    });
  });

  const totRowIdx = endDataRow + 1;
  const totFarmPct = sumCombined > 0 ? Number((sumFarm / sumCombined).toFixed(4)) : 0;
  const totOtherPct = sumCombined > 0 ? Number((sumOther / sumCombined).toFixed(4)) : 0;
  const totRow = wsOverall.addRow([
    "TOTAL",
    "",
    { formula: `SUM(C${startDataRow}:C${endDataRow})`, result: Number(sumFarm.toFixed(2)) },
    { formula: `IF(G${totRowIdx}>0, C${totRowIdx}/G${totRowIdx}, 0)`, result: totFarmPct },
    { formula: `SUM(E${startDataRow}:E${endDataRow})`, result: Number(sumOther.toFixed(2)) },
    { formula: `IF(G${totRowIdx}>0, E${totRowIdx}/G${totRowIdx}, 0)`, result: totOtherPct },
    { formula: `SUM(G${startDataRow}:G${endDataRow})`, result: Number(sumCombined.toFixed(2)) },
  ]);
  wsOverall.mergeCells(`A${totRowIdx}:B${totRowIdx}`);
  totRow.height = 18;
  totRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    if (colNumber > 7) return;
    cell.font = { name: "Tahoma", size: 9, bold: true };
    cell.border = thinBorder;
    if (colNumber <= 2) cell.alignment = { horizontal: "center", vertical: "middle" };
    else {
      cell.alignment = { horizontal: "right", vertical: "middle" };
      if (colNumber === 3 || colNumber === 5 || colNumber === 7) cell.numFmt = "#,##0.00";
      else if (colNumber === 4 || colNumber === 6) cell.numFmt = "0.00%";
    }
  });

  // Ranking sections on OVERALL TOTAL
  const rankedOverall = [...rows]
    .filter((r) => r.overallTotal != null && r.overallTotal > 0)
    .sort((a, b) => (b.overallTotal || 0) - (a.overallTotal || 0));
  const rankedFarm = [...rows]
    .filter((r) => r.farmSource != null && r.farmSource > 0)
    .sort((a, b) => (b.farmSource || 0) - (a.farmSource || 0));
  const rankedOther = [...rows]
    .filter((r) => r.otherSources != null && r.otherSources > 0)
    .sort((a, b) => (b.otherSources || 0) - (a.otherSources || 0));

  const appendRankingTable = (sectionTitle, items, getValue) => {
    wsOverall.addRow([]);
    const titleRow = wsOverall.addRow([sectionTitle]);
    wsOverall.mergeCells(`A${titleRow.number}:C${titleRow.number}`);
    titleRow.getCell(1).font = { name: "Tahoma", size: 9, bold: true };
    for (let c = 1; c <= 3; c++) titleRow.getCell(c).border = thinBorder;

    const hdrRow = wsOverall.addRow(["Rank", "Commodity", "Volume (kg)"]);
    for (let c = 1; c <= 3; c++) {
      const cell = hdrRow.getCell(c);
      cell.font = { name: "Tahoma", size: 9, bold: true };
      cell.border = thinBorder;
      cell.alignment = {
        horizontal: c === 1 ? "center" : c === 3 ? "right" : "left",
        vertical: "middle",
      };
    }

    items.forEach((item, idx) => {
      const val = getValue(item);
      const rRow = wsOverall.addRow([
        idx + 1,
        item.variety ? `${item.commodityName} (${item.variety})` : item.commodityName,
        val != null ? Number(val.toFixed(2)) : null,
      ]);
      for (let c = 1; c <= 3; c++) {
        const cell = rRow.getCell(c);
        cell.font = { name: "Tahoma", size: 9 };
        cell.border = thinBorder;
        if (c === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        else if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle" };
        else {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "#,##0.00";
        }
      }
    });
  };

  appendRankingTable(
    "COMMODITIES FROM HIGHEST TO LOWEST VOLUME (OVERALL)",
    rankedOverall,
    (x) => x.overallTotal
  );
  appendRankingTable(
    "COMMODITIES FROM HIGHEST TO LOWEST VOLUME (FARM SOURCE)",
    rankedFarm,
    (x) => x.farmSource
  );
  appendRankingTable(
    "COMMODITIES FROM HIGHEST TO LOWEST VOLUME (OTHER SOURCES)",
    rankedOther,
    (x) => x.otherSources
  );

  if (encodedBy || reviewedBy) {
    wsOverall.addRow([]);
    const lblRow = wsOverall.addRow(["Encoded By:", "", "", "Reviewed By:", "", ""]);
    lblRow.getCell(1).font = { name: "Tahoma", size: 8, italic: true };
    lblRow.getCell(4).font = { name: "Tahoma", size: 8, italic: true };

    const valRow = wsOverall.addRow([
      String(encodedBy || "").toUpperCase(),
      "",
      "",
      String(reviewedBy || "").toUpperCase(),
      "",
      "",
    ]);
    valRow.getCell(1).font = { name: "Tahoma", size: 9, bold: true };
    valRow.getCell(4).font = { name: "Tahoma", size: 9, bold: true };

    const roleRow = wsOverall.addRow([
      encodedByRole || "Data Analyst",
      "",
      "",
      reviewedByRole || "Market Supervisor",
      "",
      "",
    ]);
    roleRow.getCell(1).font = { name: "Tahoma", size: 8 };
    roleRow.getCell(4).font = { name: "Tahoma", size: 8 };
  }

  // ── Helper for Sheet 2 (FARM SOURCE) and Sheet 3 (OTHER SOURCES) ──
  const buildSourceBreakdownSheet = ({
    sheetName,
    sourceLabel,
    sourceDesc,
    headerFillObj,
    getDayVal,
    getTotalVal,
  }) => {
    const ws = wb.addWorksheet(sheetName, {
      pageSetup: {
        paperSize: 9,
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
      },
    });

    const numDays = dayColumns.length;
    const totalColIdx = 3 + numDays;
    const firstDayLetter = getExcelColumnLetter(3);
    const lastDayLetter = getExcelColumnLetter(2 + Math.max(1, numDays));
    const totalColLetter = getExcelColumnLetter(totalColIdx);

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 28;
    for (let i = 0; i < numDays; i++) {
      ws.getColumn(3 + i).width = numDays <= 7 ? 12 : 8;
    }
    ws.getColumn(totalColIdx).width = 16;

    ws.mergeCells(`A1:${totalColLetter}1`);
    ws.getCell("A1").value = titleText;
    ws.getCell("A1").font = { name: "Tahoma", size: 12, bold: true };
    ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

    ws.mergeCells(`A2:${totalColLetter}2`);
    ws.getCell("A2").value = periodSubtitle;
    ws.getCell("A2").font = { name: "Tahoma", size: 11 };
    ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

    ws.addRow([]);

    const srcRow = ws.addRow([""]);
    ws.mergeCells(`A4:${totalColLetter}4`);
    srcRow.getCell(1).value = {
      richText: [
        { text: "Source: ", font: { name: "Tahoma", size: 9 } },
        { text: `${sourceLabel} `, font: { name: "Tahoma", size: 9, bold: true } },
        { text: sourceDesc, font: { name: "Tahoma", size: 9, italic: true } },
      ],
    };
    srcRow.height = 18;

    const headerCells = [
      "No.",
      "Commodity",
      ...dayColumns.map((dc) => dc.shortLabel || String(dc.dayNum)),
      "OVERALL TOTAL",
    ];
    const hdrRow = ws.addRow(headerCells);
    hdrRow.height = 20;
    for (let c = 1; c <= totalColIdx; c++) {
      const cell = hdrRow.getCell(c);
      cell.font = { name: "Tahoma", size: 9, bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = thinBorder;
      cell.fill = headerFillObj;
    }

    const sStart = 6;
    const sEnd = sStart + rows.length - 1;
    const colTotals = new Array(numDays).fill(0);
    let grandTotal = 0;

    rows.forEach((r, rIdx) => {
      const excelRowNum = sStart + rIdx;
      const dayVals = dayColumns.map((dc, dIdx) => {
        const v = getDayVal(r, dc);
        const num = v != null && Number(v) > 0 ? Number(Number(v).toFixed(2)) : null;
        if (num != null) colTotals[dIdx] += num;
        return num;
      });
      const rowTot = getTotalVal(r);
      const rowTotNum =
        rowTot != null && Number(rowTot) > 0
          ? Number(Number(rowTot).toFixed(2))
          : dayVals.some((x) => x != null)
          ? Number(dayVals.reduce((a, b) => a + (b || 0), 0).toFixed(2))
          : null;
      if (rowTotNum != null) grandTotal += rowTotNum;

      const dRow = ws.addRow([
        r.no,
        r.variety ? `${r.commodityName} (${r.variety})` : r.commodityName,
        ...dayVals,
        rowTotNum != null
          ? {
              formula: `IF(COUNT(${firstDayLetter}${excelRowNum}:${lastDayLetter}${excelRowNum})>0, SUM(${firstDayLetter}${excelRowNum}:${lastDayLetter}${excelRowNum}), "")`,
              result: rowTotNum,
            }
          : null,
      ]);
      dRow.height = 15;
      for (let c = 1; c <= totalColIdx; c++) {
        const cell = dRow.getCell(c);
        cell.font = {
          name: "Tahoma",
          size: 9,
          bold: c === totalColIdx && rowTotNum != null,
        };
        cell.border = thinBorder;
        if (c === 1) cell.alignment = { horizontal: "center", vertical: "middle" };
        else if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle" };
        else {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "#,##0.00";
        }
      }
    });

    const totRowCells = [
      "TOTAL",
      "",
      ...colTotals.map((ct, dIdx) => {
        const colL = getExcelColumnLetter(3 + dIdx);
        return {
          formula: `SUM(${colL}${sStart}:${colL}${sEnd})`,
          result: Number(ct.toFixed(2)),
        };
      }),
      {
        formula: `SUM(${totalColLetter}${sStart}:${totalColLetter}${sEnd})`,
        result: Number(grandTotal.toFixed(2)),
      },
    ];
    const sTotRow = ws.addRow(totRowCells);
    ws.mergeCells(`A${sEnd + 1}:B${sEnd + 1}`);
    sTotRow.height = 18;
    for (let c = 1; c <= totalColIdx; c++) {
      const cell = sTotRow.getCell(c);
      cell.font = { name: "Tahoma", size: 9, bold: true };
      cell.border = thinBorder;
      if (c <= 2) cell.alignment = { horizontal: "center", vertical: "middle" };
      else {
        cell.alignment = { horizontal: "right", vertical: "middle" };
        cell.numFmt = "#,##0.00";
      }
    }
  };

  buildSourceBreakdownSheet({
    sheetName: "FARM SOURCE",
    sourceLabel: "FARM SOURCE",
    sourceDesc:
      "(Directly sourced from the farms of farmer-vendors and transported through the DFTC hauling truck service.)",
    headerFillObj: pinkFill,
    getDayVal: (r, dc) =>
      r.dailyFarmByDate?.[dc.isoDate] ?? r.dailyFarm?.[String(dc.dayNum)] ?? null,
    getTotalVal: (r) => r.farmSource,
  });

  buildSourceBreakdownSheet({
    sheetName: "OTHER SOURCES",
    sourceLabel: "OTHER SOURCE",
    sourceDesc:
      "(Sourced from public markets or external suppliers, not directly from farmer-vendors.)",
    headerFillObj: greenFill,
    getDayVal: (r, dc) =>
      r.dailyOtherByDate?.[dc.isoDate] ?? r.dailyOther?.[String(dc.dayNum)] ?? null,
    getTotalVal: (r) => r.otherSources,
  });

  return wb;
}

