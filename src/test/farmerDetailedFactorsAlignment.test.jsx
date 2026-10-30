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
  Brush: () => null,
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
      { year: "Q1", Q1: 75 },
      { year: "Q2", Q2: 150 },
      { year: "Q3", Q3: 100 },
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
    expect(outlookSpy).toHaveBeenCalledWith("COM-1", "bangkerohan_retail", 7);
  });

  it("Stage 1 displays historical seasonal price outlook and multi-year baseline, ignoring forecast", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Ampalaya",
        commodity_id: "COM-1",
        variety: null,
        prices: { bangkerohan_retail: 30 },
      }],
    });
    const outlookSpy = vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Favorable",
      commodity_id: "COM-1",
      commodity_name: "Ampalaya",
      crop_stage: "before_planting",
      reference_price: 30.0,
      comparison_baseline: 25.0,
      price_reference_type: "historical_seasonal",
      price_reference_label: "Historical Seasonal Average Price",
      comparison_baseline_label: "Multi-Year Macro Baseline",
      forecast_price_change_pct: 20.0,
      forecast_midpoint: 45.0, // Existing ML forecast must NOT override Stage 1 reference
      is_fallback: false,
      explanation: "Historical seasonal average price (₱30.00/kg) is +20.0% relative to multi-year macro baseline.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-1"
          commodityName="Ampalaya"
          cropStage="before_planting"
          plantingDate="2026-08-01"
          expectedHarvestDate="2026-11-01"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Favorable Price")).toBeInTheDocument();
    expect(screen.getByText("Historical Seasonal Average Price")).toBeInTheDocument();
    expect(screen.getByText("Multi-Year Macro Baseline")).toBeInTheDocument();
    expect(screen.getByText("Historical Seasonal")).toBeInTheDocument();
    expect(screen.getByText("Stage 1: Planning")).toBeInTheDocument();
    expect(screen.getByText("Historical seasonal average price (₱30.00/kg) is +20.0% relative to multi-year macro baseline.")).toBeInTheDocument();
    expect(outlookSpy).toHaveBeenCalledWith(
      "COM-1",
      "bangkerohan_retail",
      7,
      expect.objectContaining({
        cropStage: "before_planting",
        plantingDate: "2026-08-01",
        harvestDate: "2026-11-01",
      })
    );
  });

  it("Stage 2 displays ML forecast when eligible and identifies fallback when unavailable", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Talong",
        commodity_id: "COM-2",
        variety: null,
        prices: { bangkerohan_retail: 50 },
      }],
    });
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Neutral",
      commodity_id: "COM-2",
      commodity_name: "Talong",
      crop_stage: "during_planting",
      reference_price: 52.0,
      comparison_baseline: 50.0,
      price_reference_type: "forecast",
      price_reference_label: "Forecasted Price",
      comparison_baseline_label: "Multi-Year Macro Baseline",
      forecast_price_change_pct: 4.0,
      is_fallback: false,
      explanation: "Forecasted price (₱52.00/kg) covering harvest date is +4.0% relative to comparison baseline.",
    });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-2"
          commodityName="Talong"
          cropStage="during_planting"
          plantingDate="2026-07-01"
          expectedHarvestDate="2026-07-20"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Forecasting")).toBeInTheDocument();
    expect(screen.getByText("Stage 2: Planting")).toBeInTheDocument();

    // Fallback scenario
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Unfavorable",
      commodity_id: "COM-2",
      commodity_name: "Talong",
      crop_stage: "during_planting",
      reference_price: 45.0,
      comparison_baseline: 50.0,
      price_reference_type: "historical_seasonal",
      price_reference_label: "Historical Seasonal Average Price (Fallback)",
      comparison_baseline_label: "Multi-Year Macro Baseline",
      forecast_price_change_pct: -10.0,
      is_fallback: true,
      explanation: "Historical seasonal average price fallback (₱45.00/kg) is -10.0% relative to multi-year macro baseline.",
    });

    queryClient.clear();
    rerender(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-2"
          commodityName="Talong"
          cropStage="during_planting"
          plantingDate="2026-07-01"
          expectedHarvestDate="2026-07-20"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Historical Fallback")).toBeInTheDocument();
  });

  it("Stage 4 displays current observed market price against 7-day spot baseline", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Kalabasa",
        commodity_id: "COM-3",
        variety: null,
        prices: { bangkerohan_retail: 35 },
      }],
    });
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Favorable",
      commodity_id: "COM-3",
      commodity_name: "Kalabasa",
      crop_stage: "harvest",
      reference_price: 38.0,
      comparison_baseline: 32.0,
      price_reference_type: "current_observed",
      price_reference_label: "Current Observed Market Price",
      comparison_baseline_label: "Seven-Day Moving Spot Average",
      forecast_price_change_pct: 18.75,
      is_fallback: false,
      explanation: "Current observed market price (₱38.00/kg) is +18.8% relative to seven-day moving spot average.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-3"
          commodityName="Kalabasa"
          cropStage="harvest"
          plantingDate="2026-04-01"
          expectedHarvestDate="2026-07-01"
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText("Current Observed Market Price")).toBeInTheDocument();
    expect(screen.getByText("Seven-Day Moving Spot Average")).toBeInTheDocument();
    expect(screen.getByText("Observed Market")).toBeInTheDocument();
    expect(screen.getByText("Stage 4: Harvest")).toBeInTheDocument();
  });

  it("displays Insufficient Data banner and does not fabricate Favorable or Neutral when data is unavailable", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Carrots",
        commodity_id: "COM-4",
        variety: null,
        prices: { bangkerohan_retail: 80 },
      }],
    });
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "insufficient_data",
      classification: "Insufficient Data",
      commodity_id: "COM-4",
      commodity_name: "Carrots",
      crop_stage: "before_planting",
      reference_price: null,
      comparison_baseline: null,
      price_reference_type: "insufficient_data",
      price_reference_label: "Insufficient Data",
      explanation: "Price: Multi-Year Macro Baseline is unavailable.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-4"
          commodityName="Carrots"
          cropStage="before_planting"
        />
      </QueryClientProvider>
    );

    const insufficientElements = await screen.findAllByText("Insufficient Data");
    expect(insufficientElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Favorable Price")).not.toBeInTheDocument();
    expect(screen.queryByText("Watch")).not.toBeInTheDocument();
    expect(screen.queryByText("Unfavorable Price")).not.toBeInTheDocument();
  });

  it("Stage 2 renders dual display with separate forecast and historical classifications when forecast is eligible", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Talong",
        commodity_id: "COM-2",
        variety: null,
        prices: { bangkerohan_retail: 50 },
      }],
    });
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Favorable",
      commodity_id: "COM-2",
      commodity_name: "Talong",
      crop_stage: "during_planting",
      reference_price: 65.0,
      comparison_baseline: 55.0,
      price_reference_type: "forecast",
      price_reference_label: "Forecasted Price",
      comparison_baseline_label: "Multi-Year Macro Baseline",
      forecast_price_change_pct: 18.18,
      historical_seasonal_price: 52.0,
      macro_baseline_price: 50.0,
      historical_price_change_pct: 4.0,
      historical_price_outlook: "Neutral",
      forecast_price_outlook: "Favorable",
      has_eligible_forecast: true,
      days_to_harvest: 12,
      is_fallback: false,
      explanation: "Forecasted price (₱65.00/kg) covering harvest date is +18.2% relative to comparison baseline.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-2"
          commodityName="Talong"
          cropStage="during_planting"
          plantingDate="2026-07-01"
          expectedHarvestDate="2026-07-13"
        />
      </QueryClientProvider>
    );

    // Both panels must be visible
    expect(await screen.findByText("Forecast Information (Primary Basis)")).toBeInTheDocument();
    expect(screen.getByText("Historical Seasonal Information")).toBeInTheDocument();
    expect(screen.queryByText("Dual Assessment")).not.toBeInTheDocument();
    expect(screen.queryByText("Forecast Eligible")).not.toBeInTheDocument();

    // Check forecast information values
    expect(screen.getByText("₱65.00")).toBeInTheDocument();
    expect(screen.getByText("Forecast Classification")).toBeInTheDocument();

    // Check historical seasonal information values
    expect(screen.getByText("₱52.00")).toBeInTheDocument();
    expect(screen.getByText("Historical Classification")).toBeInTheDocument();

    // Both classifications are rendered
    expect(screen.getAllByText("Favorable").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Neutral").length).toBeGreaterThanOrEqual(1);
  });

  it("Stage 2 displays forecast unavailable notice and historical cards when harvest is beyond horizon", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(pricesApi, "getPriceList").mockResolvedValue({
      items: [{
        name: "Talong",
        commodity_id: "COM-2",
        variety: null,
        prices: { bangkerohan_retail: 50 },
      }],
    });
    vi.spyOn(analyticsApi, "getPriceOutlook").mockResolvedValue({
      status: "processed",
      classification: "Neutral",
      commodity_id: "COM-2",
      commodity_name: "Talong",
      crop_stage: "during_planting",
      reference_price: 52.0,
      comparison_baseline: 50.0,
      price_reference_type: "historical_seasonal",
      price_reference_label: "Historical Seasonal Average Price",
      comparison_baseline_label: "Multi-Year Macro Baseline",
      forecast_price_change_pct: 4.0,
      historical_seasonal_price: 52.0,
      macro_baseline_price: 50.0,
      historical_price_change_pct: 4.0,
      historical_price_outlook: "Neutral",
      has_eligible_forecast: false,
      days_to_harvest: 45,
      is_fallback: false,
      explanation: "Historical seasonal average price (₱52.00/kg) for expected harvest season is +4.0% relative to multi-year macro baseline.",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FactorDetailTabs
          defaultTab="price"
          commodityId="COM-2"
          commodityName="Talong"
          cropStage="during_planting"
          plantingDate="2026-07-01"
          expectedHarvestDate="2026-08-15"
        />
      </QueryClientProvider>
    );

    // Callout must be displayed indicating forecast is unavailable
    expect(await screen.findByText(/Forecast Information Unavailable:/)).toBeInTheDocument();
    expect(screen.getByText(/Current Price Outlook is based on historical seasonal data/)).toBeInTheDocument();

    // Historical Seasonal basis is shown
    expect(await screen.findByText("Historical Seasonal")).toBeInTheDocument();
    expect(screen.getByText("Stage 2: Planting")).toBeInTheDocument();
  });
});
