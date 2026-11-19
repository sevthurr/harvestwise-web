import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { navigateMock, apiPostMock, apiPutMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("../app/farmer/components/crops/CropsContext.jsx", () => ({
  useCrops: () => ({
    crops: [],
    addCrop: vi.fn(),
    refreshCrops: vi.fn(),
  }),
  normalizeCropPlan: (p) => p || {},
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

const { parseResponseMock } = vi.hoisted(() => ({
  parseResponseMock: vi.fn(async () => ({})),
}));

vi.mock("../app/global/api.js", () => ({
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  parseResponse: parseResponseMock,
}));

vi.mock("../app/farmer/components/shared/WeatherLocationBanner.jsx", () => ({
  WeatherLocationBanner: () => null,
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", () => ({
  CommodityIllustration: () => <span data-testid="commodity-illustration" />,
}));

vi.mock("../app/farmer/components/recommend/useCommodityCatalog.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useCommodityCatalog: () => ({
      options: [],
      isLoading: false,
      catalog: [],
    }),
  };
});

import { RecommendationResult } from "../app/farmer/components/recommend/RecommendationResult.jsx";

const advisoryResponse = {
  crop_stage: "before_planting",
  module_results: { price_outlook: "Favorable" },
  advisory: {
    advisory: "recommended",
    module_contributions: [],
    hard_vetoes: [],
    action_guidance: [],
  },
};

// Mirrors the wizard state: Step1CropSchedule stores the picked crop as the
// catalog icon key in `commodity` and the real commodity id in `commodityId`.
const baseData = {
  commodity: "lettuce",
  commodityId: "COM-0025",
  variant: "Ball",
  plantingDate: "2026-10-20",
  harvestDate: "2026-12-01",
  harvestWindowStart: "2026-12-18",
  harvestWindowEnd: "2026-12-22",
  farmArea: 500,
  harvestQuantity: 600,
  costMethod: "simple",
  simpleCost: 25200,
  useFarmgate: true,
  farmgatePrice: 70,
  expenses: [],
};

function renderResult(data, extraProps = {}) {
  return render(
    <RecommendationResult
      data={data}
      advisoryResponse={advisoryResponse}
      onEdit={() => {}}
      onCompareAnother={() => {}}
      {...extraProps}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiPostMock.mockResolvedValue({ ok: true });
  parseResponseMock.mockResolvedValue({});
});

describe("RecommendationResult — View basis navigation", () => {
  it("shows the selected harvest window and formats both dates consistently", () => {
    renderResult(baseData);

    expect(screen.getByText("Oct 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("Dec 18, 2026 — Dec 22, 2026")).toBeInTheDocument();
  });

  it("passes the real commodity id, not the catalog icon key, to the factors page", () => {
    renderResult(baseData);

    fireEvent.click(screen.getByText("View basis →"));

    expect(navigateMock).toHaveBeenCalledWith(
      "/farmer/assess/factors",
      expect.objectContaining({
        state: expect.objectContaining({ commodityId: "COM-0025" }),
      })
    );
    const [, options] = navigateMock.mock.calls[0];
    expect(options.state.commodityId).not.toBe("lettuce");
  });

  it("keeps a commodity id when the wizard only carries one (resumed draft / ?commodity=)", () => {
    renderResult({ ...baseData, commodity: "COM-0025", commodityId: undefined });

    fireEvent.click(screen.getByText("View basis →"));

    expect(navigateMock).toHaveBeenCalledWith(
      "/farmer/assess/factors",
      expect.objectContaining({
        state: expect.objectContaining({ commodityId: "COM-0025" }),
      })
    );
  });

  it("proceeds directly to My Crops module when Save to My Crops is clicked", async () => {
    renderResult(baseData);

    const saveBtn = screen.getByRole("button", { name: /Save to My Crops/i });
    fireEvent.click(saveBtn);

    await vi.waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        "/farmer/crops",
        expect.objectContaining({
          state: expect.objectContaining({
            message: expect.stringContaining("saved as a crop plan"),
          }),
        })
      );
    });
  });

  it("toggles collapsible 'Why this recommendation?' factors card", async () => {
    renderResult(baseData);

    const toggle = screen.getByRole("button", { name: /Why this recommendation\?|Ngano kini nga tambag\?/i });
    expect(toggle).toBeInTheDocument();

    // Initially collapsed: main reasons not visible
    expect(screen.queryByText(/Main reasons|Pangunang mga rason/i)).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggle);
    expect(screen.getByText(/Main reasons|Pangunang mga rason/i)).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggle);
    expect(screen.queryByText(/Main reasons|Pangunang mga rason/i)).not.toBeInTheDocument();
  });
});

describe("RecommendationResult — offline save (Problem 1)", () => {
  const offlineCopy = "You can view crop plans offline. Creating or updating one needs an internet connection — reconnect and tap again.";

  it("shows the view-only notice with zero taps and sends no crop-plan write on save", async () => {
    const originalOnLine = navigator.onLine;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      renderResult(baseData, { isOffline: true });
      expect(screen.getByRole("status")).toHaveTextContent(offlineCopy);

      // The mount autosave is a draft and must still be reachable offline.
      expect(apiPostMock.mock.calls.some((c) => c[0] === "/crop-plans/draft")).toBe(true);

      const saveBtn = screen.getByRole("button", { name: /Save to My Crops/i });
      expect(saveBtn).not.toBeDisabled();
      fireEvent.click(saveBtn);

      // Only the exact non-draft path is a forbidden offline write.
      expect(apiPostMock.mock.calls.filter((c) => c[0] === "/crop-plans")).toHaveLength(0);
      expect(apiPutMock).not.toHaveBeenCalled();
      await vi.waitFor(() => {
        expect(screen.getAllByText(offlineCopy).length).toBeGreaterThanOrEqual(2);
      });
    } finally {
      Object.defineProperty(navigator, "onLine", { value: originalOnLine, configurable: true });
    }
  });

  it("updates the view-only notice from connectivity events", () => {
    renderResult(baseData);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent(window, new Event("offline"));
    expect(screen.getByRole("status")).toHaveTextContent(offlineCopy);

    fireEvent(window, new Event("online"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps backend field message on 422 errors", async () => {
    const err = new Error("commodity is required");
    err.status = 422;
    parseResponseMock.mockRejectedValueOnce(err);
    renderResult(baseData);

    const saveBtn = screen.getByRole("button", { name: /Save to My Crops/i });
    fireEvent.click(saveBtn);

    await vi.waitFor(() => {
      expect(screen.getByText("commodity is required")).toBeInTheDocument();
    });
    const saveCalls = apiPostMock.mock.calls.filter((c) => c[0] === "/crop-plans");
    expect(saveCalls.length).toBeGreaterThanOrEqual(1);
  });
});
