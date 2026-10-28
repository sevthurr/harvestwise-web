/**
 * Step 1 harvest window behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../app/farmer/components/recommend/useCommodityCatalog.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useCommodityCatalog: vi.fn(),
    durationForOption: vi.fn(),
  };
});

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params, fallback) => {
      const table = {
      };
      return table[key] ?? fallback ?? key;
    },
  }),
}));

vi.mock("../app/farmer/components/recommend/PlantingActivityContext.jsx", () => ({
  PlantingActivityContext: () => null,
}));

const { durationForOption, useCommodityCatalog } = await import("../app/farmer/components/recommend/useCommodityCatalog.js");
const { Step1CropSchedule } = await import("../app/farmer/components/recommend/Step1CropSchedule.jsx");

const BASE = {
  commodity: "",
  variant: "",
  plantingDate: "2026-10-01",
  harvestDate: "",
  commodityId: "COM-0003",
};

function renderStep1(data) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Step1CropSchedule data={{ ...BASE, ...data }} onChange={() => {}} errors={{}} />
    </QueryClientProvider>
  );
}

describe("Step1CropSchedule harvest window", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommodityCatalog.mockReturnValue({
      isLoading: false,
      options: [{ id: "ampalaya", name: "Ampalaya", varieties: ["Galaxy"], varietyMap: { galaxy: "COM-0003" }, defaultCommodityId: "COM-0003" }],
    });
  });

  it("renders the suggested harvest window as helper text", () => {
    durationForOption.mockReturnValue({ min: 48, max: 52, basis: "DAT" });
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    expect(screen.getByText(/November 18, 2026 – November 22, 2026/)).toBeDefined();
    expect(screen.queryByText(/Typical duration:/)).toBeNull();
  });

  it("hides the helper text when no duration is available from either source", () => {
    // Neither the API nor CROP_DURATIONS knows this commodity, so no range
    // can be displayed.
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "saba", variant: "" });
    expect(screen.queryByText(/Harvest Window:/)).toBeNull();
  });

  it("uses the variety duration to suggest the harvest window", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    expect(screen.getByText(/November 18, 2026 – November 22, 2026/)).toBeDefined();
  });

  it("uses the crop-wide fallback when the variety is unknown", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "lettuce", variant: "Curly" });
    expect(screen.getByText(/November 15, 2026 – November 30, 2026/)).toBeDefined();
  });
});
