// Page layout for the DFTC price monitoring report.
//
// The commodity catalogue is NOT here. It is served by
// `/dftc/reports/preview`, read from the commodity master
// (`commodity.display_order`) and seeded by
// `api/scripts/data/dftc_price_report.py`.
//
// Which categories share a sheet:
// - IMG format: strictly 4 images only (Page 4 shares Fruits and Others).
// - PDF format: un-cramped pages where Fruits and Others have their own sheets (5 pages).

export const IMG_PAGE_CATEGORY_GROUPS = [
  ["Lowland Vegetables"],
  ["Highland Vegetables"],
  ["Spices", "Rootcrops"],
  ["Fruits", "Others"]
];

export const PDF_PAGE_CATEGORY_GROUPS = [
  ["Lowland Vegetables"],
  ["Highland Vegetables"],
  ["Spices", "Rootcrops"],
  ["Fruits"],
  ["Others"]
];

export const PDF_PORTRAIT_PAGE_CATEGORY_GROUPS = [
  ["Lowland Vegetables", "Highland Vegetables"],
  ["Spices", "Rootcrops"],
  ["Fruits", "Others"]
];

export const PAGE_CATEGORY_GROUPS = IMG_PAGE_CATEGORY_GROUPS;
