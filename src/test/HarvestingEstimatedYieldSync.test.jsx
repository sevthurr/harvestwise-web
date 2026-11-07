import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";
import { UpdatePhaseDrawer } from "../app/farmer/components/crops/UpdatePhaseDrawer";
import { t as translate } from "../app/global/i18n";

const cropState = { current: null };
const saveHarvestRecordApiMock = vi.fn();
const updateCropStatusApiMock = vi.fn();

vi.mock("../app/farmer/components/crops/CropsContext.jsx", async () => {
  const actual = await vi.importActual("../app/farmer/components/crops/CropsContext.jsx");
  return {
    ...actual,
    useCrops: () => ({
      crops: cropState.current ? [cropState.current] : [],
      loading: false,
      updateCrop: (id, patch) => {
        if (cropState.current && cropState.current.id === id) {
          cropState.current = { ...cropState.current, ...patch };
        }
      },
      updateCropStatusApi: updateCropStatusApiMock,
      addCostApi: vi.fn(),
      logHarvestApi: vi.fn(),
      saveHarvestRecordApi: saveHarvestRecordApiMock,
      refreshCrops: vi.fn(),
    }),
  };
});

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "ceb",
    t: (key, params = {}, fallback = key) => {
      const res = translate(key, params, "ceb");
      if (res === key && fallback) return fallback;
      return res;
    },
    formatCurrency: (val) => `₱${Number(val).toLocaleString()}`,
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

vi.mock("../app/farmer/components/shared/WeatherLocationBanner.jsx", () => ({
  WeatherLocationBanner: () => null,
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
  getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
}));

describe("Harvesting Stage → Quantity to Harvest based on Estimated Yield", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UpdatePhaseDrawer displays Estimated Yield automatically as Quantity to Harvest without manual input requirement", () => {
    const carrotCrop = {
      id: "crop-100",
      commodity: "carrots",
      commodityName: "Carrots",
      phase: "pre-harvest",
      status: "Pre-Harvest",
      harvestQuantity: 3000,
      expectedHarvestQty: 3000,
      rawHarvestDate: "2026-10-29",
      productionCosts: [],
    };

    render(
      <MemoryRouter>
        <UpdatePhaseDrawer
          open={true}
          crop={carrotCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </MemoryRouter>
    );

    // Click on "Pag-ani" (Harvesting) phase option
    const harvestingOption = screen.getByText("Pag-ani");
    fireEvent.click(harvestingOption);

    // Quantity to Harvest should automatically show 3,000 kg based on Estimated Yield
    expect(screen.getByText("3,000 kg")).toBeInTheDocument();
    expect(screen.getByText("Gibase sa Gibanabana nga Ani")).toBeInTheDocument();

    // Verify there is NO manual input for quantity in the drawer
    expect(screen.queryByPlaceholderText("e.g. 580")).not.toBeInTheDocument();
  });

  it("Upon entering Harvesting stage, Remaining Yield to Harvest equals Estimated Yield and deducts each harvest entry while blocking exceeding quantities", async () => {
    cropState.current = {
      id: "CRP-0002",
      commodity: "COM-0025",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      variant: "Ball",
      phase: "harvested",
      status: "Harvesting",
      harvestQuantity: 3000,
      expectedHarvestQty: 3000,
      harvestRecords: [], // Newly entered harvesting stage
      initialCost: 25000,
      totalCost: 25000,
      productionCosts: [],
      isOnHold: false,
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0002"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Initial State: Remaining Yield to Harvest = Estimated Yield (3,000 kg)
    expect(screen.getByText(/Nabilin nga gilaom \(kg\):\s*3000/i)).toBeInTheDocument();

    const dateInput = screen.getByLabelText("Petsa sa ani");
    const qtyInput = screen.getByLabelText("Kadaghanon (kg)");
    const priceInput = screen.getByLabelText("Presyo (₱/kg)");
    const saveButton = screen.getByRole("button", { name: "I-save ang rekord sa ani" });

    // 2. Prevent entry exceeding remaining quantity (e.g. 3,500 kg when 3,000 kg remains)
    const user = userEvent.setup();
    fireEvent.change(dateInput, { target: { value: "2026-10-29" } });
    await user.type(qtyInput, "3500");
    await user.type(priceInput, "85");

    // Save button must be disabled because 3,500 > 3,000
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/Dili puwede molapas sa nabilin nga ani \(3000 kg\)/i)).toBeInTheDocument();

    // 3. Enter valid harvest entry (300 kg)
    await user.clear(qtyInput);
    await user.type(qtyInput, "300");

    // Button should now be enabled
    expect(saveButton).not.toBeDisabled();

    // Submit harvest record
    saveHarvestRecordApiMock.mockResolvedValueOnce({
      id: "HVR-1",
      actualHarvestDate: "2026-10-29",
      actualHarvestQty: 300,
      actualSellingPricePerKg: 85,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(saveHarvestRecordApiMock).toHaveBeenCalledWith("CRP-0002", "2026-10-29", 300, 85);
    });

    // 4. Remaining quantity is recalculated: 3,000 - 300 = 2,700 kg
    expect(screen.getByText(/Nabilin nga gilaom \(kg\):\s*2700/i)).toBeInTheDocument();
    expect(screen.getAllByText("300 kg")).toHaveLength(2);

    // 5. Test next harvest entry exceeding the new remaining quantity (e.g. 2,800 kg when 2,700 kg remains)
    await user.type(qtyInput, "2800");
    await user.type(priceInput, "90");
    expect(saveButton).toBeDisabled();
    expect(screen.getByText(/Dili puwede molapas sa nabilin nga ani \(2700 kg\)/i)).toBeInTheDocument();
  });
  it("correctly handles raw snake_case API responses with decimal strings and avoids NaN kg", async () => {
    const user = userEvent.setup();
    cropState.current = {
      id: "CRP-0021",
      farmerId: "FRM-0012",
      commodityId: "COM-0036",
      commodityName: "Kamatis",
      status: "Harvesting",
      phase: "harvested",
      harvestQuantity: 3000,
      expectedHarvestQty: 3000,
      harvestRecords: [],
      initialCost: 25000,
      totalCost: 25000,
      expectedFarmgatePrice: 80,
      breakevenPricePerKg: 9,
      isOnHold: false,
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0021"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const qtyInput = screen.getByLabelText("Kadaghanon (kg)");
    const priceInput = screen.getByLabelText("Presyo (₱/kg)");
    const saveButton = screen.getByRole("button", { name: "I-save ang rekord sa ani" });

    await user.type(qtyInput, "500");
    await user.type(priceInput, "85");

    // Mock API returning raw snake_case object with decimal strings as returned by FastAPI
    saveHarvestRecordApiMock.mockResolvedValueOnce({
      id: "HVR-0010",
      crop_plan_id: "CRP-0021",
      actual_harvest_date: "2026-10-29",
      actual_harvest_qty: "500.00",
      actual_selling_price_per_kg: "85.00",
      created_at: "2026-10-29T08:56:18.312288",
    });

    await user.click(saveButton);

    await waitFor(() => {
      expect(saveHarvestRecordApiMock).toHaveBeenCalledWith("CRP-0021", "2026-10-29", 500, 85);
    });

    // Verify NaN kg is NOT in the document
    expect(screen.queryByText(/NaN\s*kg/i)).not.toBeInTheDocument();

    // Verify the record row and total row display 500 kg
    expect(screen.getAllByText("500 kg")).toHaveLength(2);
    expect(screen.getByText("₱85.00/kg")).toBeInTheDocument();

    // Remaining yield is updated: 3,000 - 500 = 2,500 kg
    expect(screen.getByText(/Nabilin nga gilaom \(kg\):\s*2500/i)).toBeInTheDocument();
  });
});

