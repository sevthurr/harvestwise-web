const COMMODITIES = [
  {
    id: "kamatis",
    name: "Kamatis",
    price: 85,
    unit: "kg",
    direction: "Rising",
    supply: "Moderate",
    summary: "Bangkerohan prices have improved slightly while market supply remains manageable.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Market condition is generally favorable"
  },
  {
    id: "talong",
    name: "Talong",
    price: 60,
    unit: "kg",
    direction: "Stable",
    supply: "Moderate",
    summary: "Bangkerohan prices and market supply remain steady this week.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Market conditions are steady"
  },
  {
    id: "repolyo",
    name: "Repolyo",
    price: 45,
    unit: "kg",
    direction: "Falling",
    supply: "High",
    summary: "High supply is putting downward pressure on Bangkerohan retail prices.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "DFTC",
    priceType: "Wholesale",
    detailStatus: "Market supply is elevated, prices are under pressure"
  },
  {
    id: "atsal",
    name: "Atsal",
    price: 120,
    unit: "kg",
    direction: "Rising",
    supply: "Low",
    summary: "Limited supply from key growing areas is supporting higher retail prices.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Prices are elevated due to low supply"
  },
  {
    id: "carrots",
    name: "Carrots",
    price: 90,
    unit: "kg",
    direction: "Stable",
    supply: "Moderate",
    summary: "Bangkerohan prices have remained consistent with moderate market supply.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Prices and supply are steady"
  },
  {
    id: "pipino",
    name: "Pipino",
    price: 40,
    unit: "kg",
    direction: "Stable",
    supply: "Moderate",
    summary: "Market supply and Bangkerohan prices are balanced this week.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Stable supply and steady prices"
  },
  {
    id: "ampalaya",
    name: "Ampalaya",
    price: 75,
    unit: "kg",
    direction: "Rising",
    supply: "Low",
    summary: "Tight supply is supporting higher Bangkerohan retail prices this week.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Prices are rising with tight supply"
  },
  {
    id: "kalabasa",
    name: "Kalabasa",
    price: 35,
    unit: "kg",
    direction: "Stable",
    supply: "High",
    summary: "Abundant supply is keeping Bangkerohan prices low and stable.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "Bangkerohan Public Market",
    priceType: "Retail",
    detailStatus: "Abundant supply, prices are stable and low"
  },
  {
    id: "lettuce",
    name: "Lettuce",
    price: 80,
    unit: "kg",
    direction: "Falling",
    supply: "High",
    summary: "Oversupply from multiple farms is reducing Bangkerohan retail prices.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "DFTC",
    priceType: "Wholesale",
    detailStatus: "Oversupply is pushing prices down"
  },
  {
    id: "pechay",
    name: "Chinese Pechay",
    price: 35,
    unit: "kg",
    direction: "Falling",
    supply: "High",
    summary: "High production across multiple farms is reducing Bangkerohan prices.",
    lastUpdated: "Jun 24, 2026, 7:30 AM",
    market: "DFTC",
    priceType: "Wholesale",
    detailStatus: "High supply is keeping prices low"
  }
];
const MARKET_SOURCES = [
  "All markets",
  "Bangkerohan Public Market",
  "DFTC"
];
const PRICE_TYPES = ["All", "Retail", "Wholesale"];
const SORT_OPTIONS = [
  { value: "name", label: "Commodity name" },
  { value: "price-rising", label: "Price rising first" },
  { value: "price-falling", label: "Price falling first" },
  { value: "supply", label: "Supply condition" }
];
const SUPPLY_ORDER = {
  Low: 0,
  Moderate: 1,
  High: 2
};
const DIRECTION_ORDER = {
  Rising: 0,
  Stable: 1,
  Falling: 2
};
export {
  COMMODITIES,
  DIRECTION_ORDER,
  MARKET_SOURCES,
  PRICE_TYPES,
  SORT_OPTIONS,
  SUPPLY_ORDER
};
