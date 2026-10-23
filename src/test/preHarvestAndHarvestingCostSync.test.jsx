import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PriceDetailView from "../app/farmer/components/shared/PriceDetailView.jsx";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";
import CropFactorsPage from "../app/farmer/pages/CropFactorsPage.jsx";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    effectiveLanguage: "en",
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

vi.mock("../app/global/api.js", () => ({
  apiPost: vi.fn(async () => ({ ok: true })),
  apiPut: vi.fn(async () => ({ ok: true })),
  apiGet: vi.fn(async () => ({ ok: true })),
  parseResponse: vi.fn(async () => ({})),
}));

vi.mock("../services/api/pricesApi.js", () => ({
  getPriceList: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getPriceOutlook: vi.fn().mockResolvedValue({
    status: "processed",
    crop_stage: "near_harvest",
    reference_price: 68.5,
    comparison_baseline: 65.0,
    forecast_price_change_pct: 5.38,
    price_reference_type: "forecast",
    price_reference_label: "Forecasted Price",
    comparison_baseline_label: "Multi-Year Macro Baseline",
    is_fallback: false,
    forecast_midpoint: 68.5,
    macro_baseline_price: 65.0,
    price_records: [],
    forecast_points: [
      { date: "2026-10-25", price: 68.5, midpoint: 68.5, min: 65.0, max: 72.0 },
    ],
  }),
  getArrivalPressure: vi.fn().mockResolvedValue({ status: "processed" }),
  getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({ status: "processed" }),
}));

const mockCrop = {
  id: "plan-123",
  commodityId: "COM-PECHAY",
  commodity: "COM-PECHAY",
  commodityName: "Chinese Pechay",
  phase: "harvested",
  status: "Harvesting",
  plantingDate: "2026-09-01",
  harvestDate: "2026-10-20",
  harvestQuantity: 600,
  expectedHarvestQty: 600,
  initialCost: 25000,
  addedCosts: 2000,
  totalCost: 27000,
  breakEvenPrice: 45,
  farmgatePrice: 55,
  actualHarvestQty: 450,
  partialHarvestQty: 450,
  productionCosts: [
    { id: "c1", category: "Seeds", amount: 25000, costType: "initial" },
    { id: "c2", category: "Additional", amount: 2000, costType: "additional" },
  ],
};

vi.mock("../app/farmer/components/crops/CropsContext.jsx", async () => {
  const actual = await vi.importActual("../app/farmer/components/crops/CropsContext.jsx");
  return {
    ...actual,
    useCrops: () => ({
      crops: [mockCrop],
      loading: false,
      updateCrop: vi.fn(),
      updateCropStatusApi: vi.fn(),
      addCostApi: vi.fn(),
      logHarvestApi: vi.fn(),
      refreshCrops: vi.fn(),
    }),
  };
});

describe("Pre-Harvest Price Basis & Harvesting Cost / Progress Sync", () => {
  it("renders forecasted price instead of historical fallback when in pre-harvest stage", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PriceDetailView
          commodityId="COM-PECHAY"
          commodityName="Chinese Pechay"
          cropStage="near_harvest"
          expectedHarvestDate="2026-10-25"
          moduleResults={{
            price_outlook_status: "processed",
            price_outlook: "favorable",
            reference_price: 68.5,
            comparison_baseline: 65.0,
            price_change_pct: 5.38,
            price_reference_type: "forecast",
            price_reference_label: "Forecasted Price",
            comparison_baseline_label: "Multi-Year Macro Baseline",
            is_fallback: false,
            forecast_midpoint: 68.5,
            lower_forecast_price: 65.0,
            upper_forecast_price: 72.0,
          }}
        />
      </QueryClientProvider>
    );

    // Verify Forecasted Price card label is displayed
    await waitFor(() => {
      expect(screen.getByText("Forecasted Price")).toBeInTheDocument();
    });

    // Verify Forecasting badge is displayed, not Historical Fallback
    expect(screen.getByText("Forecasting")).toBeInTheDocument();
    expect(screen.queryByText("Historical Fallback")).not.toBeInTheDocument();

    // Verify Stage 3: Near Harvest sublabel is displayed
    expect(screen.getByText("Stage 3: Near Harvest")).toBeInTheDocument();
  });

  it("displays partial harvest progress and remaining expected quantity in harvesting stage", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/plan-123"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Check Total recorded cost reflects added costs (P27,000)
    expect(screen.getAllByText("₱27,000").length).toBeGreaterThanOrEqual(1);

    // Check Added costs line exists
    expect(screen.getByText("+₱2,000")).toBeInTheDocument();

    // Check Cost to recover per kg (Math.ceil(27000 / 600) = 45)
    expect(screen.getAllByText("₱45/kg").length).toBeGreaterThanOrEqual(1);

    // Check Harvest progress inputs
    expect(screen.getByLabelText("Qty harvested (kg)")).toHaveValue(450);
    // Remaining expected: 600 - 450 = 150
    expect(screen.getByLabelText("Remaining expected (kg)")).toHaveValue(150);
  });

  it("aligns Assessment Result in CropFactorsPage with Avoid for Now crop recommendation", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={[
            {
              pathname: "/farmer/crops/plan-123/factors",
              state: {
                advisoryCode: "avoid_for_now",
                advisoryLabel: "Avoid for Now",
              },
            },
          ]}
        >
          <Routes>
            <Route path="/farmer/crops/:cropId/factors" element={<CropFactorsPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Header must show Assessment Result: Avoid for Now
    expect(screen.getByText("Assessment Result:")).toBeInTheDocument();
    expect(screen.getByText("Avoid for Now")).toBeInTheDocument();
    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
  });
});
