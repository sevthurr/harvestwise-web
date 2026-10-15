import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoricalAveragePriceSection } from "../app/global/components/shared/HistoricalAveragePriceSection";
import * as pricesApi from "../services/api/pricesApi";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithQuery(ui) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, params, fallback) => {
      if (params && typeof fallback === "string") {
        let res = fallback;
        for (const [k, v] of Object.entries(params)) {
          res = res.replace(`{${k}}`, String(v));
        }
        return res;
      }
      return fallback || key;
    },
    langCode: "en",
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="historical-chart-container">{children}</div>,
    LineChart: ({ children, data }) => (
      <svg data-testid="historical-line-chart" data-points={data?.length}>
        {children}
      </svg>
    ),
    Line: () => <div data-testid="historical-line" />,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Brush: () => <div data-testid="historical-brush" />,
    ReferenceArea: ({ x1, x2 }) => <div data-testid="planting-window-area" data-x1={x1} data-x2={x2} />,
    ReferenceLine: ({ x, label }) => (
      <div data-testid="planting-window-line" data-x={x} data-label={typeof label === "object" ? label?.value : label} />
    ),
  };
});

describe("HistoricalAveragePriceSection component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders container, title, and frequency selector defaulting to Weekly without Day 9+/29+ badge", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      commodity_name: "Ampalaya",
      records: [],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        variety="Galaxy"
        priceTypeKey="bangkerohan_retail"
      />
    );

    expect(screen.getByText("Historical Average Price")).toBeInTheDocument();
    expect(screen.queryByText(/Day (9|29)\+/i)).not.toBeInTheDocument();
    const select = screen.getByRole("combobox");
    expect(select.value).toBe("weekly");
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  it("always shows the generic advisory neutrality explanation in empty state", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        priceTypeKey="bangkerohan_retail"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No historical average price data is available for this selection.")
      ).toBeInTheDocument();
    });

    // Generic explanation is still mounted and visible
    expect(
      screen.getByText(/This chart shows weekly or monthly average recorded prices/i)
    ).toBeInTheDocument();
    // Dynamic statement is suppressed when there is no data
    expect(screen.queryByText(/The average recorded price for [A-Za-z]+ \d/i)).not.toBeInTheDocument();
  });

  it("renders straight line chart and dynamic explanation on success with past records", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-06", period_end: "2026-07-12", average_price: 67.86, observation_count: 6 },
        { period_start: "2026-07-13", period_end: "2026-07-19", average_price: 72.4, observation_count: 7 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        priceTypeKey="bangkerohan_retail"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("historical-line-chart")).toBeInTheDocument();
    });

    // Dynamic statement appears with real data
    expect(screen.getByText(/The average recorded price for Jul 13–19/i)).toBeInTheDocument();
    expect(screen.getByText(/₱72.40\/kg/i)).toBeInTheDocument();
  });

  it("shows limited data notice when only 1 period is returned", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "monthly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-01", period_end: "2026-07-31", average_price: 67.86, observation_count: 6 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        priceTypeKey="bangkerohan_retail"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Limited historical data is available for this selection.")
      ).toBeInTheDocument();
    });
  });

  it("keeps frequency selector usable when empty, and switching to monthly queries monthly", async () => {
    const apiSpy = vi.spyOn(pricesApi, "getHistoricalAveragePrices");
    apiSpy.mockResolvedValueOnce({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        priceTypeKey="bangkerohan_retail"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("No historical average price data is available for this selection.")
      ).toBeInTheDocument();
    });

    apiSpy.mockResolvedValueOnce({
      frequency: "monthly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-01", period_end: "2026-07-31", average_price: 68.5, observation_count: 14 },
      ],
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "monthly" } });

    await waitFor(() => {
      expect(apiSpy).toHaveBeenCalledWith(
        "COM-1",
        expect.objectContaining({ frequency: "monthly" })
      );
      expect(screen.getByTestId("historical-line-chart")).toBeInTheDocument();
    });
  });

  it("displays friendly error message on API failure without leaking backend internals", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockRejectedValue(
      new Error("Internal 500 database error: column 'foo' does not exist")
    );

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        priceTypeKey="bangkerohan_retail"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText("Historical average price data could not be loaded. Please try again.")
      ).toBeInTheDocument();
    });

    // Does NOT leak stack trace or internal error message
    expect(screen.queryByText(/column 'foo' does not exist/i)).not.toBeInTheDocument();
    // Frequency control remains visible and usable
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("highlights the farmer's planned planting window on the graph when plantingDate is provided", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-20", period_end: "2026-07-26", average_price: 70.0, observation_count: 5 },
        { period_start: "2026-07-27", period_end: "2026-08-02", average_price: 72.0, observation_count: 6 },
        { period_start: "2026-08-03", period_end: "2026-08-09", average_price: 75.0, observation_count: 7 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        plantingDate="2026-07-28"
        plantingWindowStart="2026-07-27"
        plantingWindowEnd="2026-08-02"
        plantingWindowLabel="Jul 27 – Aug 02, 2026"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Your Planned Planting Window: Jul 27 – Aug 02, 2026/)).toBeInTheDocument();
    });

    expect(screen.getByTestId("planting-window-area")).toBeInTheDocument();
    expect(screen.getByTestId("planting-window-line")).toBeInTheDocument();
  });

  it("shows prompt and does not fabricate a planting window when no planting date is selected", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-20", period_end: "2026-07-26", average_price: 70.0, observation_count: 5 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Select a planned planting date in Crop Assessment to see your planting window highlighted/)
      ).toBeInTheDocument();
    });

    expect(screen.queryByTestId("planting-window-area")).not.toBeInTheDocument();
    expect(screen.queryByText(/Your Planned Planting Window/)).not.toBeInTheDocument();
  });

  it("aligns multi-year historical prices with seasonal timeline of the planting window", async () => {
    // Historical data is from 2024, but farmer plans to plant in 2026
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2024-03-01", period_end: "2024-03-07", average_price: 55.0, observation_count: 5 },
        { period_start: "2024-03-08", period_end: "2024-03-14", average_price: 58.0, observation_count: 5 },
        { period_start: "2024-08-01", period_end: "2024-08-07", average_price: 65.0, observation_count: 6 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        plantingDate="2026-03-10"
        plantingWindowStart="2026-03-08"
        plantingWindowEnd="2026-03-14"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("planting-window-area")).toBeInTheDocument();
    });

    const area = screen.getByTestId("planting-window-area");
    // Should match the March 2024 week by seasonal projection
    expect(area.getAttribute("data-x1")).toBe("Mar 8–14");
  });

  it("covers the entire duration of plant-to-harvest period when expectedHarvestDate is provided", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        { period_start: "2026-07-20", period_end: "2026-07-26", average_price: 70.0, observation_count: 5 },
        { period_start: "2026-07-27", period_end: "2026-08-02", average_price: 72.0, observation_count: 6 },
        { period_start: "2026-08-03", period_end: "2026-08-09", average_price: 74.0, observation_count: 7 },
        { period_start: "2026-08-10", period_end: "2026-08-16", average_price: 75.0, observation_count: 7 },
        { period_start: "2026-08-17", period_end: "2026-08-23", average_price: 78.0, observation_count: 6 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        plantingDate="2026-07-28"
        expectedHarvestDate="2026-08-20"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Plant-to-Harvest Period: Jul 28 – Aug 20, 2026/)).toBeInTheDocument();
    });

    const area = screen.getByTestId("planting-window-area");
    expect(area).toBeInTheDocument();
    // Spans from planting week to harvest week
    expect(area.getAttribute("data-x1")).toBe("Jul 27 – Aug 2");
    expect(area.getAttribute("data-x2")).toBe("Aug 17–23");

    const line = screen.getByTestId("planting-window-line");
    expect(line.getAttribute("data-label")).toBe("🌱 Plant-to-Harvest Period");
  });

  it("aligns plant-to-harvest period to the previous year when multi-year historical records exist", async () => {
    vi.spyOn(pricesApi, "getHistoricalAveragePrices").mockResolvedValue({
      frequency: "weekly",
      commodity_id: "COM-1",
      records: [
        // 2025 records (previous year)
        { period_start: "2025-09-01", period_end: "2025-09-07", average_price: 65.0, observation_count: 7 },
        { period_start: "2025-09-08", period_end: "2025-09-14", average_price: 66.0, observation_count: 7 },
        { period_start: "2025-09-15", period_end: "2025-09-21", average_price: 67.0, observation_count: 7 },
        { period_start: "2025-09-22", period_end: "2025-09-28", average_price: 67.86, observation_count: 7 },
        { period_start: "2025-09-29", period_end: "2025-10-05", average_price: 68.0, observation_count: 7 },
        { period_start: "2025-10-06", period_end: "2025-10-12", average_price: 69.0, observation_count: 7 },
        { period_start: "2025-10-13", period_end: "2025-10-19", average_price: 70.0, observation_count: 7 },
        // 2026 records (current year)
        { period_start: "2026-09-01", period_end: "2026-09-07", average_price: 88.0, observation_count: 5 },
        { period_start: "2026-10-12", period_end: "2026-10-18", average_price: 90.0, observation_count: 5 },
      ],
    });

    renderWithQuery(
      <HistoricalAveragePriceSection
        commodityId="COM-1"
        commodityName="Ampalaya"
        plantingDate="2026-09-01"
        expectedHarvestDate="2026-10-19"
      />
    );

    // Badge indicates Previous Year and shows 2025 dates
    await waitFor(() => {
      expect(screen.getByText(/Plant-to-Harvest Period \(Previous Year\): Sep 1 – Oct 19, 2025/)).toBeInTheDocument();
    });

    const area = screen.getByTestId("planting-window-area");
    expect(area).toBeInTheDocument();
    // Spans 2025 weeks
    expect(area.getAttribute("data-x1")).toBe("Sep 1–7");
    expect(area.getAttribute("data-x2")).toBe("Oct 13–19");

    const line = screen.getByTestId("planting-window-line");
    expect(line.getAttribute("data-label")).toBe("🌱 Plant-to-Harvest (Previous Year)");

    // Dynamic explanation reflects the average price for the previous year's plant-to-harvest period
    expect(screen.getByText(/The average recorded price for Sep 1 – Oct 19, 2025 was ₱67.55\/kg\./)).toBeInTheDocument();
  });
});
