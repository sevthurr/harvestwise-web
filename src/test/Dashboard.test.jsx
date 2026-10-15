import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const { getPriceListMock, getPriceDetailMock } = vi.hoisted(() => ({
  getPriceListMock: vi.fn(),
  getPriceDetailMock: vi.fn(),
}));

vi.mock("../services/api/pricesApi.js", () => ({
  getPriceList: getPriceListMock,
  getPriceDetail: getPriceDetailMock,
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
  }),
}));

vi.mock("../app/global/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: "farmer-1", first_name: "Test" } }),
}));

vi.mock("../app/global/hooks/useFarmerPrefetch.js", () => ({
  fetchFarmerProfile: vi.fn(async () => ({})),
}));

vi.mock("../app/farmer/components/crops/CropsContext.jsx", () => ({
  useCrops: () => ({ crops: [], loading: false }),
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", () => ({
  CommodityIllustration: () => <span data-testid="commodity-art" />,
}));

import DashboardPage from "../app/farmer/pages/Dashboard.jsx";

function renderDashboard(queryClient) {
  const client = queryClient ?? new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getPriceListMock.mockResolvedValue({
    items: [
      {
        commodity_id: "COM-0025",
        name: "Lettuce",
        base_name: "Lettuce",
        variety: "Ball",
        unit_of_measure: "kg",
        is_top10: true,
        prices: { bangkerohan_retail: 150 },
        forecast: null,
      },
      {
        commodity_id: "COM-0026",
        name: "Repolyo",
        base_name: "Repolyo",
        variety: "Green",
        unit_of_measure: "kg",
        is_top10: true,
        prices: { bangkerohan_retail: 68 },
        forecast: null,
      },
    ],
  });
  getPriceDetailMock.mockImplementation(async (commodityId) => ({
    recent_records: [{ prevail_price: commodityId === "COM-0025" ? 150 : 68 }],
    forecast: commodityId === "COM-0025"
      ? {
          trend: "Falling",
          forecast_midpoint: 141.39,
          forecast_date: "2026-08-07",
          points: [
            { forecast_date: "2026-08-01" },
            { forecast_date: "2026-08-07" },
          ],
        }
      : null,
  }));
});

describe("Farmer dashboard price trends", () => {
  it("uses the same series-specific trend API as the Prices page", async () => {
    renderDashboard();

    expect(await screen.findByText("Falling")).toBeInTheDocument();
    expect(screen.getByText("-₱9")).toBeInTheDocument();
    expect(screen.getByText("No trend data")).toBeInTheDocument();
    expect(screen.getByText("₱150/kg")).toBeInTheDocument();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });

  it("refreshes cached price and trend data when the dashboard opens", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["dashboard", "prices"], [
      {
        id: "COM-0025",
        name: "Lettuce",
        baseName: "Lettuce",
        price: 150,
        priceType: "bangkerohan_retail",
        uom: "kg",
      },
    ]);
    queryClient.setQueryData(
      ["farmer-price-card-trend", "COM-0025", "bangkerohan_retail", 7],
      { recent_records: [], forecast: null },
    );
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 150 }],
      forecast: {
        trend: "Falling",
        forecast_midpoint: 141.39,
        forecast_date: "2026-08-07",
        points: [{ forecast_date: "2026-08-07" }],
      },
    });

    renderDashboard(queryClient);

    expect(await screen.findByText("Falling")).toBeInTheDocument();
    expect(getPriceListMock).toHaveBeenCalled();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });
});
