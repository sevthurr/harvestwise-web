/**
 * Step 1 duration chip behaviour.
 *
 * The chip used to stay on screen with a "-" placeholder when the API had no
 * duration for the selected variety, which read as broken to farmers. It now
 * hides instead, and the label comes from the API catalog first with the
 * CROP_DURATIONS table only as a fallback.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("./useCommodityCatalog", () => ({
  useCommodityCatalog: vi.fn(),
  durationForOption: vi.fn(),
}));

vi.mock("../../../global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params, fallback) => {
      const table = {
        "farmer.assess.typical_duration": `Typical duration: ${params?.label}`,
        "farmer.assess.duration_ampalaya": "45–75 days",
        "farmer.assess.duration_ampalaya_galaxy": "48–52 days",
        "farmer.assess.duration_lettuce": "45–60 days",
      };
      return table[key] ?? fallback ?? key;
    },
  }),
}));

vi.mock("./PlantingActivityContext", () => ({
  PlantingActivityContext: () => null,
}));

const { durationForOption, useCommodityCatalog } = await import("./useCommodityCatalog.js");
const { Step1CropSchedule } = await import("./Step1CropSchedule.jsx");

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

describe("Step1CropSchedule duration chip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCommodityCatalog.mockReturnValue({
      isLoading: false,
      options: [{ id: "ampalaya", name: "Ampalaya", varieties: ["Galaxy"], varietyMap: { galaxy: "COM-0003" }, defaultCommodityId: "COM-0003" }],
    });
  });

  it("renders the API duration label when the catalog has one", () => {
    durationForOption.mockReturnValue({ min: 48, max: 52, basis: "DAT" });
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    // 48 and 52 are both half-month steps, so the label quotes months.
    expect(screen.getByText(/Typical duration:/)).toBeDefined();
    expect(screen.getByText(/1\.6–1\.7 months|48–52 days/)).toBeDefined();
  });

  it("hides the chip when no duration is available from either source", () => {
    // Neither the API nor CROP_DURATIONS knows this commodity, so the chip
    // must disappear rather than render a bare "Typical duration:".
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "saba", variant: "" });
    expect(screen.queryByText(/Typical duration:/)).toBeNull();
  });

  it("falls back to the variety's own table entry, not the crop-wide range", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    // Ampalaya Galaxy is 48–52 in the table; the crop-wide range is 45–75.
    // Showing 45–75 here would repeat the "too early" bug from the database.
    expect(screen.getByText(/48–52 days/)).toBeDefined();
    expect(screen.queryByText(/45–75 days/)).toBeNull();
  });

  it("shows the crop-wide fallback when neither source knows the variety", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "lettuce", variant: "Curly" });
    // Curly has no table entry of its own, so the crop range (45–60) is used.
    expect(screen.getByText(/45–60 days/)).toBeDefined();
  });
});
