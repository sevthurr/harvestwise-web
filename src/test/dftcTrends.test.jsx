/**
 * DFTC Trends Price Trends — prices API wiring (no XGBoost in React).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DFTCTrends from "../app/dftc/pages/DFTCTrends";
import * as pricesApi from "../services/api/pricesApi";
import * as analyticsApi from "../services/api/analyticsApi";
import * as dftcApi from "../services/api/dftcApi";
import {
  buildForecastChartData,
  buildForecastSummaries,
  buildHistoricalChartData,
  filterRecordsByPeriod,
  findCommodityId,
  isApiBackedPriceSeries,
  toPriceTypeKey,
} from "../app/dftc/pages/dftcTrendsPriceData";

function renderTrends(ui) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

vi.mock("recharts", () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: ({ children }) => <div data-testid="dftc-chart">{children}</div>,
    LineChart: Passthrough,
    ComposedChart: Passthrough,
    BarChart: Passthrough,
    PieChart: Passthrough,
    Pie: Passthrough,
    Cell: () => null,
    Line: () => null,
    Bar: ({ children }) => <div>{children}</div>,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Brush: () => null,
    ReferenceLine: () => null,
    ReferenceArea: () => null,
    Legend: () => null,
  };
});

vi.mock("../app/global/components/shared/ArrivalVolumeTrendChart", () => ({
  ArrivalVolumeTrendChart: ({ chartData }) => (
    <div data-testid="arrival-chart-dates">
      {chartData.map((point) => point.month).join("|")}
    </div>
  ),
}));

function dailyPoints(horizon, origin = "2026-07-31") {
  const [y, m, d] = origin.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  return Array.from({ length: horizon }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index + 1);
    const iso = day.toISOString().slice(0, 10);
    const mid = 80 + (index + 1) / 10;
    return {
      forecast_date: iso,
      horizon_days: index + 1,
      forecast_midpoint: mid,
      lower_forecast: mid - 10,
      upper_forecast: mid + 10,
    };
  });
}

function detailBody({
  commodityId = "COM-KAM-DIAM",
  name = "Kamatis",
  variety = "Diamante Big",
  priceType = "dftc_retail",
  horizon = 14,
  records = undefined,
  points = undefined,
  forecast = undefined,
} = {}) {
  const resolvedPoints = points === undefined ? dailyPoints(horizon) : points;
  const endpoint = resolvedPoints[resolvedPoints.length - 1];
  const resolvedForecast =
    forecast === undefined
      ? endpoint
        ? {
            forecast_id: "FCS-1",
            forecast_date: endpoint.forecast_date,
            horizon_days: horizon,
            lower_forecast: endpoint.lower_forecast,
            upper_forecast: endpoint.upper_forecast,
            forecast_midpoint: endpoint.forecast_midpoint,
            trend: "Rising",
            advisory_text: "ok",
            price_type: priceType,
            generated_at: "2026-07-31T12:00:00Z",
            points: resolvedPoints,
          }
        : null
      : forecast;

  return {
    commodity_id: commodityId,
    name,
    category: "Lowland Vegetables",
    variety,
    unit_of_measure: "kg",
    selected_price_type: priceType,
    current_price: 70,
    forecast: resolvedForecast,
    recent_records:
      records === undefined
        ? [
            {
              record_id: "PRC-2",
              price_date: "2026-07-31",
              prevail_price: 72,
              price_min: null,
              price_max: null,
              change_pct: 2.8,
              data_source: priceType.includes("dftc") ? "dftc_daily_retail" : "bankerohan_daily_retail",
              price_type: priceType.includes("wholesale") ? "wholesale" : "retail",
            },
            {
              record_id: "PRC-1",
              price_date: "2026-07-30",
              prevail_price: 70,
              price_min: null,
              price_max: null,
              change_pct: null,
              data_source: priceType.includes("dftc") ? "dftc_daily_retail" : "bankerohan_daily_retail",
              price_type: priceType.includes("wholesale") ? "wholesale" : "retail",
            },
          ]
        : records,
  };
}

const CATALOG = {
  items: [
    {
      commodity_id: "COM-KAM-DIAM",
      name: "Kamatis",
      variety: "Diamante Big",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {},
      forecast: null,
    },
    {
      commodity_id: "COM-AMP-GALAXY",
      name: "Ampalaya",
      variety: "Galaxy",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {},
      forecast: null,
    },
    {
      commodity_id: "COM-CAR",
      name: "Carrots",
      variety: null,
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {},
      forecast: null,
    },
  ],
  total: 1,
  page: 1,
  page_size: 100,
};

// The widened catalogue (include_supported_varieties=true) also returns the
// variety rows of a top-10 commodity whose own is_top10 flag is false.
const SUPPORTED_CATALOG = {
  items: [
    {
      commodity_id: "COM-KAM-DIAM",
      name: "Kamatis",
      variety: "Diamante Big",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {},
      forecast: null,
    },
    {
      commodity_id: "COM-AMP-GALAXY",
      name: "Ampalaya",
      variety: "Galaxy",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {
        bangkerohan_retail: 45,
        bangkerohan_wholesale: 40,
        dftc_retail: 50,
        dftc_wholesale: 46,
      },
      forecast: null,
    },
    {
      commodity_id: "COM-AMP-MILKYWAVE",
      name: "Ampalaya",
      variety: "Milky Wave",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: false,
      updated_at: "2026-07-31",
      prices: {
        bangkerohan_retail: null,
        bangkerohan_wholesale: null,
        dftc_retail: null,
        dftc_wholesale: null,
      },
      forecast: null,
    },
    {
      commodity_id: "COM-CAR",
      name: "Carrots",
      variety: null,
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      updated_at: "2026-07-31",
      prices: {},
      forecast: null,
    },
  ],
  total: 4,
  page: 1,
  page_size: 100,
};

// Every active commodity, top-10 or not — the arrival tab's scope.
const COMMODITY_CATALOG = {
  items: [
    { id: "COM-KAM-DIAM", name: "Kamatis", variety: "Diamante Big", category: "Lowland Vegetables", unit_of_measure: "kg", is_top10: true },
    { id: "COM-AMP-GALAXY", name: "Ampalaya", variety: "Galaxy", category: "Lowland Vegetables", unit_of_measure: "kg", is_top10: true },
    { id: "COM-AMP-MILKYWAVE", name: "Ampalaya", variety: "Milky Wave", category: "Lowland Vegetables", unit_of_measure: "kg", is_top10: false },
    { id: "COM-SAL", name: "Saluyot", variety: null, category: "Lowland Vegetables", unit_of_measure: "kg", is_top10: false },
    { id: "COM-CAR", name: "Carrots", variety: null, category: "Highland Vegetables", unit_of_measure: "kg", is_top10: true },
    { id: "COM-AVO", name: "Avocado", variety: "Medium", category: "Fruits", unit_of_measure: "kg", is_top10: false },
  ],
  total: 6,
};

describe("dftcTrendsPriceData helpers", () => {
  it("maps DFTC and Bangkerohan markets to price_type keys", () => {
    expect(toPriceTypeKey("DFTC", "Retail")).toBe("dftc_retail");
    expect(toPriceTypeKey("DFTC", "Wholesale")).toBe("dftc_wholesale");
    expect(toPriceTypeKey("Bankerohan", "Retail")).toBe("bangkerohan_retail");
    expect(isApiBackedPriceSeries("Carbon Public Market", "Retail")).toBe(false);
    expect(isApiBackedPriceSeries("DFTC", "Landing")).toBe(false);
  });

  it("resolves commodity_id with Pechay/Petchay and variety identity", () => {
    const pairs = [
      { commodity: "Chinese Petchay", variety: null, commodity_id: "COM-PECH" },
      { commodity: "Kamatis", variety: "Diamante Big", commodity_id: "COM-KAM" },
      { commodity: "Atsal", variety: "Sultan", commodity_id: "COM-ATS-S" },
    ];
    expect(findCommodityId(pairs, "Chinese Pechay", "")).toBe("COM-PECH");
    expect(findCommodityId(pairs, "Kamatis", "Diamante Big")).toBe("COM-KAM");
    expect(findCommodityId(pairs, "Atsal", "Smooth Cayene")).toBeNull();
  });

  it("keeps period filtering on historical records only", () => {
    const records = [
      { price_date: "2026-07-31", prevail_price: 72 },
      { price_date: "2026-07-30", prevail_price: 71 },
      { price_date: "2026-07-20", prevail_price: 68 },
    ];
    const filtered = filterRecordsByPeriod(records, "7d");
    expect(filtered.map((row) => row.price_date)).toEqual(["2026-07-31", "2026-07-30"]);
  });

  it.each([7, 14, 21, 28])("horizon=%s returns that many consecutive daily forecast points", (horizon) => {
    const chart = buildForecastChartData([
      {
        varietyKey: "Diamante Big",
        detail: detailBody({ horizon }),
      },
    ]);
    expect(chart).toHaveLength(horizon);
    expect(chart[0].date).toBe("2026-08-01");
    expect(chart[horizon - 1].date).toBe(
      new Date(Date.UTC(2026, 6, 31 + horizon)).toISOString().slice(0, 10)
    );
    for (let i = 1; i < chart.length; i += 1) {
      const prev = new Date(`${chart[i - 1].date}T00:00:00Z`);
      const cur = new Date(`${chart[i].date}T00:00:00Z`);
      expect((cur - prev) / 86400000).toBe(1);
    }
  });

  it("maps forecast_date to x-axis and forecast_midpoint to the forecast line", () => {
    const chart = buildForecastChartData([
      {
        varietyKey: "Diamante Big",
        detail: detailBody({ horizon: 7 }),
      },
    ]);
    expect(chart[0].date).toBe("2026-08-01");
    expect(chart[0]["Diamante Big"]).toBeCloseTo(80.1, 5);
    expect(chart[0]["Diamante Big__lo"]).toBeCloseTo(70.1, 5);
    expect(chart[0]["Diamante Big__hi"]).toBeCloseTo(90.1, 5);
  });

  it("uses the +N endpoint forecast for summary cards, not +1 or an average", () => {
    const summaries = buildForecastSummaries([
      {
        varietyKey: "Diamante Big",
        detail: detailBody({ horizon: 14 }),
      },
    ]);
    expect(summaries[0].avgMid).toBeCloseTo(81.4, 5);
    expect(summaries[0].lo).toBeCloseTo(71.4, 5);
    expect(summaries[0].hi).toBeCloseTo(91.4, 5);
    expect(summaries[0].change).toBeCloseTo(14.647887, 3);
    expect(summaries[0].recentAvg).toBeCloseTo(71, 5);
  });

  it("returns null change when forecast or recent records are missing", () => {
    const withoutForecast = buildForecastSummaries([
      {
        varietyKey: "Diamante Big",
        detail: detailBody({ forecast: null }),
      },
    ]);
    expect(withoutForecast[0].change).toBeNull();

    const withoutRecords = buildForecastSummaries([
      {
        varietyKey: "Diamante Big",
        detail: detailBody({ records: [] }),
      },
    ]);
    expect(withoutRecords[0].change).toBeNull();
  });

  it("keeps historical chart data when forecast is missing", () => {
    const historical = buildHistoricalChartData(
      [
        {
          varietyKey: "Diamante Big",
          detail: detailBody({ horizon: 7, forecast: null, points: [] }),
        },
      ],
      "7d"
    );
    expect(historical.some((row) => row["Diamante Big"] === 72)).toBe(true);
    expect(
      buildForecastChartData([
        { varietyKey: "Diamante Big", detail: detailBody({ forecast: null, points: [] }) },
      ])
    ).toEqual([]);
  });

  it.each(["7d", "14d", "21d", "28d"])(
    "matches the number of historical days depending on filter %s before forecast starts",
    (preset) => {
      const dayCount = parseInt(preset, 10);
      const records = Array.from({ length: 40 }, (_, i) => ({
        price_date: new Date(Date.UTC(2026, 6, 31 - i)).toISOString().slice(0, 10),
        prevail_price: 70 + (i % 5),
      }));
      const historical = buildHistoricalChartData(
        [
          {
            varietyKey: "Diamante Big",
            detail: detailBody({ horizon: 7, records }),
          },
        ],
        preset
      );
      expect(historical).toHaveLength(dayCount + 1);
    }
  );
});

describe("DFTC Trends page prices API integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // Tab clicks write ?tab=... to the URL; reset so the next test mounts on Price.
    window.history.replaceState({}, "", "/dftc/trends");
  });

  function installApi() {
    const detailCalls = [];
    vi.spyOn(pricesApi, "getPriceList").mockImplementation(async (params = {}) =>
      params.include_supported_varieties ? SUPPORTED_CATALOG : CATALOG
    );
    vi.spyOn(dftcApi, "getCommodityCatalog").mockResolvedValue(COMMODITY_CATALOG);
    vi.spyOn(pricesApi, "getPriceDetail").mockImplementation(async (commodityId, params = {}) => {
      detailCalls.push({ commodityId, ...params });
      return detailBody({
        commodityId,
        priceType: params.price_type || "bangkerohan_retail",
        horizon: Number(params.horizon || 7),
      });
    });
    vi.spyOn(analyticsApi, "getArrivalPressure").mockResolvedValue({
      status: "processed",
      classification: "High",
      commodity_id: "COM-CAR",
      commodity_name: "Carrots",
      current_arrival_kg: 2400,
      average_arrival_kg: 1200,
      source_breakdown: {
        farm_source_volume_kg: 9000,
        other_source_volume_kg: 6000,
      },
      records: [
        {
          arrival_date: "2025-03-31",
          volume_kg: 600,
          farm_source_volume_kg: 250,
          other_source_volume_kg: 350,
          commodity_name: "Carrots",
        },
        {
          arrival_date: "2025-09-30",
          volume_kg: 800,
          farm_source_volume_kg: 400,
          other_source_volume_kg: 400,
          commodity_name: "Carrots",
        },
        {
          arrival_date: "2026-10-02",
          volume_kg: 2400,
          farm_source_volume_kg: 1000,
          other_source_volume_kg: 1400,
          commodity_name: "Carrots",
        },
      ],
    });
    vi.spyOn(analyticsApi, "getHistoricalSeasonalProduction").mockImplementation(async (commodityId) => ({
      status: "processed",
      source: "PSA OpenSTAT",
      commodity_id: commodityId,
      commodity_name: "Kamatis",
      years_covered: "2020–2025",
      grand_average_quarterly_mt: 100,
      source_areas: [
        { name: "Bukidnon", total_production_mt: 45 },
        { name: "City of Davao", total_production_mt: 30 },
        { name: "Davao del Sur", total_production_mt: 50 },
      ],
      quarterly_profiles: [
        { quarter: "Q1", average_production_mt: 80, classification: "Low", years_available: 6 },
        { quarter: "Q2", average_production_mt: 90, classification: "Moderate", years_available: 6 },
        { quarter: "Q3", average_production_mt: 110, classification: "Moderate", years_available: 6 },
        { quarter: "Q4", average_production_mt: 120, classification: "High", years_available: 6 },
      ],
      records: [
        { reference_year: 2025, reference_quarter: "Q4", volume_produced: 125 },
      ],
      geo_records: [
        { reference_year: 2025, reference_quarter: "Q4", location: "Bukidnon", volume_produced: 45 },
        { reference_year: 2025, reference_quarter: "Q4", location: "City of Davao", volume_produced: 30 },
        { reference_year: 2025, reference_quarter: "Q4", location: "Davao del Sur", volume_produced: 50 },
      ],
    }));
    return detailCalls;
  }

  async function openCommodityCombobox(toggleText) {
    const toggle = screen
      .getAllByRole("button")
      .find((b) => (b.textContent || "").includes(toggleText));
    fireEvent.click(toggle);
    const input = await screen.findByPlaceholderText("Search commodities...");
    return { input, dropdown: () => input.closest("div.border") };
  }

  it("does not offer Landing as a Price Type", async () => {
    installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => expect(screen.getByText("Forecast Midpoint")).toBeInTheDocument());
    const priceTypeSelect = screen.getByDisplayValue("Retail");
    expect(Array.from(priceTypeSelect.options).map((o) => o.textContent)).toEqual([
      "Retail",
      "Wholesale",
    ]);
  });

  it("offers only catalog-backed commodities on the Price tab, full list on Arrival", async () => {
    installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => expect(screen.getByText("Forecast Midpoint")).toBeInTheDocument());

    const priceFilter = await openCommodityCombobox("Kamatis");
    fireEvent.change(priceFilter.input, { target: { value: "Avocado" } });
    expect(await screen.findByText("No commodities found")).toBeInTheDocument();
    fireEvent.change(priceFilter.input, { target: { value: "Kamatis" } });
    expect(
      within(priceFilter.dropdown()).getByRole("button", { name: /Kamatis/ })
    ).toBeInTheDocument();
    // Close before switching tabs: the combobox is reconciled across tabs,
    // so an open dropdown would carry its state into the arrival filter.
    fireEvent.keyDown(priceFilter.input, { key: "Escape" });

    fireEvent.click(screen.getByRole("button", { name: /Arrival Volume Trends/ }));
    const arrivalFilter = await openCommodityCombobox("Carrots");
    fireEvent.change(arrivalFilter.input, { target: { value: "Avocado" } });
    expect(
      within(arrivalFilter.dropdown()).getByRole("button", { name: /Avocado/ })
    ).toBeInTheDocument();
  });

  it("keeps the full commodity list while the price catalog is still loading", async () => {
    installApi();
    vi.spyOn(pricesApi, "getPriceList").mockReturnValue(new Promise(() => {}));
    renderTrends(<DFTCTrends />);

    const priceFilter = await openCommodityCombobox("Kamatis");
    fireEvent.change(priceFilter.input, { target: { value: "Avocado" } });
    expect(
      within(priceFilter.dropdown()).getByRole("button", { name: /Avocado/ })
    ).toBeInTheDocument();
  });

  it("renders the honest no-data state for a commodity outside the catalog", async () => {
    const detailCalls = installApi();
    window.history.replaceState({}, "", "/dftc/trends?tab=price&commodity=Avocado");
    renderTrends(<DFTCTrends />);

    expect(await screen.findByText("No price trend data available")).toBeInTheDocument();
    expect(
      screen.getByText(/No price records found for Avocado/)
    ).toBeInTheDocument();
    // No catalog commodity_id means no trend query is fired at all.
    expect(detailCalls).toHaveLength(0);
  });

  it("loads Bangkerohan/DFTC historical + forecast for the catalog commodity_id", async () => {
    const detailCalls = installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(detailCalls.some((call) => call.commodityId === "COM-KAM-DIAM")).toBe(true);
    });
    expect(detailCalls[0].price_type).toBe("bangkerohan_retail");
    expect(detailCalls[0].horizon).toBe(7);
    expect(detailCalls[0].records_limit).toBe(100);
    await waitFor(() => {
      expect(screen.getByText("Forecast Midpoint")).toBeInTheDocument();
      expect(screen.getByText("Lower Forecast")).toBeInTheDocument();
      expect(screen.getByText("Upper Forecast")).toBeInTheDocument();
    });
  });

  it("renders Variety selector and defaults to data-driven variety without fake no-variety", async () => {
    installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Diamante Big")).toBeInTheDocument();
    });
    // Confirm no generic "No variety" option when commodity only has Diamante Big
    const varietySelect = screen.getByDisplayValue("Diamante Big");
    expect(varietySelect).toBeInTheDocument();
    expect(screen.queryByText("Walay barayti")).not.toBeInTheDocument();
  });

  it("offers a non-top-10 variety of a top-10 commodity and loads its own price detail", async () => {
    const detailCalls = installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => expect(screen.getByText("Forecast Midpoint")).toBeInTheDocument());

    const priceFilter = await openCommodityCombobox("Kamatis");
    fireEvent.change(priceFilter.input, { target: { value: "Ampalaya" } });
    fireEvent.click(
      within(priceFilter.dropdown()).getByRole("button", { name: /Ampalaya/ })
    );

    // "Milky Wave" is not a top-10 row of its own, but it belongs to the
    // top-10 commodity Ampalaya, so it must be listed and selectable.
    const varietySelect = await screen.findByDisplayValue("Galaxy");
    expect(Array.from(varietySelect.options).map((o) => o.textContent)).toEqual([
      "Galaxy",
      "Milky Wave",
    ]);

    fireEvent.change(varietySelect, { target: { value: "Milky Wave" } });
    await waitFor(() => {
      expect(detailCalls.some((call) => call.commodityId === "COM-AMP-MILKYWAVE")).toBe(
        true
      );
    });
  });

  it("loads DFTC Retail and Wholesale with isolated price_type keys", async () => {
    const detailCalls = installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(detailCalls.some((call) => call.price_type === "bangkerohan_retail")).toBe(true);
    });
    fireEvent.change(screen.getByDisplayValue("Bankerohan Public Market"), {
      target: { value: "DFTC Taboan" },
    });
    await waitFor(() => {
      expect(detailCalls.some((call) => call.price_type === "dftc_retail")).toBe(true);
    });
    fireEvent.change(screen.getByDisplayValue("Retail"), {
      target: { value: "Wholesale" },
    });
    await waitFor(() => {
      expect(detailCalls.some((call) => call.price_type === "dftc_wholesale")).toBe(true);
    });
  });

  it("requests horizon 14/21/28 from the Forecast Horizon control", async () => {
    const detailCalls = installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => expect(detailCalls.length).toBeGreaterThan(0));

    const openHorizon = async (label) => {
      const horizonBtn = await screen.findByRole("button", { name: /Next \d+ days/ });
      fireEvent.click(horizonBtn);
      const options = await screen.findAllByText(label);
      fireEvent.click(options[options.length - 1]);
    };

    await openHorizon("Next 21 days");
    await waitFor(() => {
      expect(detailCalls.some((call) => call.horizon === 21)).toBe(true);
    });
    await openHorizon("Next 28 days");
    await waitFor(() => {
      expect(detailCalls.some((call) => call.horizon === 28)).toBe(true);
    });
    await openHorizon("Next 7 days");
    await waitFor(() => {
      expect(detailCalls.some((call) => call.horizon === 7)).toBe(true);
    });
  });

  it("calculates Forecast Price Change using the formula and does not expose Price Outlook", async () => {
    installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(screen.getByText("Forecast Price Change")).toBeInTheDocument();
    });
    expect(screen.queryByText("Price Outlook")).not.toBeInTheDocument();
    const changeTitle = screen.getByText("Forecast Price Change");
    // With horizon 7: midpoint 80.7, recentAvg 71 => change is +13.7%
    expect(changeTitle.parentElement?.textContent || "").toMatch(/Forecast Price Change[\s\S]*↑\s*13\.7%/);
  });

  it("shows em dash for Forecast Price Change when forecast data is unavailable", async () => {
    installApi();
    vi.spyOn(pricesApi, "getPriceDetail").mockImplementation(async (commodityId, params = {}) => {
      return detailBody({
        commodityId,
        forecast: null,
        records: [],
      });
    });
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(screen.getByText("Forecast Price Change")).toBeInTheDocument();
    });
    const changeTitle = screen.getByText("Forecast Price Change");
    expect(changeTitle.parentElement?.textContent || "").toMatch(/Forecast Price Change[\s\S]*—/);
  });

  it("does not call removed /forecasts helpers", () => {
    expect(pricesApi.getPriceDetail).toBeTypeOf("function");
    expect(pricesApi).not.toHaveProperty("getForecastChart");
    expect(pricesApi).not.toHaveProperty("getForecastCatalog");
  });

  it("uses Admin arrival-pressure output and its history for the DFTC arrival tab", async () => {
    installApi();
    renderTrends(<DFTCTrends />);

    fireEvent.click(screen.getByRole("button", { name: /Arrival Volume Trends/ }));

    await waitFor(() => {
      expect(analyticsApi.getArrivalPressure).toHaveBeenCalledWith(
        "COM-CAR",
        null,
        null,
        { aggregateVarieties: true }
      );
    });
    expect(await screen.findByText("Arrival Pressure Classification")).toBeInTheDocument();
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getByText("Historical Average Arrival")).toBeInTheDocument();
    expect(await screen.findByTestId("arrival-chart-dates")).toHaveTextContent(
      "Oct 2, 2026"
    );
  });

  it("resolves an arrival commodity that has no top-10 price row through the commodity catalog", async () => {
    installApi();
    renderTrends(<DFTCTrends />);

    fireEvent.click(screen.getByRole("button", { name: /Arrival Volume Trends/ }));
    const arrivalFilter = await openCommodityCombobox("Carrots");
    fireEvent.change(arrivalFilter.input, { target: { value: "Saluyot" } });
    fireEvent.click(
      within(arrivalFilter.dropdown()).getByRole("button", { name: /Saluyot/ })
    );

    await waitFor(() => {
      expect(analyticsApi.getArrivalPressure).toHaveBeenCalledWith(
        "COM-SAL",
        null,
        null,
        { aggregateVarieties: true }
      );
    });
  });

  it("loads and displays the Admin seasonal-production classification in DFTC Trends", async () => {
    installApi();
    renderTrends(<DFTCTrends />);

    fireEvent.click(screen.getByRole("button", { name: /Seasonal Production/ }));

    await waitFor(() => {
      expect(analyticsApi.getHistoricalSeasonalProduction).toHaveBeenCalledWith(
        "COM-KAM-DIAM",
        expect.stringMatching(/^Q[1-4]$/)
      );
    });
    fireEvent.click(await screen.findByRole("button", { name: "Q4" }));
    expect(await screen.findByText("Historical seasonal average")).toBeInTheDocument();
    expect(screen.queryByText("Production level")).not.toBeInTheDocument();
    expect(screen.getAllByText("High").length).toBeGreaterThan(0);
    expect(screen.getByText(/PSA OpenSTAT/)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Bukidnon" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "City of Davao" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Davao del Sur" })).toBeInTheDocument();
    expect(screen.getByText("45.00 MT")).toBeInTheDocument();
    expect(screen.getByText("30.00 MT")).toBeInTheDocument();
    expect(screen.getByText("50.00 MT")).toBeInTheDocument();
  });
});

describe("DFTC Trends Alert Commodities Modal", () => {
  const MOCK_HOME_WITH_ALERTS = {
    kpis: {
      price_volatility_alerts_count: 2,
      oversupply_commodities_count: 2,
      volatile_commodities: [
        {
          commodity_id: "COM-KAM-DIAM",
          crop_name: "Kamatis",
          variety: "Diamante Big",
          change_pct: 14.5,
          direction: "up",
          current_price: 72.0,
          unit: "kg",
        },
        {
          commodity_id: "COM-CAR-KURO",
          crop_name: "Carrots",
          variety: "Kuroda",
          change_pct: -12.0,
          direction: "down",
          current_price: 85.0,
          unit: "kg",
        },
      ],
      oversupply_commodities: [
        {
          commodity_id: "COM-CAR-KURO",
          crop_name: "Carrots",
          variety: "Kuroda",
          volume_kg: 2500,
          classification: "High",
        },
        {
          commodity_id: "COM-PECH",
          crop_name: "Chinese Pechay",
          variety: null,
          volume_kg: 3200,
          classification: "High",
        },
      ],
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/dftc/trends");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        if (String(url).includes("/dftc/home")) {
          return {
            ok: true,
            status: 200,
            json: async () => MOCK_HOME_WITH_ALERTS,
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [] }),
        };
      })
    );
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue(CATALOG);
    vi.spyOn(pricesApi, "getPriceDetail").mockImplementation(async (commodityId, params = {}) => {
      return detailBody({
        commodityId,
        priceType: params.price_type || "bangkerohan_retail",
        horizon: Number(params.horizon || 7),
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/dftc/trends");
  });

  it("displays Price Volatility Alerts modal when alert=volatility in URL", async () => {
    window.history.replaceState({}, "", "/dftc/trends?tab=price&alert=volatility");
    renderTrends(<DFTCTrends />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "Price Volatility Alerts" })).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Check the trend for these commodities experiencing sharp price swings/i)
    ).toBeInTheDocument();

    // Renders list of volatile commodities once home data loads
    expect(await within(dialog).findByText(/Kamatis/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Diamante Big/)).toBeInTheDocument();
    const carrotsBtn = within(dialog).getByText(/Carrots/);
    expect(carrotsBtn).toBeInTheDocument();

    // Selecting a commodity updates selection and closes modal
    fireEvent.click(carrotsBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("displays High Arrival Commodities modal when alert=oversupply in URL", async () => {
    window.history.replaceState({}, "", "/dftc/trends?tab=arrival&alert=oversupply");
    renderTrends(<DFTCTrends />);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: "High Arrival Commodities" })).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Check the trend for these commodities currently with high arrival volume/i)
    ).toBeInTheDocument();

    // Renders list of oversupply commodities once home data loads
    expect(await within(dialog).findByText(/Carrots/)).toBeInTheDocument();
    expect(await within(dialog).findByText(/Chinese Pechay/)).toBeInTheDocument();
    expect(within(dialog).getByText("2,500 kg")).toBeInTheDocument();

    // Clicking Close dismisses modal
    const closeBtns = within(dialog).getAllByRole("button", { name: /close/i });
    fireEvent.click(closeBtns[0]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });
});


