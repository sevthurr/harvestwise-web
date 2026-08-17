import {
  HW_COMMODITY_NAMES,
  HW_NAME_TO_ID as _HW_NAME_TO_ID,
  HW_ID_TO_NAME as _HW_ID_TO_NAME
} from "../../data/commodities";
const HW_GREEN_SHADES = [
  "#15803D",
  // green-700 — primary
  "#22C55E",
  // green-500 — medium-bright
  "#166534",
  // green-800 — very dark
  "#4ADE80",
  // green-400 — light
  "#16A34A",
  // green-600 — standard
  "#14532D",
  // green-900 — deepest
  "#86EFAC",
  // green-300 — pale
  "#052E16"
  // near-black green
];
const HW_COMMODITIES = HW_COMMODITY_NAMES;
const HW_NAME_TO_ID = _HW_NAME_TO_ID;
const HW_ID_TO_NAME = _HW_ID_TO_NAME;
const COMMODITY_VARIETIES_DATA = {
  // Lowland HW
  "Kamatis": [{ variety: "Diamante Big", basePrice: 92 }],
  "Talong": [{ variety: "Banate King", basePrice: 72 }],
  "Pipino": [{ variety: "Mega C", basePrice: 57 }],
  "Ampalaya": [{ variety: "Galaxy", basePrice: 78 }],
  "Kalabasa": [{ variety: "Suprema", basePrice: 62 }, { variety: "Malagkit", basePrice: 58 }],
  // Highland HW
  "Repolyo": [{ variety: "Wakamini", basePrice: 68 }],
  "Atsal": [{ variety: "Smooth Cayene", basePrice: 128 }, { variety: "Sultan", basePrice: 112 }],
  "Carrots": [{ variety: "Big", basePrice: 98 }, { variety: "Medium", basePrice: 84 }, { variety: "Small", basePrice: 67 }],
  "Lettuce": [{ variety: "Curly", basePrice: 84 }, { variety: "Ball", basePrice: 73 }, { variety: "Romaine", basePrice: 88 }],
  "Chinese Pechay": [{ variety: "", basePrice: 35 }],
  // no canonical sub-varieties
  // Fruits
  "Durian": [{ variety: "Puyat", basePrice: 168 }, { variety: "Arancillo", basePrice: 188 }, { variety: "D101", basePrice: 152 }, { variety: "Cob", basePrice: 178 }]
};
const COMMODITY_BASE_PRICES = {
  "Ampalaya": 75,
  "Batong": 45,
  "Kalabasa": 60,
  "Kamatis": 82,
  "Native Pechay": 30,
  "Okra": 50,
  "Patola": 55,
  "Pipino": 55,
  "Radish": 45,
  "Talong": 70,
  "Upo": 40,
  "Alugbati": 30,
  "Pak choi / Bok choy": 45,
  "Baguio Beans": 80,
  "Carrots": 85,
  "Chinese Pechay": 35,
  "Patatas": 60,
  "Repolyo": 65,
  "Sayote": 55,
  "Broccoli": 95,
  "Cauliflower": 88,
  "Lettuce": 78,
  "Celery": 65,
  "Ahos": 200,
  "Atsal": 118,
  "Bombay": 75,
  "Sili": 85,
  "Luy-a": 95,
  "Sibuyas Dahon": 55,
  "Tanglad": 45,
  "Gabi": 45,
  "Kamote": 40,
  "Karlang": 50,
  "Cassava": 35,
  "Durian": 165,
  "Kalamansi": 65,
  "Mangga": 90,
  "Papaya": 55,
  "Pomelo": 70,
  "Saging": 45,
  "Avocado": 95,
  "Watermelon": 40,
  "Poncan": 75,
  "Grapes": 150,
  "Mixed Vegetables": 50
};
const ALL_DATES = [
  "Jul 3",
  "Jul 4",
  "Jul 5",
  "Jul 6",
  "Jul 7",
  "Jul 8",
  "Jul 9",
  "Jul 10",
  "Jul 11",
  "Jul 12",
  "Jul 13",
  "Jul 14",
  "Jul 15",
  "Jul 16",
  "Jul 17",
  "Jul 18",
  "Jul 19",
  "Jul 20",
  "Jul 21",
  "Jul 22",
  "Jul 23",
  "Jul 24",
  "Jul 25",
  "Jul 26",
  "Jul 27",
  "Jul 28",
  "Jul 29",
  "Jul 30",
  "Jul 31",
  "Aug 1",
  "Aug 2"
];
const FORECAST_DATE_POOL = [
  "Aug 3",
  "Aug 4",
  "Aug 5",
  "Aug 6",
  "Aug 7",
  "Aug 8",
  "Aug 9",
  "Aug 10",
  "Aug 11",
  "Aug 12",
  "Aug 13",
  "Aug 14",
  "Aug 15",
  "Aug 16",
  "Aug 17",
  "Aug 18",
  "Aug 19",
  "Aug 20",
  "Aug 21",
  "Aug 22",
  "Aug 23",
  "Aug 24",
  "Aug 25",
  "Aug 26",
  "Aug 27",
  "Aug 28",
  "Aug 29",
  "Aug 30"
];
const ARRIVAL_ALL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const ARRIVAL_VARIETY_DATA = {
  // ── Lowland HW ──────────────────────────────────────────────────────────────
  // Kamatis: single canonical variety — Diamante Big (volumes combined)
  "Kamatis": [
    { variety: "Diamante Big", records: [
      { month: "Jan", farm: 12800, other: 6900 },
      { month: "Feb", farm: 12e3, other: 6500 },
      { month: "Mar", farm: 13400, other: 7300 },
      { month: "Apr", farm: 14400, other: 7700 },
      { month: "May", farm: 13100, other: 7100 },
      { month: "Jun", farm: 11600, other: 6200 },
      { month: "Jul", farm: 12300, other: 6600 }
    ] }
  ],
  // Talong: single canonical variety — Banate King (volumes combined)
  "Talong": [
    { variety: "Banate King", records: [
      { month: "Jan", farm: 9700, other: 5300 },
      { month: "Feb", farm: 9300, other: 4900 },
      { month: "Mar", farm: 10100, other: 5500 },
      { month: "Apr", farm: 10800, other: 5800 },
      { month: "May", farm: 10200, other: 5400 },
      { month: "Jun", farm: 8900, other: 4900 },
      { month: "Jul", farm: 9400, other: 5e3 }
    ] }
  ],
  // Pipino: single canonical variety — Mega C (volumes combined)
  "Pipino": [
    { variety: "Mega C", records: [
      { month: "Jan", farm: 6600, other: 3550 },
      { month: "Feb", farm: 6200, other: 3300 },
      { month: "Mar", farm: 6800, other: 3650 },
      { month: "Apr", farm: 7300, other: 3850 },
      { month: "May", farm: 6600, other: 3550 },
      { month: "Jun", farm: 5900, other: 3100 },
      { month: "Jul", farm: 6300, other: 3400 }
    ] }
  ],
  // Ampalaya: single canonical variety — Galaxy (volumes combined)
  "Ampalaya": [
    { variety: "Galaxy", records: [
      { month: "Jan", farm: 7100, other: 3800 },
      { month: "Feb", farm: 6700, other: 3600 },
      { month: "Mar", farm: 7400, other: 3950 },
      { month: "Apr", farm: 8e3, other: 4250 },
      { month: "May", farm: 7300, other: 3900 },
      { month: "Jun", farm: 6400, other: 3450 },
      { month: "Jul", farm: 6800, other: 3650 }
    ] }
  ],
  // Kalabasa: two canonical varieties — Suprema + Malagkit
  "Kalabasa": [
    { variety: "Suprema", records: [
      { month: "Jan", farm: 3400, other: 1850 },
      { month: "Feb", farm: 3200, other: 1750 },
      { month: "Mar", farm: 3500, other: 1900 },
      { month: "Apr", farm: 3700, other: 2e3 },
      { month: "May", farm: 3500, other: 1900 },
      { month: "Jun", farm: 3100, other: 1700 },
      { month: "Jul", farm: 3300, other: 1800 }
    ] },
    { variety: "Malagkit", records: [
      { month: "Jan", farm: 2200, other: 1200 },
      { month: "Feb", farm: 2100, other: 1100 },
      { month: "Mar", farm: 2300, other: 1250 },
      { month: "Apr", farm: 2500, other: 1350 },
      { month: "May", farm: 2200, other: 1200 },
      { month: "Jun", farm: 2e3, other: 1050 },
      { month: "Jul", farm: 2100, other: 1150 }
    ] }
  ],
  // ── Highland HW ─────────────────────────────────────────────────────────────
  // Repolyo: single canonical variety — Wakamini (volumes combined)
  "Repolyo": [
    { variety: "Wakamini", records: [
      { month: "Jan", farm: 7700, other: 4200 },
      { month: "Feb", farm: 8100, other: 4300 },
      { month: "Mar", farm: 7400, other: 4e3 },
      { month: "Apr", farm: 6900, other: 3700 },
      { month: "May", farm: 6600, other: 3600 },
      { month: "Jun", farm: 7100, other: 3900 },
      { month: "Jul", farm: 7500, other: 4e3 }
    ] }
  ],
  // Atsal: two canonical varieties — Smooth Cayene + Sultan
  "Atsal": [
    { variety: "Smooth Cayene", records: [
      { month: "Jan", farm: 1600, other: 850 },
      { month: "Feb", farm: 1500, other: 800 },
      { month: "Mar", farm: 1650, other: 900 },
      { month: "Apr", farm: 1700, other: 900 },
      { month: "May", farm: 1550, other: 850 },
      { month: "Jun", farm: 1400, other: 750 },
      { month: "Jul", farm: 1500, other: 800 }
    ] },
    { variety: "Sultan", records: [
      { month: "Jan", farm: 1050, other: 550 },
      { month: "Feb", farm: 1e3, other: 550 },
      { month: "Mar", farm: 1100, other: 600 },
      { month: "Apr", farm: 1150, other: 600 },
      { month: "May", farm: 1e3, other: 550 },
      { month: "Jun", farm: 900, other: 500 },
      { month: "Jul", farm: 1e3, other: 550 }
    ] }
  ],
  // Carrots: three canonical varieties — Big + Medium + Small
  "Carrots": [
    { variety: "Big", records: [
      { month: "Jan", farm: 8100, other: 4400 },
      { month: "Feb", farm: 7700, other: 4100 },
      { month: "Mar", farm: 8600, other: 4600 },
      { month: "Apr", farm: 9400, other: 5100 },
      { month: "May", farm: 8400, other: 4500 },
      { month: "Jun", farm: null, other: null },
      { month: "Jul", farm: 8800, other: 4800 }
    ] },
    { variety: "Medium", records: [
      { month: "Jan", farm: 6e3, other: 3200 },
      { month: "Feb", farm: 5800, other: 3100 },
      { month: "Mar", farm: 6600, other: 3500 },
      { month: "Apr", farm: 7e3, other: 3800 },
      { month: "May", farm: 6200, other: 3400 },
      { month: "Jun", farm: 6400, other: 3400 },
      { month: "Jul", farm: 6600, other: 3600 }
    ] },
    { variety: "Small", records: [
      { month: "Jan", farm: 4400, other: 2400 },
      { month: "Feb", farm: 4200, other: 2300 },
      { month: "Mar", farm: 4700, other: 2500 },
      { month: "Apr", farm: 5100, other: 2700 },
      { month: "May", farm: 4600, other: 2500 },
      { month: "Jun", farm: 4800, other: 2600, storedCombined: 7600 },
      { month: "Jul", farm: 5100, other: 2800 }
    ] }
  ],
  // Lettuce: three canonical varieties — Curly + Ball + Romaine
  "Lettuce": [
    { variety: "Curly", records: [
      { month: "Jan", farm: 2500, other: 1300 },
      { month: "Feb", farm: 2300, other: 1300 },
      { month: "Mar", farm: 2700, other: 1500 },
      { month: "Apr", farm: 2900, other: 1600 },
      { month: "May", farm: 2600, other: 1500 },
      { month: "Jun", farm: 2800, other: 1500 },
      { month: "Jul", farm: 3e3, other: 1600 }
    ] },
    { variety: "Ball", records: [
      { month: "Jan", farm: 1900, other: 1e3 },
      { month: "Feb", farm: 1800, other: 900 },
      { month: "Mar", farm: 2e3, other: 1100 },
      { month: "Apr", farm: 2200, other: 1200 },
      { month: "May", farm: 2100, other: 1100 },
      { month: "Jun", farm: 2100, other: 1200 },
      { month: "Jul", farm: 2300, other: 1200 }
    ] },
    { variety: "Romaine", records: [
      { month: "Jan", farm: 1700, other: 900 },
      { month: "Feb", farm: 1600, other: 850 },
      { month: "Mar", farm: 1800, other: 950 },
      { month: "Apr", farm: 2e3, other: 1050 },
      { month: "May", farm: 1800, other: 950 },
      { month: "Jun", farm: 1900, other: 1e3 },
      { month: "Jul", farm: 2e3, other: 1100 }
    ] }
  ],
  // Chinese Pechay: no canonical sub-varieties — single combined series
  "Chinese Pechay": [
    { variety: "", records: [
      { month: "Jan", farm: 4900, other: 2650 },
      { month: "Feb", farm: 4600, other: 2500 },
      { month: "Mar", farm: 5050, other: 2750 },
      { month: "Apr", farm: 5400, other: 2900 },
      { month: "May", farm: 4900, other: 2650 },
      { month: "Jun", farm: 4450, other: 2450 },
      { month: "Jul", farm: 4750, other: 2600 }
    ] }
  ],
  // ── Fruits ──────────────────────────────────────────────────────────────────
  "Durian": [
    { variety: "Puyat", records: [
      { month: "Jan", farm: 5300, other: 2900 },
      { month: "Feb", farm: 4900, other: 2700 },
      { month: "Mar", farm: 5900, other: 3200 },
      { month: "Apr", farm: 6400, other: 3400 },
      { month: "May", farm: 5600, other: 3100 },
      { month: "Jun", farm: 5800, other: 3100 },
      { month: "Jul", farm: 6100, other: 3300 }
    ] },
    { variety: "Arancillo", records: [
      { month: "Jan", farm: 3900, other: 2200 },
      { month: "Feb", farm: null, other: null },
      { month: "Mar", farm: 4600, other: 2600 },
      { month: "Apr", farm: 4900, other: 2700 },
      { month: "May", farm: 4400, other: 2400 },
      { month: "Jun", farm: 4600, other: 2500 },
      { month: "Jul", farm: 4800, other: 2700 }
    ] },
    { variety: "D101", records: [
      { month: "Jan", farm: 3500, other: 1900 },
      { month: "Feb", farm: 3300, other: 1800 },
      { month: "Mar", farm: 3900, other: 2100 },
      { month: "Apr", farm: 4100, other: 2200 },
      { month: "May", farm: 3700, other: 2e3 },
      { month: "Jun", farm: 3800, other: 2100 },
      { month: "Jul", farm: 4e3, other: 2200 }
    ] },
    { variety: "Cob", records: [
      { month: "Jan", farm: 2700, other: 1500 },
      { month: "Feb", farm: 2500, other: 1400 },
      { month: "Mar", farm: 3100, other: 1700 },
      { month: "Apr", farm: 0, other: 0 },
      { month: "May", farm: 3e3, other: 1600 },
      { month: "Jun", farm: 3e3, other: 1700 },
      { month: "Jul", farm: 3300, other: 1800 }
    ] }
  ]
};
const ARRIVAL_BASE_VOLUMES = {
  "Kamatis": 2e4,
  "Talong": 15e3,
  "Repolyo": 12e3,
  "Ampalaya": 11e3,
  "Pipino": 1e4,
  "Kalabasa": 9e3,
  "Chinese Pechay": 8e3,
  "Okra": 7e3,
  "Native Pechay": 6e3,
  "Alugbati": 5e3,
  "Upo": 8500,
  "Batong": 6500,
  "Patola": 7500,
  "Pak choi / Bok choy": 5500,
  "Baguio Beans": 9500,
  "Patatas": 7e3,
  "Sayote": 8e3,
  "Broccoli": 6e3,
  "Cauliflower": 5500,
  "Celery": 4500,
  "Atsal": 4e3,
  "Ahos": 3e3,
  "Bombay": 5e3,
  "Sili": 3500,
  "Luy-a": 2500,
  "Sibuyas Dahon": 3e3,
  "Tanglad": 2e3,
  "Gabi": 4e3,
  "Kamote": 5500,
  "Karlang": 3500,
  "Cassava": 4500,
  "Mangga": 18e3,
  "Kalamansi": 8e3,
  "Papaya": 14e3,
  "Pomelo": 1e4,
  "Saging": 22e3,
  "Avocado": 6e3,
  "Watermelon": 12e3,
  "Poncan": 7e3,
  "Grapes": 5e3,
  "Mixed Vegetables": 6e3
};
function deterministicRandom(seed) {
  const x = Math.sin(seed + 1) * 1e4;
  return x - Math.floor(x);
}
const varietyPriceCache = {};
function getVarietyPrices(cacheKey, basePrice) {
  if (varietyPriceCache[cacheKey]) return varietyPriceCache[cacheKey];
  const charBase = cacheKey.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const result = {};
  ALL_DATES.forEach((date, i) => {
    const seed = charBase + i * 13;
    if (deterministicRandom(seed + 100) < 0.07) {
      result[date] = null;
      return;
    }
    const variation = (deterministicRandom(seed) - 0.5) * basePrice * 0.15;
    const wave = Math.sin(i * 0.7 + charBase * 0.01) * basePrice * 0.07;
    result[date] = Math.max(1, Math.round((basePrice + variation + wave) * 100) / 100);
  });
  varietyPriceCache[cacheKey] = result;
  return result;
}
const forecastCache = {};
function getVarietyForecast(cacheKey, basePrice, lastActual, horizonDays) {
  const fullKey = `${cacheKey}:${horizonDays}`;
  if (forecastCache[fullKey]) return forecastCache[fullKey];
  const charBase = cacheKey.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const result = FORECAST_DATE_POOL.slice(0, horizonDays).map((date, i) => {
    const seed = charBase + i * 19 + 1e3;
    const trend = (deterministicRandom(seed) - 0.42) * basePrice * 0.012;
    const fc = Math.max(1, lastActual + trend * (i + 1) + Math.sin(i * 0.6) * basePrice * 0.018);
    const band = basePrice * 0.038 + i * basePrice * 4e-3;
    return { date, mid: Math.round(fc * 100) / 100, lo: Math.max(1, Math.round((fc - band) * 100) / 100), hi: Math.round((fc + band) * 100) / 100 };
  });
  forecastCache[fullKey] = result;
  return result;
}
function getCommodityVarietyList(commodity) {
  return COMMODITY_VARIETIES_DATA[commodity] ?? [{ variety: "", basePrice: COMMODITY_BASE_PRICES[commodity] ?? 60 }];
}
function getArrivalSeries(commodity) {
  if (ARRIVAL_VARIETY_DATA[commodity]) return ARRIVAL_VARIETY_DATA[commodity];
  const base = ARRIVAL_BASE_VOLUMES[commodity] ?? 5e3;
  const charBase = commodity.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  return [{
    variety: "",
    records: ARRIVAL_ALL_MONTHS.map((month, i) => {
      const seed = charBase + i * 17;
      if (deterministicRandom(seed + 200) < 0.06) return { month, farm: null, other: null };
      const farmRatio = 0.62 + (deterministicRandom(seed + 300) - 0.5) * 0.1;
      const totalFactor = 0.85 + deterministicRandom(seed) * 0.35;
      const total = Math.round(base * totalFactor);
      const farm = Math.round(total * farmRatio);
      return { month, farm, other: total - farm };
    })
  }];
}
function getRecordVolume(r, sourceType) {
  if (!r) return null;
  if (sourceType === "Farm Source") return r.farm;
  if (sourceType === "Other Source") return r.other;
  if (r.farm != null && r.other != null) return r.farm + r.other;
  return r.farm ?? r.other ?? null;
}
function buildArrivalChartData(commodity, series, months, sourceType) {
  return months.map((month, idx) => {
    const point = { month };
    const dirInfo = {};
    series.forEach(({ variety, records }) => {
      const key = variety || commodity;
      const rec = records.find((r) => r.month === month);
      const val = getRecordVolume(rec, sourceType);
      point[key] = val;
      if (idx > 0) {
        const prevMonth = months[idx - 1];
        const prevRec = records.find((r) => r.month === prevMonth);
        const prevVal = getRecordVolume(prevRec, sourceType);
        dirInfo[key] = { dir: val != null && prevVal != null ? val > prevVal ? 1 : val < prevVal ? -1 : 0 : null };
      } else {
        dirInfo[key] = { dir: null };
      }
    });
    point._dirInfo = dirInfo;
    return point;
  });
}
function getPresetDates(preset) {
  const n = preset === "7d" ? 7 : preset === "14d" ? 14 : preset === "21d" ? 21 : 28;
  return ALL_DATES.slice(-n);
}
function buildCurrentPriceChartData(commodity, dates, priceMultiplier = 1) {
  const varieties = getCommodityVarietyList(commodity);
  return dates.map((date) => {
    const point = { date };
    varieties.forEach(({ variety, basePrice }) => {
      const key = variety || commodity;
      const prices = getVarietyPrices(`${commodity}::${variety}`, basePrice);
      const raw = prices[date] ?? null;
      point[key] = raw != null ? Math.round(raw * priceMultiplier * 100) / 100 : null;
    });
    return point;
  });
}
function buildForecastChartData(commodity, horizonDays, priceMultiplier = 1) {
  const varieties = getCommodityVarietyList(commodity);
  return FORECAST_DATE_POOL.slice(0, horizonDays).map((date, i) => {
    const point = { date };
    varieties.forEach(({ variety, basePrice }) => {
      const cacheKey = `${commodity}::${variety}`;
      const key = variety || commodity;
      const prices = getVarietyPrices(cacheKey, basePrice);
      let lastActual = basePrice;
      for (let j = ALL_DATES.length - 1; j >= 0; j--) {
        if (prices[ALL_DATES[j]] != null) {
          lastActual = prices[ALL_DATES[j]];
          break;
        }
      }
      const fcs = getVarietyForecast(cacheKey, basePrice, lastActual, horizonDays);
      const fc = fcs[i];
      if (fc) {
        point[key] = Math.round(fc.mid * priceMultiplier * 100) / 100;
        point[`${key}__lo`] = Math.round(fc.lo * priceMultiplier * 100) / 100;
        point[`${key}__hi`] = Math.round(fc.hi * priceMultiplier * 100) / 100;
      }
    });
    return point;
  });
}
function formatVol(v) {
  if (v == null) return "\u2014";
  return Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
}
export {
  ALL_DATES,
  ARRIVAL_ALL_MONTHS,
  ARRIVAL_VARIETY_DATA,
  COMMODITY_BASE_PRICES,
  COMMODITY_VARIETIES_DATA,
  FORECAST_DATE_POOL,
  HW_COMMODITIES,
  HW_GREEN_SHADES,
  HW_ID_TO_NAME,
  HW_NAME_TO_ID,
  buildArrivalChartData,
  buildCurrentPriceChartData,
  buildForecastChartData,
  formatVol,
  getArrivalSeries,
  getCommodityVarietyList,
  getPresetDates,
  getRecordVolume,
  getVarietyForecast,
  getVarietyPrices
};
