import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { navigateMock, apiPostMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  apiPostMock: vi.fn(),
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
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

vi.mock("../app/global/api.js", () => ({
  apiPost: apiPostMock,
  parseResponse: vi.fn(async () => ({})),
}));

vi.mock("../app/farmer/components/shared/WeatherLocationBanner.jsx", () => ({
  WeatherLocationBanner: () => null,
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", () => ({
  CommodityIllustration: () => <span data-testid="commodity-illustration" />,
}));

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
  farmArea: 500,
  harvestQuantity: 600,
  costMethod: "simple",
  simpleCost: 25200,
  useFarmgate: true,
  farmgatePrice: 70,
  expenses: [],
};

function renderResult(data) {
  return render(
    <RecommendationResult
      data={data}
      advisoryResponse={advisoryResponse}
      onEdit={() => {}}
      onCompareAnother={() => {}}
    />
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiPostMock.mockResolvedValue({ ok: true });
});

describe("RecommendationResult — View basis navigation", () => {
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
});
