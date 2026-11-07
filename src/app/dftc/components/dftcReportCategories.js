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

/**
 * Standard DFTC Price Monitoring master catalogue fallback.
 * Mirrors `api/scripts/data/dftc_price_report.py` in survey display order.
 * Ensures the preview matrix and workbook exports are NEVER empty while loading
 * or before backend `/dftc/reports/preview` returns.
 */
export const DEFAULT_PRICE_REPORT_CATEGORIES = [
  {
    name: "Lowland Vegetables",
    commodities: [
      { no: 1, name: "Ampalaya", uom: "kg", variants: [{ variety: "Galaxy", uom: "kg" }] },
      { no: 2, name: "Batong", uom: "kg", variants: [{ variety: "Negrostar", uom: "kg" }] },
      { no: 3, name: "Kalabasa", uom: "kg", variants: [{ variety: "Suprema", uom: "kg" }] },
      { no: 4, name: "Kamatis", uom: "kg/crate", variants: [{ variety: "Diamante Big", uom: "kg/crate" }] },
      { no: 5, name: "Native Pechay", uom: "kg", variants: [{ variety: "Condor", uom: "kg" }] },
      { no: 6, name: "Okra", uom: "kg", variants: [{ variety: "Smooth Green", uom: "kg" }] },
      { no: 7, name: "Patola", uom: "kg", variants: [{ variety: "Ordinary", uom: "kg" }] },
      { no: 8, name: "Pipino", uom: "kg", variants: [{ variety: "Mega C", uom: "kg" }] },
      { no: 9, name: "Radish", uom: "kg", variants: [{ variety: "Ordinary", uom: "kg" }] },
      { no: 10, name: "Talong", uom: "kg", variants: [{ variety: "Banate King", uom: "kg" }] },
      { no: 11, name: "Upo", uom: "kg", variants: [{ variety: "Mayumi", uom: "kg" }] },
      { no: 12, name: "Alugbati", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 13, name: "Pakchoy/Bokchoy", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
    ],
  },
  {
    name: "Highland Vegetables",
    commodities: [
      { no: 1, name: "Baguio Beans", uom: "kg", variants: [{ variety: "Pencil", uom: "kg" }] },
      {
        no: 2,
        name: "Carrots",
        uom: "kg",
        variants: [
          { variety: "Big", uom: "kg" },
          { variety: "Medium", uom: "kg" },
          { variety: "Small", uom: "kg" },
        ],
      },
      { no: 3, name: "Chinese Pechay", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      {
        no: 4,
        name: "Patatas",
        uom: "kg",
        variants: [
          { variety: "Big", uom: "kg" },
          { variety: "Medium", uom: "kg" },
          { variety: "Small", uom: "kg" },
        ],
      },
      { no: 5, name: "Repolyo", uom: "kg", variants: [{ variety: "Wakamini", uom: "kg" }] },
      {
        no: 6,
        name: "Sayote",
        uom: "pcs/sack",
        variants: [
          { variety: "Big", uom: "pcs/sack" },
          { variety: "Small", uom: "pcs/sack" },
        ],
      },
      { no: 7, name: "Broccoli", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 8, name: "Cauliflower", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      {
        no: 9,
        name: "Lettuce",
        uom: "kg",
        variants: [
          { variety: "Curly", uom: "kg" },
          { variety: "Ball", uom: "kg" },
          { variety: "Romaine", uom: "kg" },
        ],
      },
      { no: 10, name: "Celery", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
    ],
  },
  {
    name: "Spices",
    commodities: [
      { no: 1, name: "Ahos", uom: "kg", variants: [{ variety: "Imported", uom: "kg" }] },
      {
        no: 2,
        name: "Atsal",
        uom: "kg",
        variants: [
          { variety: "Smooth Cayene", uom: "kg" },
          { variety: "Sultan", uom: "kg" },
        ],
      },
      {
        no: 3,
        name: "Bombay",
        uom: "kg",
        variants: [
          { variety: "Native", uom: "kg" },
          { variety: "White", uom: "kg" },
        ],
      },
      {
        no: 4,
        name: "Sili",
        uom: "kg",
        variants: [
          { variety: "Labuyo", uom: "kg" },
          { variety: "Kolikot", uom: "kg" },
          { variety: "Native", uom: "kg" },
          { variety: "Dynamite", uom: "kg" },
        ],
      },
      {
        no: 5,
        name: "Luy-a",
        uom: "kg",
        variants: [
          { variety: "Hawaiian", uom: "kg" },
          { variety: "Jamaica", uom: "kg" },
        ],
      },
      { no: 6, name: "Sibuyas Dahon", uom: "kg/bundle", variants: [{ variety: null, uom: "kg/bundle" }] },
      { no: 7, name: "Tanglad", uom: "kg/bundle", variants: [{ variety: null, uom: "kg/bundle" }] },
    ],
  },
  {
    name: "Rootcrops",
    commodities: [
      { no: 1, name: "Gabi", uom: "kg", variants: [{ variety: "Bisol", uom: "kg" }] },
      { no: 2, name: "Kamote", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 3, name: "Karlang", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 4, name: "Cassava", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
    ],
  },
  {
    name: "Fruits",
    commodities: [
      {
        no: 1,
        name: "Durian",
        uom: "kg",
        variants: [
          { variety: "Puyat", uom: "kg" },
          { variety: "Arancillo", uom: "kg" },
          { variety: "D101", uom: "kg" },
          { variety: "Cob", uom: "kg" },
        ],
      },
      { no: 2, name: "Kalamansi", uom: "kg/net", variants: [{ variety: "Local", uom: "kg/net" }] },
      {
        no: 3,
        name: "Mangga",
        uom: "kg",
        variants: [
          { variety: "Cebu", uom: "kg" },
          { variety: "Carabao", uom: "kg" },
        ],
      },
      {
        no: 4,
        name: "Papaya",
        uom: "kg",
        variants: [
          { variety: "Solo", uom: "kg" },
          { variety: "Red Lady", uom: "kg" },
        ],
      },
      { no: 5, name: "Pomelo", uom: "kg", variants: [{ variety: "Magallanes", uom: "kg" }] },
      {
        no: 6,
        name: "Saging",
        uom: "kg",
        variants: [
          { variety: "Lakatan", uom: "kg" },
          { variety: "Latundan", uom: "kg" },
          { variety: "Cardava", uom: "kg" },
          { variety: "Cavendish", uom: "kg" },
          { variety: "Senorita", uom: "kg" },
          { variety: "Dalian", uom: "kg" },
        ],
      },
      { no: 7, name: "Avocado", uom: "kg", variants: [{ variety: "Medium", uom: "kg" }] },
      {
        no: 8,
        name: "Watermelon",
        uom: "kg",
        variants: [
          { variety: "Ordinary", uom: "kg" },
          { variety: "Seedless", uom: "kg" },
        ],
      },
      { no: 9, name: "Marang", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 10, name: "Poncan", uom: "pcs", variants: [{ variety: null, uom: "pcs" }] },
      { no: 11, name: "Grapes", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 12, name: "Rambutan", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 13, name: "Dragon Fruit", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 14, name: "Jackfruit", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
      { no: 15, name: "Labana", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
    ],
  },
  {
    name: "Others",
    commodities: [
      { no: 1, name: "Sweet Corn", uom: "sack/pcs", variants: [{ variety: null, uom: "sack/pcs" }] },
      { no: 2, name: "Peanut", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
    ],
  },
];

