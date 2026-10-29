import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";
import { t as translate } from "../app/global/i18n";

const cropState = { current: null };
const saveHarvestRecordApiMock = vi.fn();
const addCostApiMock = vi.fn();

vi.mock("../app/farmer/components/crops/CropsContext.jsx", async () => {
  const actual = await vi.importActual("../app/farmer/components/crops/CropsContext.jsx");
  return {
    ...actual,
    useCrops: () => ({
      crops: cropState.current ? [cropState.current] : [],
      loading: false,
      updateCrop: vi.fn(),
      updateCropStatusApi: vi.fn(),
      addCostApi: addCostApiMock,
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

vi.mock("../app/farmer/components/crops/UpdatePhaseDrawer.jsx", () => ({
  UpdatePhaseDrawer: () => null,
}));

vi.mock("../app/farmer/components/shared/WeatherLocationBanner.jsx", () => ({
  WeatherLocationBanner: () => null,
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
  getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
}));

describe("HarvestWise Farmer Dashboard Sections Ordering (Bisaya/Cebuano)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies expected section order: 1. Progreso sa pag-ani, 2. Tansya sa Kita, 3. Unsa akong buhaton karon nga semanaha, 4. Gasto ug presyo sa pagbaligya", async () => {
    cropState.current = {
      id: "CRP-0002",
      commodity: "COM-0025",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      variant: "Ball",
      phase: "harvested",
      status: "Harvesting",
      harvestQuantity: 3000,
      harvestRecords: [
        { id: "HVR-1", actualHarvestDate: "2026-10-29", actualHarvestQty: 300, actualSellingPricePerKg: null },
      ],
      initialCost: 25000,
      totalCost: 25000,
      productionCosts: [],
      isOnHold: false,
      farmgatePrice: 30,
      breakEvenPrice: 9,
      profitLower: 53000,
      profitUpper: 70000,
      weeklyActions: [
        { text: "Susiha ang karon nga presyo ug ang 7 ka adlaw nga tagna." },
        { text: "Itandi ang presyo sa palengke ug presyo sa komprador." },
        { text: "Panalipdi ang naani gikan sa ulan ug kaumog." },
      ],
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0002"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. Confirm section titles are present with exact Bisaya labels
    const harvestProgressHeading = screen.getByText("Progreso sa pag-ani");
    const estimatedProfitHeading = screen.getByText("Tansya sa Kita");
    const weeklyActionsHeading = screen.getByText("Unsa akong buhaton karon nga semanaha");
    const costAndSellingHeading = screen.getByText("Gasto ug presyo sa pagbaligya");

    expect(harvestProgressHeading).toBeInTheDocument();
    expect(estimatedProfitHeading).toBeInTheDocument();
    expect(weeklyActionsHeading).toBeInTheDocument();
    expect(costAndSellingHeading).toBeInTheDocument();

    // 2. Confirm order: Progreso sa pag-ani appears IMMEDIATELY before Tansya sa Kita
    expect(harvestProgressHeading.compareDocumentPosition(estimatedProfitHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(estimatedProfitHeading.compareDocumentPosition(weeklyActionsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weeklyActionsHeading.compareDocumentPosition(costAndSellingHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 3. Confirm contents of "Progreso sa pag-ani":
    // Date input, Qty input, Price input, Save button, total harvested, harvest records
    expect(screen.getByLabelText("Petsa sa ani")).toBeInTheDocument();
    expect(screen.getByLabelText("Kadaghanon (kg)")).toBeInTheDocument();
    expect(screen.getByLabelText("Presyo (₱/kg)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I-save ang rekord sa ani" })).toBeInTheDocument();
    expect(screen.getByText("Kinatibuk-ang kadaghanon")).toBeInTheDocument();
    expect(screen.getAllByText("300 kg")).toHaveLength(2);

    // 4. Confirm contents of "Tansya sa Kita":
    // Profit range, basis, and metrics
    expect(screen.getByText("₱53,000 – ₱70,000")).toBeInTheDocument();
    expect(screen.getByText("Tansya sa Gasto")).toBeInTheDocument();
    expect(screen.getByText("Gilaom nga Ani")).toBeInTheDocument();
    expect(screen.getByText("Basehan sa Presyo")).toBeInTheDocument();
    expect(screen.getByText("Gasto aron makabawi")).toBeInTheDocument();

    // 5. Test saving a harvest record
    const user = userEvent.setup();
    fireEvent.change(screen.getByLabelText("Petsa sa ani"), { target: { value: "2026-10-30" } });
    await user.type(screen.getByLabelText("Kadaghanon (kg)"), "150");
    await user.type(screen.getByLabelText("Presyo (₱/kg)"), "85");
    saveHarvestRecordApiMock.mockResolvedValueOnce({ id: "HVR-2" });
    await user.click(screen.getByRole("button", { name: "I-save ang rekord sa ani" }));

    await waitFor(() => {
      expect(saveHarvestRecordApiMock).toHaveBeenCalledWith("CRP-0002", "2026-10-30", 150, 85);
    });
  });
  it("toggles advisory card and 'Why this recommendation' collapsible sections", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0002"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // 1. "Why this recommendation?" toggle exists
    const whyToggle = screen.getByRole("button", { name: /Ngano kini nga tambag\?|Why this recommendation\?/i });
    expect(whyToggle).toBeInTheDocument();

    // Factors and View basis button are initially collapsed
    expect(screen.queryByText(/Tan-awa ang basehan|View basis/i)).not.toBeInTheDocument();

    // 2. Click to expand "Why this recommendation?"
    await user.click(whyToggle);
    expect(screen.getByText(/Tan-awa ang basehan|View basis/i)).toBeInTheDocument();

    // 3. Click again to collapse
    await user.click(whyToggle);
    expect(screen.queryByText(/Tan-awa ang basehan|View basis/i)).not.toBeInTheDocument();

    // 4. Advisory card header can collapse entire advice body
    const cardToggle = screen.getByRole("button", { name: /Maayo ang Kondisyon|Ayaw sa e ani karon|Ayaw Sa Itanom Karon|Pwede Padayon/i });
    await user.click(cardToggle);
    expect(screen.queryByRole("button", { name: /Ngano kini nga tambag\?|Why this recommendation\?/i })).not.toBeInTheDocument();

    // Click again to re-expand entire card
    await user.click(cardToggle);
    expect(screen.getByRole("button", { name: /Ngano kini nga tambag\?|Why this recommendation\?/i })).toBeInTheDocument();
  });
  it("displays 'Ayaw sa e ani karon' (Cebuano) or 'Avoid for Now' (English) when crop is in harvesting stage and advisory is high risk", () => {
    cropState.current = {
      id: "CRP-0021",
      farmerId: "FRM-0012",
      commodityId: "COM-0001",
      commodityName: "Atsal",
      variant: "Smooth Cayenne",
      status: "Harvesting",
      phase: "harvested",
      advisoryCategory: "avoid_for_now",
      harvestQuantity: 3000,
      expectedHarvestQty: 3000,
      harvestRecords: [],
      initialCost: 25000,
      totalCost: 25000,
      productionCosts: [],
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

    // In Cebuano, when in harvesting stage, the badge must display 'Ayaw sa e ani karon'
    expect(screen.getByText("Ayaw sa e ani karon")).toBeInTheDocument();
    expect(screen.queryByText("Ayaw Sa Itanom Karon")).not.toBeInTheDocument();
  });
  it("does not display 'What to do this week' / 'Unsa akong buhaton karon nga semanaha' when crop is completed", () => {
    cropState.current = {
      id: "CRP-0099",
      farmerId: "FRM-0012",
      commodityId: "COM-0001",
      commodityName: "Atsal",
      variant: "Smooth Cayenne",
      status: "Completed",
      phase: "completed",
      harvestQuantity: 3000,
      actualHarvestQty: 2900,
      actualSellingPrice: 85,
      totalCost: 25000,
      plantingDate: "2026-05-01",
      harvestDate: "2026-10-29",
      weeklyActions: [
        { text: "Check drainage and crop condition." },
        { text: "Update added costs if you have new inputs." },
        { text: "Monitor weather and price changes." },
      ],
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0099"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Weekly actions / "What to do this week" must be hidden in completed status
    expect(screen.queryByText(/Unsa akong buhaton karon nga semanaha|What to do this week/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Check drainage and crop condition.")).not.toBeInTheDocument();
    expect(screen.queryByText("Update added costs if you have new inputs.")).not.toBeInTheDocument();
    expect(screen.queryByText("Monitor weather and price changes.")).not.toBeInTheDocument();

    // Active cards should also be hidden
    expect(screen.queryByText("Progreso sa pag-ani")).not.toBeInTheDocument();
    expect(screen.queryByText("Tansya sa Kita")).not.toBeInTheDocument();
    expect(screen.queryByText("Gasto ug presyo sa pagbaligya")).not.toBeInTheDocument();

    // Completed harvest summary should be present
    expect(screen.getByText(/Katingbanan sa ani|Harvest summary/i)).toBeInTheDocument();
  });
});
