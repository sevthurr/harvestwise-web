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
      screen.getByText(/This chart shows the average recorded price for each week or month/i)
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
});
