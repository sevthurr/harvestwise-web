import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const { getPriceDetailMock, priceListResponse } = vi.hoisted(() => ({
  getPriceDetailMock: vi.fn(),
  priceListResponse: { current: { items: [] } },
}));

vi.mock("../../global/api", () => ({
  apiGet: vi.fn(async () => ({ ok: true })),
  parseResponse: vi.fn(async () => priceListResponse.current),
}));

vi.mock("../../../services/api/pricesApi", () => ({
  getPriceDetail: getPriceDetailMock,
}));

vi.mock("../../global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
  }),
}));

vi.mock("../../global/components/shared/CommodityIllustrations", () => ({
  CommodityIllustration: () => <span data-testid="commodity-art" />,
}));

import PricesPage from "./Prices.jsx";

function renderPricesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PricesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lettuce = {
  commodity_id: "COM-0025",
  name: "Lettuce",
  variety: "Ball",
  unit_of_measure: "kg",
  is_top10: true,
  prices: {
    bangkerohan_retail: 150,
    bangkerohan_wholesale: 120,
    dftc_retail: 130,
    dftc_wholesale: 100,
  },
  forecast: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  priceListResponse.current = { items: [lettuce] };
});

describe("Farmer prices page", () => {
  it("uses the series-specific price detail API for trends and forecasts", async () => {
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 150 }],
      forecast: {
        forecast_date: "2026-08-07",
        horizon_days: 7,
        trend: "Falling",
        forecast_midpoint: 141.39,
        lower_forecast: 129.74,
        upper_forecast: 153.04,
        points: [
          { forecast_date: "2026-08-01" },
          { forecast_date: "2026-08-07" },
        ],
      },
    });

    renderPricesPage();

    expect(await screen.findByText("Falling")).toBeInTheDocument();
    expect(screen.getByText("₱141.39/kg")).toBeInTheDocument();
    expect(screen.getByText("₱150/kg")).toBeInTheDocument();
    expect(screen.getByText("₱130/kg")).toBeInTheDocument();
    expect(screen.getByText(/Possible range.*₱129\.74–₱153\.04\/kg/)).toBeInTheDocument();
    expect(screen.getByText(/Forecast period .*2026/)).toBeInTheDocument();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });

  it("shows missing trend data without inventing a forecast price", async () => {
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 150 }],
      forecast: null,
    });

    renderPricesPage();

    expect(await screen.findAllByText("No trend data")).not.toHaveLength(0);
    expect(screen.getByText("Not available")).toBeInTheDocument();
    expect(screen.queryByText("₱0/kg")).not.toBeInTheDocument();
  });
});
