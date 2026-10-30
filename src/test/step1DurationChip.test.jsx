/**
 * Step 1 harvest window behaviour.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../app/farmer/components/recommend/useCommodityCatalog.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useCommodityCatalog: vi.fn(),
    durationForOption: vi.fn(),
  };
});

let mockLang = "en";
vi.mock("../app/global/contexts/LanguageContext.jsx", async () => {
  const { t } = await import("../app/global/i18n/index.js");
  return {
    useLanguage: () => ({
      langCode: mockLang,
      effectiveLanguage: mockLang,
      t: (key, params, fallback) => {
        const res = t(key, params, mockLang);
        return res === key && fallback ? fallback : res;
      },
    }),
  };
});

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

function renderStep1(data, onChange = () => {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Step1CropSchedule data={{ ...BASE, ...data }} onChange={onChange} errors={{}} />
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

  it("renders the suggested harvest window in From and To inputs and duration subtext", () => {
    durationForOption.mockReturnValue({ min: 48, max: 52, basis: "DAT" });
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    const fromInput = document.getElementById("harvest-window-start");
    const toInput = document.getElementById("harvest-window-end");
    expect(fromInput?.value).toBe("2026-11-18");
    expect(toInput?.value).toBe("2026-11-22");
    expect(screen.getByText(/5 days/)).toBeDefined();
    expect(screen.getByText(/Typical plant-to-harvest duration: 48–52 days/)).toBeDefined();
  });

  it("hides the duration subtext when no duration is available from either source", () => {
    // Neither the API nor CROP_DURATIONS knows this commodity, so no range
    // can be displayed.
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "saba", variant: "" });
    expect(screen.queryByText(/Typical plant-to-harvest duration:/)).toBeNull();
  });

  it("uses the variety duration to suggest the harvest window", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    const fromInput = document.getElementById("harvest-window-start");
    const toInput = document.getElementById("harvest-window-end");
    expect(fromInput?.value).toBe("2026-11-18");
    expect(toInput?.value).toBe("2026-11-22");
    expect(screen.getByText(/Typical plant-to-harvest duration: 48–52 days/)).toBeDefined();
  });

  it("uses the crop-wide fallback when the variety is unknown", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "lettuce", variant: "Curly" });
    const fromInput = document.getElementById("harvest-window-start");
    const toInput = document.getElementById("harvest-window-end");
    expect(fromInput?.value).toBe("2026-11-15");
    expect(toInput?.value).toBe("2026-11-30");
    expect(screen.getByText(/Typical plant-to-harvest duration: 45–60 days/)).toBeDefined();
  });

  it("shows variety dropdown for commodities with 1 variety like Ampalaya", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({ commodity: "ampalaya", variant: "" });
    expect(screen.getByText("Variety")).toBeDefined();
  });

  it("renders natural Bisaya translations for Harvest Window, From, To, days, and duration subtext", () => {
    mockLang = "ceb";
    durationForOption.mockReturnValue({ min: 48, max: 52, basis: "DAT" });
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    expect(screen.getByText("Panahon sa Pag-ani")).toBeDefined();
    expect(screen.getByText("Gikan")).toBeDefined();
    expect(screen.getByText("Hangtod")).toBeDefined();
    expect(screen.getByText(/5 ka adlaw/)).toBeDefined();
    expect(screen.getByText(/Kasagarang gidugayon gikan sa pagtanom hangtod sa pag-ani: 48–52 ka adlaw/)).toBeDefined();
    mockLang = "en";
  });

  it("renders natural Tagalog translations for Harvest Window, From, To, days, and duration subtext", () => {
    mockLang = "tl";
    durationForOption.mockReturnValue({ min: 48, max: 52, basis: "DAT" });
    renderStep1({ commodity: "ampalaya", variant: "Galaxy" });
    expect(screen.getByText("Panahon ng Pag-aani")).toBeDefined();
    expect(screen.getByText("Mula")).toBeDefined();
    expect(screen.getByText("Hanggang")).toBeDefined();
    expect(screen.getByText(/5 araw/)).toBeDefined();
    expect(screen.getByText(/Karaniwang tagal mula pagtatanim hanggang pag-aani: 48–52 na araw/)).toBeDefined();
    mockLang = "en";
  });
  it("renders Harvest Window From and Harvest Window To as separate date fields", () => {
    durationForOption.mockReturnValue(null);
    renderStep1({
      commodity: "ampalaya",
      harvestWindowStart: "2026-12-23",
      harvestWindowEnd: "2027-02-01",
    });

    expect(screen.getByText("Harvest Window From")).toBeDefined();
    expect(screen.getByText("Harvest Window To")).toBeDefined();
    expect(screen.getByRole("button", { name: "Harvest Window From" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Harvest Window To" })).toBeDefined();
    expect(screen.getByText("December 23, 2026")).toBeDefined();
    expect(screen.getByText("February 1, 2027")).toBeDefined();
  });

  it("updates start date independently when changed", () => {
    const handleChange = vi.fn();
    renderStep1({
      commodity: "ampalaya",
      harvestWindowStart: "2026-12-23",
      harvestWindowEnd: "2027-02-01",
    }, handleChange);

    const fromInputs = document.querySelectorAll('input[type="date"]');
    // First date input is plantingDate, second is harvestWindowStart
    const harvestStartInput = fromInputs[1];
    expect(harvestStartInput).toBeDefined();
    fireEvent.change(harvestStartInput, { target: { value: "2026-12-25" } });

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      harvestWindowStart: "2026-12-25",
      harvestWindowEnd: "2027-02-01",
    }));
  });
});
