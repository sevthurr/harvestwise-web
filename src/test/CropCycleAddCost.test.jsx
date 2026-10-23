import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { normalizeCropPlan } from "../app/farmer/components/crops/CropsContext.jsx";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail.jsx";

const cropState = { current: null };
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
      category: "Additional",
      amount: 300,
      costType: "additional",
    });
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
