// NOTE: COMMODITIES is kept here only for pages that have not yet been
// migrated to the live API (Forecast, DftcArrivalDetails, SeasonalProduction,
// DetailCards, etc.). Do not use it for new work — fetch from /prices instead.
const COMMODITIES = [
  { id: "kamatis",  name: "Kamatis",        unit: "kg" },
  { id: "talong",   name: "Talong",          unit: "kg" },
  { id: "repolyo",  name: "Repolyo",         unit: "kg" },
  { id: "atsal",    name: "Atsal",           unit: "kg" },
  { id: "carrots",  name: "Carrots",         unit: "kg" },
  { id: "pipino",   name: "Pipino",          unit: "kg" },
  { id: "ampalaya", name: "Ampalaya",        unit: "kg" },
  { id: "kalabasa", name: "Kalabasa",        unit: "kg" },
  { id: "lettuce",  name: "Lettuce",         unit: "kg" },
  { id: "pechay",   name: "Chinese Pechay",  unit: "kg" },
];

const SORT_OPTIONS = [
  { value: "name",          label: "Commodity name"      },
  { value: "price-rising",  label: "Price rising first"  },
  { value: "price-falling", label: "Price falling first" },
  { value: "supply",        label: "Supply condition"    },
];

const SUPPLY_ORDER = {
  Low:      0,
  Moderate: 1,
  High:     2,
};

const DIRECTION_ORDER = {
  Rising:  0,
  Stable:  1,
  Falling: 2,
};

const MARKET_SOURCES = [
  "All markets",
  "Bangkerohan Public Market",
  "DFTC",
];

const PRICE_TYPES = ["All", "Retail", "Wholesale"];

export {
  COMMODITIES,
  DIRECTION_ORDER,
  MARKET_SOURCES,
  PRICE_TYPES,
  SORT_OPTIONS,
  SUPPLY_ORDER,
};
