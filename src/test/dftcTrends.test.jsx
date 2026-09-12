/**
 * DFTC Trends Price Trends — prices API wiring (no XGBoost in React).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DFTCTrends from "../app/dftc/pages/DFTCTrends";
import * as pricesApi from "../services/api/pricesApi";
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
    Line: () => null,
    Area: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Brush: () => null,
  };
});

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
  ],
  total: 1,
  page: 1,
  page_size: 100,
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
    expect(summaries[0].change).toBeNull();
    expect(summaries[0].recentAvg).toBeCloseTo(71, 5);
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
});

describe("DFTC Trends page prices API integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function installApi() {
    const detailCalls = [];
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue(CATALOG);
    vi.spyOn(pricesApi, "getPriceDetail").mockImplementation(async (commodityId, params = {}) => {
      detailCalls.push({ commodityId, ...params });
      return detailBody({
        commodityId,
        priceType: params.price_type || "bangkerohan_retail",
        horizon: Number(params.horizon || 7),
      });
    });
    return detailCalls;
  }

  it("loads Bangkerohan/DFTC historical + forecast for the catalog commodity_id", async () => {
    const detailCalls = installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(detailCalls.some((call) => call.commodityId === "COM-KAM-DIAM")).toBe(true);
    });
    expect(detailCalls[0].price_type).toBe("bangkerohan_retail");
    expect(detailCalls[0].horizon).toBe(14);
    expect(detailCalls[0].records_limit).toBe(100);
    await waitFor(() => {
      expect(screen.getByText("Forecast Midpoint")).toBeInTheDocument();
      expect(screen.getByText("Lower Forecast")).toBeInTheDocument();
      expect(screen.getByText("Upper Forecast")).toBeInTheDocument();
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
      const buttons = screen.getAllByRole("button");
      const horizonBtn = buttons.find((btn) => /Next \d+ days/.test(btn.textContent || ""));
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

  it("keeps Forecast Change as an em dash and does not expose Price Outlook", async () => {
    installApi();
    renderTrends(<DFTCTrends />);
    await waitFor(() => {
      expect(screen.getByText("Forecast Price Change")).toBeInTheDocument();
    });
    expect(screen.queryByText("Price Outlook")).not.toBeInTheDocument();
    const changeTitle = screen.getByText("Forecast Price Change");
    expect(changeTitle.parentElement?.textContent || "").toMatch(/Forecast Price Change[\s\S]*—/);
  });

  it("does not call removed /forecasts helpers", () => {
    expect(pricesApi.getPriceDetail).toBeTypeOf("function");
    expect(pricesApi).not.toHaveProperty("getForecastChart");
    expect(pricesApi).not.toHaveProperty("getForecastCatalog");
  });
});
