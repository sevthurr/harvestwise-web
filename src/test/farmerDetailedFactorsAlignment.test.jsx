import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FactorDetailTabs } from "../app/farmer/components/shared/FactorDetailTabs";
import * as pricesApi from "../services/api/pricesApi";
import * as analyticsApi from "../services/api/analyticsApi";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback || _key,
  }),
}));

vi.mock("../app/global/components/shared/ArrivalVolumeTrendChart", () => ({
  ArrivalVolumeTrendChart: ({ chartData, referenceValue, varietyKeys, colors }) => (
    <div
      data-testid="arrival-chart"
      data-records={JSON.stringify(chartData)}
      data-average={referenceValue}
      data-series={JSON.stringify(varietyKeys)}
      data-colors={JSON.stringify(colors)}
    />
  ),
}));

vi.mock("../app/global/components/shared/ForecastPriceTrendChart", () => ({
  ForecastPriceTrendChart: () => <div data-testid="price-chart" />,
}));

vi.mock("../app/global/components/shared/HistoricalAveragePriceSection", () => ({
  HistoricalAveragePriceSection: () => null,
}));

vi.mock("recharts", () => ({
  BarChart: ({ data }) => (
    <div data-testid="production-chart" data-profiles={JSON.stringify(data)} />
  ),
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  ReferenceLine: () => null,
}));

describe("Farmer detailed factors use Admin analytics data", () => {
  it("plots actual DFTC arrival records and uses the API average as its reference", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Lettuce"
        arrival={{
          arrivalPressure: "High",
          currentVolumeKg: 180,
          averageArrivalKg: 120,
          records: [
            {
              arrival_date: "2026-04-02",
              volume_kg: 180,
              farm_source_volume_kg: 120,
              other_source_volume_kg: 60,
            },
            {
              arrival_date: "2026-04-01",
              volume_kg: 60,
              farm_source_volume_kg: 20,
              other_source_volume_kg: 40,
            },
          ],
        }}
      />
    );

    const chart = screen.getByTestId("arrival-chart");
    expect(JSON.parse(chart.getAttribute("data-records"))).toEqual([
      {
        month: "2026-04-01",
        Volume: 60,
        "Farm source": 20,
        "Other sources": 40,
      },
      {
        month: "2026-04-02",
        Volume: 180,
        "Farm source": 120,
        "Other sources": 60,
      },
    ]);
    expect(JSON.parse(chart.getAttribute("data-series"))).toEqual([
      "Volume",
      "Farm source",
      "Other sources",
    ]);
    expect(JSON.parse(chart.getAttribute("data-colors"))).toEqual([
      "#15803d",
      "#65a30d",
      "#f59e0b",
    ]);
    expect(chart).toHaveAttribute("data-average", "120");
    expect(screen.getByText("Latest arrival")).toBeInTheDocument();
    expect(screen.getByText("180 kg")).toBeInTheDocument();
  });

  it("uses backend seasonal profiles for values, classification, and selected-quarter comparison", () => {
    const quarterlyProfiles = [
      { quarter: "Q1", average_production_mt: 75, classification: "Low", years_available: 5 },
      { quarter: "Q2", average_production_mt: 150, classification: "High", years_available: 5 },
      { quarter: "Q3", average_production_mt: 100, classification: "Upper Middle", years_available: 5 },
    ];
    render(
      <FactorDetailTabs
        defaultTab="production"
        production={{
          selectedQuarter: "Q2",
          productionLevel: "High",
          grandAverageQuarterlyMt: 100,
          quarterlyProfiles,
        }}
      />
    );

    expect(screen.getByText("High Production Season")).toBeInTheDocument();
    expect(screen.getByText("150 MT")).toBeInTheDocument();
    expect(screen.getByText("+50 MT (+50.0%)")).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId("production-chart").getAttribute("data-profiles"))).toEqual([
      { quarter: "Q1", production: 75, classification: "Low" },
      { quarter: "Q2", production: 150, classification: "High" },
      { quarter: "Q3", production: 100, classification: "Upper Middle" },
    ]);
  });

  it("shows the production empty state instead of a fabricated zero-scale chart", () => {
    render(<FactorDetailTabs defaultTab="production" production={{ quarterlyProfiles: [] }} />);

    expect(screen.getByText("Production data not available")).toBeInTheDocument();
    expect(screen.queryByTestId("production-chart")).not.toBeInTheDocument();
    expect(screen.queryByText(/0 MT/)).not.toBeInTheDocument();
  });

  it("loads price trend and classification from Admin's 14-day Bankerohan Retail outlook", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Lettuce",
        commodity_id: "COM-1",
        variety: null,
        prices: { bangkerohan_retail: 100 },
      }],
    });
    const outlookSpy = vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Favorable",
      commodity_id: "COM-1",
      commodity_name: "Lettuce",
      market: "Bangkerohan",
      price_type: "retail",
      forecast_horizon_days: 14,
      current_prevailing_price: 100,
      recent_average_price: 98,
      forecast_midpoint: 106,
      lower_forecast: 102,
      upper_forecast: 110,
      forecast_price_change_pct: 6,
      forecast_points: [],
      price_records: [],
      explanation: "The Admin Price Outlook classifies this forecast as Favorable.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs defaultTab="price" commodityId="COM-1" commodityName="Lettuce" />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Favorable Price")).toBeInTheDocument();
    expect(screen.getByText("The Admin Price Outlook classifies this forecast as Favorable.")).toBeInTheDocument();
    expect(outlookSpy).toHaveBeenCalledWith("COM-1", "bangkerohan_retail", 14);
  });
});
