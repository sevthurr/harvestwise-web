import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";

const {
  getArrivalPressureMock,
  getSeasonalProductionMock,
  navigateMock,
  cropState,
} = vi.hoisted(() => ({
  getArrivalPressureMock: vi.fn(),
  getSeasonalProductionMock: vi.fn(),
  navigateMock: vi.fn(),
  cropState: { current: null },
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: getArrivalPressureMock,
  getHistoricalSeasonalProduction: getSeasonalProductionMock,
}));

vi.mock("../app/farmer/components/crops/CropsContext.jsx", () => ({
  useCrops: () => ({
    crops: cropState.current ? [cropState.current] : [],
    loading: false,
    updateCrop: vi.fn(),
    updateCropStatusApi: vi.fn(),
    addCostApi: vi.fn(),
    logHarvestApi: vi.fn(),
    refreshCrops: vi.fn(),
  }),
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

vi.mock("../app/global/api.js", () => ({
  apiPost: vi.fn(async () => ({ ok: true })),
  apiPut: vi.fn(async () => ({ ok: true })),
  parseResponse: vi.fn(async () => ({})),
}));

vi.mock("../app/farmer/components/crops/CropCard.jsx", () => ({
  PhasePill: ({ phase }) => <span>{phase}</span>,
}));

vi.mock("../app/farmer/components/crops/UpdatePhaseDrawer.jsx", () => ({
  UpdatePhaseDrawer: () => null,
}));

vi.mock("../app/farmer/components/shared/WeatherLocationBanner.jsx", () => ({
  WeatherLocationBanner: () => null,
}));

import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";

const crop = {
  id: "CRP-0001",
  commodity: "COM-0025",
  commodityId: "COM-0025",
  commodityName: "Lettuce",
  variant: "Ball",
  phase: "Planning",
  plantingDate: "2026-07-15",
  harvestDate: "2026-11-10",
  harvestQuantity: 600,
  totalCost: 25200,
  currentPrice: 70,
  forecastLower: 65,
  forecastUpper: 75,
  isOnHold: false,
  expenses: [],
};

function renderCropDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/farmer/crops/CRP-0001"]}>
        <Routes>
          <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  cropState.current = crop;
  getArrivalPressureMock.mockResolvedValue({
    status: "processed",
    classification: "High",
    current_arrival_kg: 500,
    record_count: 8,
  });
  getSeasonalProductionMock.mockResolvedValue({
    status: "processed",
    classification: "High",
    quarterly_profiles: [
      { quarter: "Q4", classification: "High", average_production_mt: 120, years_available: 5 },
    ],
  });
});

describe("My Crops detail factor cards", () => {
  it("hides the arrival and seasonal summary cards from the crop detail", async () => {
    renderCropDetail();

    expect(screen.queryByText("Arrival pressure")).not.toBeInTheDocument();
    expect(screen.queryByText("Historical seasonal production")).not.toBeInTheDocument();
    expect(screen.queryByText("View arrivals")).not.toBeInTheDocument();
    expect(screen.queryByText("View production trends")).not.toBeInTheDocument();
    expect(getArrivalPressureMock).not.toHaveBeenCalled();
    expect(getSeasonalProductionMock).not.toHaveBeenCalled();
  });
});
