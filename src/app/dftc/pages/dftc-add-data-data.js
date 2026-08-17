import {
  COMMODITY_CATEGORIES,
  ALL_COMMODITY_ITEMS,
  HW_NAME_TO_ID
} from "../../global/data/commodities";
const TODAY_ADD = "2026-08-02";
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
const SAVED_FILES = [
  {
    id: "sf-001",
    fileId: "DFTC-PR-20260802-001",
    dataName: "Bangkerohan Retail Prices \u2014 Aug 2, 2026",
    dataType: "Daily Retail Prices",
    market: "Bangkerohan Public Market",
    entryMethod: "Manual Input",
    savedDate: "Aug 2, 2026, 10:15 AM",
    savedIso: "2026-08-02",
    records: 94,
    storageStatus: "Available",
    isNew: true,
    priceType: "Retail",
    encodedAccount: "DFTC-BANGKEROHAN",
    encodedUserId: "USR-HERMOSO-001"
  },
  {
    id: "sf-002",
    fileId: "DFTC-WS-20260802-001",
    dataName: "DFTC Wholesale Prices \u2014 Aug 2, 2026",
    dataType: "Daily Wholesale Prices",
    market: "Bangkerohan Public Market",
    entryMethod: "File Upload",
    savedDate: "Aug 2, 2026, 9:44 AM",
    savedIso: "2026-08-02",
    records: 120,
    storageStatus: "Available",
    priceType: "Wholesale",
    encodedAccount: "DFTC-BANGKEROHAN",
    encodedUserId: "USR-BOLODO-002"
  },
  {
    id: "sf-003",
    fileId: "DFTC-AV-20260801-001",
    dataName: "DFTC Arrival Volume \u2014 Aug 1, 2026",
    dataType: "DFTC Arrival Volume",
    market: "DFTC Taboan",
    entryMethod: "Manual Input",
    savedDate: "Aug 1, 2026, 8:56 AM",
    savedIso: "2026-08-01",
    records: 22,
    storageStatus: "Available",
    encodedAccount: "DFTC-TABOAN",
    encodedUserId: "USR-HERMOSO-001"
  },
  {
    id: "sf-004",
    fileId: "DFTC-LP-20260730-001",
    dataName: "Bangkerohan Landing Prices \u2014 Jul 30, 2026",
    dataType: "Daily Landing Prices",
    market: "DFTC Taboan",
    entryMethod: "File Upload",
    savedDate: "Jul 30, 2026, 8:17 AM",
    savedIso: "2026-07-30",
    records: 50,
    storageStatus: "Available",
    priceType: "Landing",
    encodedAccount: "DFTC-TABOAN",
    encodedUserId: "USR-BOLODO-002"
  },
  {
    id: "sf-005",
    fileId: "DFTC-PR-20260728-001",
    dataName: "Bangkerohan Retail Prices \u2014 Jul 28, 2026",
    dataType: "Daily Retail Prices",
    market: "Bangkerohan Public Market",
    entryMethod: "File Upload",
    savedDate: "Jul 28, 2026, 8:48 AM",
    savedIso: "2026-07-28",
    records: 118,
    storageStatus: "Available",
    priceType: "Retail",
    encodedAccount: "DFTC-BANGKEROHAN",
    encodedUserId: "USR-HERMOSO-001"
  },
  {
    id: "sf-006",
    fileId: "DFTC-AV-20260727-001",
    dataName: "DFTC Arrival Volume \u2014 Jul 27, 2026",
    dataType: "DFTC Arrival Volume",
    market: "DFTC Taboan",
    entryMethod: "Manual Input",
    savedDate: "Jul 27, 2026, 7:30 AM",
    savedIso: "2026-07-27",
    records: 20,
    storageStatus: "Available",
    encodedAccount: "DFTC-TABOAN",
    encodedUserId: "USR-BOLODO-002"
  },
  {
    id: "sf-007",
    fileId: "DFTC-WS-20260719-001",
    dataName: "Bangkerohan Wholesale Prices \u2014 Jul 19, 2026",
    dataType: "Daily Wholesale Prices",
    market: "Bangkerohan Public Market",
    entryMethod: "Manual Input",
    savedDate: "Jul 19, 2026, 9:00 AM",
    savedIso: "2026-07-19",
    records: 88,
    storageStatus: "Available",
    priceType: "Wholesale",
    encodedAccount: "DFTC-BANGKEROHAN",
    encodedUserId: "USR-HERMOSO-001"
  }
];
const HW_COMMODITY_RECORDS = [
  { commodity: "Kamatis", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 142, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Talong", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 138, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Repolyo", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 130, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Atsal", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 1, 2026", recordCount: 128, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Carrots", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 1, 2026", recordCount: 124, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Pipino", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 120, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Ampalaya", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 118, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Kalabasa", dataType: "DFTC Arrival Volume", market: "DFTC Taboan", latestDate: "Aug 1, 2026", recordCount: 44, processingUse: "Arrival Pressure processing and reporting" },
  { commodity: "Lettuce", dataType: "Daily Wholesale Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 112, processingUse: "Price monitoring, forecasting, and analytics" },
  { commodity: "Chinese Pechay", dataType: "Daily Retail Prices", market: "Bangkerohan Public Market", latestDate: "Aug 2, 2026", recordCount: 108, processingUse: "Price monitoring, forecasting, and analytics" }
];
const TEMP_COMMODITY_RECORDS = [
  { commodity: "Siling Labuyo", category: "Spices", dataType: "Daily Retail Prices", latestDate: "Aug 2, 2026", records: 18 },
  { commodity: "Siling Haba", category: "Spices", dataType: "Daily Retail Prices", latestDate: "Aug 2, 2026", records: 16 },
  { commodity: "Bawang", category: "Spices", dataType: "Daily Retail Prices", latestDate: "Aug 2, 2026", records: 24 },
  { commodity: "Sibuyas", category: "Spices", dataType: "Daily Retail Prices", latestDate: "Aug 2, 2026", records: 30 },
  { commodity: "Luya", category: "Spices", dataType: "Daily Retail Prices", latestDate: "Aug 1, 2026", records: 14 },
  { commodity: "Kamote", category: "Rootcrops", dataType: "Daily Retail Prices", latestDate: "Aug 1, 2026", records: 20 },
  { commodity: "Gabi", category: "Rootcrops", dataType: "Daily Retail Prices", latestDate: "Aug 1, 2026", records: 12 },
  { commodity: "Saging Lakatan", category: "Fruits", dataType: "Daily Retail Prices", latestDate: "Jul 31, 2026", records: 18 },
  { commodity: "Mangga Carabao", category: "Fruits", dataType: "Daily Retail Prices", latestDate: "Jul 30, 2026", records: 22 },
  { commodity: "Mushroom", category: "Others", dataType: "Daily Wholesale Prices", latestDate: "Jul 28, 2026", records: 10 }
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
export {
  ARRIVAL_COMMODITIES,
  HW_COMMODITY_RECORDS,
  OBS_STATUS_LABELS,
  PRICE_CATEGORIES,
  SAVED_FILES,
  TEMP_COMMODITY_RECORDS,
  TODAY_ADD,
  UOM_OPTIONS,
  getStorageStatusStyle
};
