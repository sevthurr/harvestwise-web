import {
  COMMODITY_CATEGORIES,
  ALL_COMMODITY_ITEMS,
  HW_NAME_TO_ID
} from "../../global/data/commodities";

const UOM_OPTIONS = [
  "kg",
  "kg/crate",
  "crate",
  "crate/kg",
  "pc",
  "pcs",
  "pcs/sack",
  "sack/pcs",
  "kg/bundle",
  "kg/net",
  "tali",
  "pc/box",
  "kg/box",
  "Not stated"
];

const OBS_STATUS_LABELS = {
  zero: "Zero in Source",
  blank: "Blank in Source",
  dash: "Dash in Source",
  missing: "Missing / Not Reported"
};

function getStorageStatusStyle(_status) {
  return "text-[var(--hw-neutral-700)]";
}

function getFormattedDate(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Full combinations for Analytics-Supported (Top-10) Commodities:
// One row per commodity + data_type + market/facility combination
const HW_COMMODITIES_LIST = [
  "Kamatis", "Talong", "Repolyo", "Atsal", "Carrots",
  "Pipino", "Ampalaya", "Kalabasa", "Lettuce", "Chinese Pechay"
];

const HW_COMMODITY_RECORDS = [];
HW_COMMODITIES_LIST.forEach((commodity, idx) => {
  // Retail Prices
  HW_COMMODITY_RECORDS.push({
    commodity,
    dataType: "Daily Retail Prices",
    market: "Bangkerohan Public Market",
    latestDate: getFormattedDate(idx % 2),
    recordCount: 120 + (idx * 3) % 25,
    processingUse: "Price monitoring, forecasting, and analytics"
  });
  // Wholesale Prices
  HW_COMMODITY_RECORDS.push({
    commodity,
    dataType: "Daily Wholesale Prices",
    market: "Bangkerohan Public Market",
    latestDate: getFormattedDate((idx + 1) % 3),
    recordCount: 110 + (idx * 4) % 20,
    processingUse: "Price monitoring, forecasting, and analytics"
  });
  // Landing Prices
  HW_COMMODITY_RECORDS.push({
    commodity,
    dataType: "Daily Landing Prices",
    market: "DFTC Taboan",
    latestDate: getFormattedDate((idx + 2) % 4),
    recordCount: 80 + (idx * 5) % 30,
    processingUse: "Price monitoring, forecasting, and analytics"
  });
  // Arrival Volume
  HW_COMMODITY_RECORDS.push({
    commodity,
    dataType: "DFTC Arrival Volume",
    market: "DFTC Taboan",
    latestDate: getFormattedDate(idx % 3),
    recordCount: 40 + (idx * 2) % 15,
    processingUse: "Arrival Pressure processing and reporting"
  });
});

// Non-Top-10 Commodities (Other Commodities)
const TEMP_COMMODITY_RECORDS = [
  { commodity: "Siling Labuyo", category: "Spices", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(0), records: 18, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Siling Haba", category: "Spices", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(0), records: 16, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Bawang", category: "Spices", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(0), records: 24, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Sibuyas", category: "Spices", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(0), records: 30, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Luya", category: "Spices", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(1), records: 14, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Kamote", category: "Rootcrops", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(1), records: 20, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Gabi", category: "Rootcrops", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(1), records: 12, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Saging Lakatan", category: "Fruits", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(2), records: 18, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Mangga Carabao", category: "Fruits", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(2), records: 22, processingUse: "DFTC monitoring and reporting" },
  { commodity: "Mushroom", category: "Others", dataType: "Daily Wholesale Prices", market: "Bangkerohan Public Market", latestDate: getFormattedDate(3), records: 10, processingUse: "DFTC monitoring and reporting" }
];

function toId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const PRICE_CATEGORIES = COMMODITY_CATEGORIES.map((cat) => ({
  id: toId(cat.category),
  name: cat.category,
  commodities: cat.items.map((item) => {
    const id = HW_NAME_TO_ID[item.name] ?? toId(item.name);
    return {
      id,
      name: item.name,
      isHW: !!item.isHW,
      variants: item.variants.map((v) => ({ id: `${id}-${toId(v.name)}`, name: v.name }))
    };
  })
}));

const HW_ARRIVAL = ALL_COMMODITY_ITEMS.filter((i) => i.isHW).map((item) => {
  const hwId = HW_NAME_TO_ID[item.name] ?? toId(item.name);
  return {
    id: `a-${hwId}`,
    name: item.name,
    isHW: true,
    variants: item.variants.map((v) => ({ id: `a-${hwId}-${toId(v.name)}`, name: v.name }))
  };
});

const NON_HW_ARRIVAL = [
  { id: "a-kangkong", name: "Kangkong / Tinangkong", isHW: false, variants: [{ id: "a-kangkong-stalks", name: "Stalks" }] },
  { id: "a-ahos", name: "Ahos", isHW: false, variants: [{ id: "a-ahos-imported", name: "Imported" }] },
  { id: "a-bombay", name: "Bombay", isHW: false, variants: [{ id: "a-bombay-native", name: "Native" }, { id: "a-bombay-white", name: "White" }] },
  { id: "a-kamote", name: "Kamote", isHW: false, variants: [] },
  { id: "a-saging", name: "Saging", isHW: false, variants: [
    { id: "a-saging-lakatan", name: "Lakatan" },
    { id: "a-saging-latundan", name: "Latundan" },
    { id: "a-saging-cardava", name: "Cardava" }
  ] },
  { id: "a-mangga", name: "Mangga", isHW: false, variants: [{ id: "a-mangga-cebu", name: "Cebu" }, { id: "a-mangga-carabao", name: "Carabao" }] }
];

const ARRIVAL_COMMODITIES = [...HW_ARRIVAL, ...NON_HW_ARRIVAL];
const SAVED_FILES = [];

export {
  ARRIVAL_COMMODITIES,
  HW_COMMODITY_RECORDS,
  OBS_STATUS_LABELS,
  PRICE_CATEGORIES,
  SAVED_FILES,
  TEMP_COMMODITY_RECORDS,
  UOM_OPTIONS,
  getStorageStatusStyle
};
