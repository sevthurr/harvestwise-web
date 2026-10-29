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
    const startInput = screen.getByLabelText(/^From$/i);
    const endInput = screen.getByLabelText(/^To$/i);
    expect(startInput.value).toBe("2027-01-12");
    expect(endInput.value).toBe("2027-02-11");
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
    const startInput = screen.getByLabelText(/^From$/i);
    const endInput = screen.getByLabelText(/^To$/i);

    // Change planting date to 2026-11-01. 90 days from 2026-11-01 is 2027-01-30.
    fireEvent.change(plantingInput, { target: { value: "2026-11-01" } });
    expect(startInput.value).toBe("2027-01-30");
    expect(endInput.value).toBe("2027-03-01");
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
    const startInput = screen.getByLabelText(/^From$/i);
    const endInput = screen.getByLabelText(/^To$/i);
    expect(startInput.value).toBe("2026-11-25");
    expect(endInput.value).toBe("2026-12-05");
  });

  it("renders action button and Put on Hold card in confirm-planting mode", () => {
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={baseCarrotCrop}
          mode="confirm-planting"
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    );

    // Title and action button both show Confirm Planting
    expect(screen.getAllByText("Confirm Planting").length).toBe(2);

    // The primary action button (Confirm Planting) and Put on hold card are accessible
    const actionButton = screen.getByRole("button", { name: /confirm planting/i });
    const holdButton = screen.getByRole("button", { name: /put on hold/i });
    expect(actionButton).toBeInTheDocument();
    expect(holdButton).toBeInTheDocument();

    // Clicking action button should submit phase transition to growing
    fireEvent.click(actionButton);
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "phase",
        phase: "growing",
        fields: expect.objectContaining({
          actualPlantingDate: "2026-10-14",
        }),
      })
    );
  });

  it("renders Update status button in update-phase mode", () => {
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={baseCarrotCrop}
          mode="update-phase"
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    );

    expect(screen.getByText("Update crop phase")).toBeInTheDocument();
    const updateBtn = screen.getByRole("button", { name: /update status/i });
    expect(updateBtn).toBeInTheDocument();
  });

  it("allows putting a crop on hold from the drawer and confirming with Confirm button", () => {
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={baseCarrotCrop}
          mode="update-phase"
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    );

    // Click the Put on hold card in the drawer body
    const holdButton = screen.getByRole("button", { name: /put on hold/i });
    fireEvent.click(holdButton);

    // Hold reason selector should now be displayed
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();

    // Select a reason
    fireEvent.change(select, { target: { value: "Weather conditions" } });

    // The page must have a "Confirm" button
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    expect(confirmBtn).toBeInTheDocument();
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith({
      kind: "hold",
      reason: "Weather conditions",
    });
  });
});
