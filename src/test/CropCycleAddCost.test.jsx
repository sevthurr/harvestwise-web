import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeCropPlan } from "../app/farmer/components/crops/CropsContext.jsx";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";

const cropState = { current: null };
const addCostApiMock = vi.fn();
const saveHarvestRecordApiMock = vi.fn();

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

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
  getHistoricalSeasonalProduction: vi.fn().mockResolvedValue({ status: "processed", classification: "Moderate" }),
}));

describe("normalizeCropPlan cost calculation", () => {
  it("separates initial costs and additional costs, and correctly sums totalCost and breakEvenPrice", () => {
    const raw = {
      id: "CRP-001",
      commodity_id: "COM-001",
      status: "Planning",
      expected_harvest_qty: 600,
      production_costs: [
        { id: "PDC-1", category: "Seeds", amount: 10000, cost_type: "initial" },
        { id: "PDC-2", category: "Fertilizer", amount: 16000, cost_type: "initial" },
        { id: "PDC-3", category: "Additional", amount: 500, cost_type: "additional" },
        { id: "PDC-4", category: "Additional", amount: 300, cost_type: "additional" },
      ],
    };

    const normalized = normalizeCropPlan(raw);
    expect(normalized.initialCost).toBe(26000);
    expect(normalized.addedCosts).toBe(800);
    expect(normalized.totalCost).toBe(26800);
    // 26800 / 600 = 44.666 -> Math.ceil -> 45
    expect(normalized.breakEvenPrice).toBe(45);
    expect(normalized.productionCosts).toHaveLength(4);
    expect(normalized.productionCosts.filter((c) => c.costType === "additional")).toHaveLength(2);
  });

  it("sorts dated harvest entries and exposes their cumulative quantity", () => {
    const normalized = normalizeCropPlan({
      id: "CRP-002",
      commodity_id: "COM-001",
      status: "Harvesting",
      expected_harvest_qty: 600,
      harvest_records: [
        { id: "HVR-1", actual_harvest_date: "2026-11-15", actual_harvest_qty: 125, actual_selling_price_per_kg: 90, created_at: "2026-11-15T08:00:00Z" },
        { id: "HVR-2", actual_harvest_date: "2026-11-18", actual_harvest_qty: 80, actual_selling_price_per_kg: 120, created_at: "2026-11-18T08:00:00Z" },
      ],
    });

    expect(normalized.actualHarvestQty).toBe(205);
    expect(normalized.actualHarvestRevenue).toBe(20850);
    expect(normalized.actualSellingPrice).toBeCloseTo(101.7073, 4);
    expect(normalized.harvestRecords.map((record) => record.id)).toEqual(["HVR-2", "HVR-1"]);
    expect(normalized.actualHarvestDate).toBe("Nov 18, 2026");
  });
});

describe("CropCycleDetailPage Add Cost flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits added cost to addCostApi and displays added cost records", async () => {
    const user = userEvent.setup();
    cropState.current = {
      id: "CRP-0001",
      commodity: "COM-0025",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      variant: "Ball",
      phase: "Growing",
      status: "Planted",
      plantingDate: "2026-07-15",
      harvestDate: "2026-11-10",
      harvestQuantity: 600,
      initialCost: 26000,
      addedCosts: 500,
      totalCost: 26500,
      breakEvenPrice: 45,
      productionCosts: [
        { id: "PDC-1", category: "Initial Total", amount: 26000, costType: "initial" },
        { id: "PDC-2", category: "Additional", amount: 500, costType: "additional", createdAt: "2026-08-01T00:00:00Z" },
      ],
      currentPrice: 70,
      isOnHold: false,
    };

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/crops/CRP-0001"]}>
          <Routes>
            <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Initial state check
    expect(screen.getByText("₱26,000")).toBeInTheDocument(); // Estimated cost
    expect(screen.getByText("₱500")).toBeInTheDocument(); // Added costs
    expect(screen.getAllByText("₱26,500").length).toBeGreaterThanOrEqual(1); // Total recorded cost
    expect(screen.getByText("Added cost records")).toBeInTheDocument();
    expect(screen.getByText("1 entry")).toBeInTheDocument();
    const recordsToggle = screen.getByRole("button", { name: /Added cost records 1 entry/i });
    expect(recordsToggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();

    await user.click(recordsToggle);
    expect(recordsToggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Aug 1, 2026")).not.toBeInTheDocument();

    await user.click(recordsToggle);
    expect(screen.getByText("Aug 1, 2026")).toBeInTheDocument();

    // Click Add cost
    const addCostBtn = screen.getByRole("button", { name: /add cost/i });
    await user.click(addCostBtn);

    // Enter a new amount
    const input = screen.getByPlaceholderText("e.g. 500");
    await user.type(input, "300");

    // Click submit
    addCostApiMock.mockResolvedValueOnce({ id: "PDC-3", amount: 300 });
    const submitBtn = screen.getByRole("button", { name: "" }); // Check icon button
    await user.click(submitBtn);

    expect(addCostApiMock).toHaveBeenCalledWith("CRP-0001", {
      category: "Others",
      amount: 300,
      costType: "additional",
    });
  });

  it("saves a dated harvest entry from the check button", async () => {
    const user = userEvent.setup();
    cropState.current = {
      id: "CRP-0002",
      commodity: "COM-0025",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      variant: "Ball",
      phase: "harvested",
      status: "Harvesting",
      harvestQuantity: 600,
      harvestRecords: [],
      initialCost: 26000,
      totalCost: 26000,
      productionCosts: [],
      isOnHold: false,
    };
    saveHarvestRecordApiMock.mockResolvedValueOnce({ id: "HVR-1" });

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

    fireEvent.change(screen.getByLabelText("Harvest date"), { target: { value: "2026-11-20" } });
    await user.type(screen.getByLabelText("Qty (kg)"), "125");
    await user.type(screen.getByLabelText("Price (₱/kg)"), "85");
    await user.click(screen.getByRole("button", { name: "Save harvest entry" }));

    await waitFor(() => {
      expect(saveHarvestRecordApiMock).toHaveBeenCalledWith("CRP-0002", "2026-11-20", 125, 85);
    });
  });

  it("renders sections in the expected order: Harvest progress immediately above Estimated Profit, followed by weekly actions and Cost and selling price", () => {
    cropState.current = {
      id: "CRP-0002",
      commodity: "COM-0025",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      variant: "Ball",
      phase: "harvested",
      status: "Harvesting",
      harvestQuantity: 600,
      harvestRecords: [
        { id: "HVR-1", actualHarvestDate: "2026-10-29", actualHarvestQty: 300, actualSellingPricePerKg: null }
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
        { text: "Panalipdi ang naani gikan sa ulan ug kaumog." }
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

    const harvestProgressSection = screen.getByText("Harvest progress");
    const estimatedProfitSection = screen.getByText("Estimated Profit");
    const weeklyActionsSection = screen.getByText("What to do this week");
    const costAndSellingSection = screen.getByText("Cost and selling price");

    expect(harvestProgressSection).toBeInTheDocument();
    expect(estimatedProfitSection).toBeInTheDocument();
    expect(weeklyActionsSection).toBeInTheDocument();
    expect(costAndSellingSection).toBeInTheDocument();

    // Verify ordering: harvestProgress before estimatedProfit, before weeklyActions, before costAndSelling
    expect(harvestProgressSection.compareDocumentPosition(estimatedProfitSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(estimatedProfitSection.compareDocumentPosition(weeklyActionsSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(weeklyActionsSection.compareDocumentPosition(costAndSellingSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("accumulates multiple added costs as separate records that add up into total cost", () => {
    const raw = {
      id: "CRP-001",
      commodity_id: "COM-001",
      status: "Planning",
      expected_harvest_qty: 600,
      production_costs: [
        { id: "PDC-1", category: "Initial Total", amount: 26000, cost_type: "initial" },
      ],
    };

    let normalized = normalizeCropPlan(raw);
    expect(normalized.initialCost).toBe(26000);
    expect(normalized.addedCosts).toBe(0);
    expect(normalized.totalCost).toBe(26000);

    // First added cost: 500
    raw.production_costs.push({
      id: "PDC-2",
      category: "Additional",
      amount: 500,
      cost_type: "additional",
      created_at: "2026-10-20T10:00:00Z",
    });

    normalized = normalizeCropPlan(raw);
    expect(normalized.initialCost).toBe(26000);
    expect(normalized.addedCosts).toBe(500);
    expect(normalized.totalCost).toBe(26500);
    expect(normalized.productionCosts).toHaveLength(2);

    // Second added cost: 300 - must add up as a new record, not overwrite
    raw.production_costs.push({
      id: "PDC-3",
      category: "Additional",
      amount: 300,
      cost_type: "additional",
      created_at: "2026-10-21T10:00:00Z",
    });

    normalized = normalizeCropPlan(raw);
    expect(normalized.initialCost).toBe(26000);
    expect(normalized.addedCosts).toBe(800); // 500 + 300
    expect(normalized.totalCost).toBe(26800); // 26000 + 800
    expect(normalized.breakEvenPrice).toBe(45); // Math.ceil(26800 / 600)
    expect(normalized.productionCosts).toHaveLength(3);
    const addedList = normalized.productionCosts.filter((c) => c.costType === "additional");
    expect(addedList).toHaveLength(2);
    expect(addedList[0].amount).toBe(500);
    expect(addedList[1].amount).toBe(300);
  });
});
