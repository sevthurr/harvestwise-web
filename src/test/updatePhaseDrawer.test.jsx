import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UpdatePhaseDrawer } from "../app/farmer/components/crops/UpdatePhaseDrawer";
import { LanguageProvider } from "../app/global/contexts/LanguageContext";
vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, vars, fallback) => {
      if (typeof fallback === "string") {
        if (vars && vars.duration) {
          return fallback.replace("{duration}", vars.duration);
        }
        return fallback;
      }
      return key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }) => children,
}));

describe("UpdatePhaseDrawer auto-fill harvest date", () => {
  beforeEach(() => {
    localStorage.setItem("harvestwise_language", "en");
  });
  const baseCarrotCrop = {
    id: "crop-1",
    commodity: "carrots",
    commodityName: "Carrots",
    phase: "planning",
    rawPlantingDate: "2026-10-14",
    rawHarvestDate: null,
    farmArea: 500,
  };

  it("auto-fills updatedHarvestDate based on the crop's duration when opening for growing phase", () => {
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={baseCarrotCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </LanguageProvider>
    );

    // Carrots duration is 90-120 days. 90 days from 2026-10-14 is 2027-01-12.
    const harvestInput = screen.getByLabelText(/Updated expected harvest date/i);
    expect(harvestInput.value).toBe("2027-01-12");
  });

  it("re-calculates updatedHarvestDate when actualPlantingDate changes", () => {
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={baseCarrotCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </LanguageProvider>
    );

    const plantingInput = screen.getByLabelText(/Actual planting date/i);
    const harvestInput = screen.getByLabelText(/Updated expected harvest date/i);

    // Change planting date to 2026-11-01. 90 days from 2026-11-01 is 2027-01-30.
    fireEvent.change(plantingInput, { target: { value: "2026-11-01" } });
    expect(harvestInput.value).toBe("2027-01-30");
  });

  it("auto-fills correctly for other crops with different durations like kamatis (55 days)", () => {
    const kamatisCrop = {
      id: "crop-2",
      commodity: "kamatis",
      commodityName: "Kamatis",
      phase: "planning",
      rawPlantingDate: "2026-10-01",
      rawHarvestDate: null,
    };

    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={kamatisCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </LanguageProvider>
    );

    // Kamatis duration is 55-65 days. 55 days from 2026-10-01 is 2026-11-25.
    const harvestInput = screen.getByLabelText(/Updated expected harvest date/i);
    expect(harvestInput.value).toBe("2026-11-25");
  });
});
