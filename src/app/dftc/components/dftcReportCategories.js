// Page layout for the DFTC price monitoring report.
//
// The commodity catalogue is NOT here. It is served by
// `/dftc/reports/preview`, read from the commodity master
// (`commodity.display_order`) and seeded by
// `api/scripts/data/dftc_price_report.py`. That list used to live in this file
// as 32 hardcoded commodities with mock price columns, transcribed from the
// DFTC's published retail price workbook — and it drifted: 19 of the workbook's
// commodities were missing, Atsal sat under Highland Vegetables, Chinese Pechay
// under Lowland, and the row numbers did not match the row order.
//
// The workbook is a document, not a runtime dependency. Keeping the order in the
// seed means adding a commodity is a data change, and the report follows.

// Which categories share an A4 landscape sheet. Spices and rootcrops share one;
// fruits and others share the last. Pure presentation — the catalogue decides
// what is on the report, this decides what page it lands on.
const PAGE_CATEGORY_GROUPS = [
  ["Lowland Vegetables"],
  ["Highland Vegetables"],
  ["Spices", "Rootcrops"],
  ["Fruits", "Others"]
];

export { PAGE_CATEGORY_GROUPS };
