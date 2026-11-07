import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import PriceDetailView from "../app/farmer/components/shared/PriceDetailView.jsx";

const { getPriceListMock, getPriceOutlookMock } = vi.hoisted(() => ({
  getPriceListMock: vi.fn(),
  getPriceOutlookMock: vi.fn(),
}));

vi.mock("../services/api/pricesApi.js", () => ({
  getPriceList: getPriceListMock,
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getPriceOutlook: getPriceOutlookMock,
  getHistoricalSeasonalProduction: vi.fn(async () => null),
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
    effectiveLanguage: "en",
    langCode: "en",
  }),
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", () => ({
  CommodityIllustration: () => <span data-testid="commodity-art" />,
}));

vi.mock("../app/global/components/shared/ForecastPriceTrendChart.jsx", () => ({
  ForecastPriceTrendChart: () => <div data-testid="trend-chart" />,
}));

vi.mock("../app/global/components/shared/HistoricalAveragePriceSection.jsx", () => ({
  HistoricalAveragePriceSection: () => <div data-testid="historical-section" />,
}));

function renderPriceDetailView(props = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PriceDetailView
          commodityId="COM-0036"
          commodityName="Atsal"
          cropStage="near_harvest"
          {...props}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PriceDetailView dynamic Stage 3 forecast dependency", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getPriceListMock.mockResolvedValue({
      items: [
        {
          commodity_id: "COM-0036",
          name: "Atsal",
          variety: "Smooth Cayene",
          prices: { bangkerohan_retail: 140 },
        },
      ],
    });

    const priceRecords = [];
    const baseDate = new Date("2026-10-28T00:00:00Z");

    for (let i = 0; i < 28; i++) {
      const d = new Date(baseDate);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let p = 120;
      if (i === 0) p = 140; // latest observed price is 140
      else if (i < 7) p = 120;
      else if (i < 14) p = 140;
      else if (i < 21) p = 160;
      else p = 180;

      priceRecords.push({
        price_date: dateStr,
        prevail_price: p,
        market: "Bangkerohan Public Market",
        price_type: "retail",
      });
    }

    const forecastPoints = [
      {
        forecast_date: "2026-11-04",
        horizon_days: 7,
        forecast_midpoint: 147.0, // +5% from 140
      },
      {
        forecast_date: "2026-11-11",
        horizon_days: 14,
        forecast_midpoint: 154.0, // +10% from 140
      },
    ];

    getPriceOutlookMock.mockResolvedValue({
      commodity_id: "COM-0036",
      commodity_name: "Atsal",
      crop_stage: "near_harvest",
      current_prevailing_price: 140.0,
      recent_average_price: 130.0,
      current_market_price: 140.0,
      price_records: priceRecords,
      forecast_points: forecastPoints,
      forecast_midpoint: 154.0,
      forecast_difference_pct: 10.0,
      expected_price_direction: "Rising",
    });
  });

  it("calculates forecast price depending on the selected 14-day recent average", async () => {
    renderPriceDetailView();

    // Wait for the query to resolve
    const matches = await screen.findAllByText(/Current Market Price/i);
    expect(matches.length).toBeGreaterThan(0);

    // Current market price is 140
    expect(screen.getByText("₱140.00")).toBeInTheDocument();

    // 14-day recent average is 131.43
    expect(screen.getByText("₱131.43")).toBeInTheDocument();

    // Forecast Price = 131.42857 * (1 + 0.10) = 144.57
    expect(screen.getByText("₱144.57")).toBeInTheDocument();

    // Forecast Difference = ((144.5714 - 140) / 140) * 100 = +3.27%
    expect(screen.getByText(/\+3\.27% · Rising/i)).toBeInTheDocument();
  });

  it("dynamically updates forecast price when user changes historical range to 7 days, 21 days, and 28 days", async () => {
    renderPriceDetailView();

    await screen.findAllByText(/Current Market Price/i);

    // Locate Historical Range select
    const selects = screen.getAllByRole("combobox");
    const historicalSelect = selects.find((sel) =>
      Array.from(sel.options).some((opt) => opt.value === "7d" && opt.text.includes("7 days"))
    );
    expect(historicalSelect).toBeDefined();

    // 1. Change to 7 days
    // 7d records: 140 + 6*120 = 860 / 7 = 122.86
    // Forecast Price = 122.857 * 1.10 = 135.14
    // Diff vs 140 = ((135.14 - 140) / 140) * 100 = -3.47% · Dropping
    fireEvent.change(historicalSelect, { target: { value: "7d" } });

    expect(screen.getByText(/Last 7 days average/i)).toBeInTheDocument();
    expect(screen.getByText("₱122.86")).toBeInTheDocument();
    expect(screen.getByText("₱135.14")).toBeInTheDocument();
    expect(screen.getByText(/-3\.47% · Dropping/i)).toBeInTheDocument();

    // 2. Change to 28 days
    // 28d records: (140 + 6*120 + 7*140 + 7*160 + 7*180) / 28 = 4220 / 28 = 150.71
    // Forecast Price = 150.714 * 1.10 = 165.79
    // Diff vs 140 = ((165.79 - 140) / 140) * 100 = +18.42% · Rising
    fireEvent.change(historicalSelect, { target: { value: "28d" } });

    expect(screen.getByText(/Last 28 days average/i)).toBeInTheDocument();
    expect(screen.getByText("₱150.71")).toBeInTheDocument();
    expect(screen.getByText("₱165.79")).toBeInTheDocument();
    expect(screen.getByText(/\+18\.42% · Rising/i)).toBeInTheDocument();

    // 3. Change to 21 days
    // 21d records: (140 + 6*120 + 7*140 + 7*160) / 21 = 2960 / 21 = 140.95
    // Forecast Price = 140.952 * 1.10 = 155.05
    // Diff vs 140 = ((155.05 - 140) / 140) * 100 = +10.75% · Rising
    fireEvent.change(historicalSelect, { target: { value: "21d" } });

    expect(screen.getByText(/Last 21 days average/i)).toBeInTheDocument();
    expect(screen.getByText("₱140.95")).toBeInTheDocument();
    expect(screen.getByText("₱155.05")).toBeInTheDocument();
    expect(screen.getByText(/\+10\.75% · Rising/i)).toBeInTheDocument();
  });
});
