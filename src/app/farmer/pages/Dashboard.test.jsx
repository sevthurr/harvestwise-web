import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const { getPriceListMock, getPriceDetailMock } = vi.hoisted(() => ({
  getPriceListMock: vi.fn(),
  getPriceDetailMock: vi.fn(),
}));

vi.mock("../../../services/api/pricesApi", () => ({
  getPriceList: getPriceListMock,
  getPriceDetail: getPriceDetailMock,
}));

vi.mock("../../global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
  }),
}));

vi.mock("../../global/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "farmer-1", first_name: "Test" } }),
}));

vi.mock("../../global/hooks/useFarmerPrefetch", () => ({
  fetchFarmerProfile: vi.fn(async () => ({})),
}));

vi.mock("../components/crops/CropsContext", () => ({
  useCrops: () => ({ crops: [], loading: false }),
}));

vi.mock("../../global/components/shared/CommodityIllustrations", () => ({
  CommodityIllustration: () => <span data-testid="commodity-art" />,
}));

import DashboardPage from "./Dashboard.jsx";

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
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
    expect(screen.getByText(/Forecast period .*2026/)).toBeInTheDocument();
    expect(screen.getByText("No trend data")).toBeInTheDocument();
    expect(screen.getByText("₱150/kg")).toBeInTheDocument();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });
});
