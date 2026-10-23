import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UpdatePhaseDrawer } from "../app/farmer/components/crops/UpdatePhaseDrawer";
import { LanguageProvider } from "../app/global/contexts/LanguageContext";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, vars, fallback) => {
      if (typeof fallback === "string") {
        if (vars && vars.initial && vars.added) {
          return fallback.replace("{initial}", vars.initial).replace("{added}", vars.added);
        }
        return fallback;
      }
      return key;
    },
    language: "en",
  }),
  LanguageProvider: ({ children }) => children,
}));

describe("Crop Cycle Completion Stage — Actual Production & Sales Data", () => {
  const ampalayaCrop = {
    id: "CRP-0042",
    commodity: "ampalaya",
    commodityName: "Ampalaya",
    phase: "harvested",
    status: "Harvesting",
    initialCost: 20000,
    addedCosts: 5200,
    totalCost: 25200,
    productionCost: 25200,
    harvestQuantity: 600,
    expectedHarvestQty: 600,
    farmgatePrice: 75,
    rawHarvestDate: "2026-10-23",
  };

  it("reflects overall total for final production cost (initial + added costs) in the completion form", () => {
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={ampalayaCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </LanguageProvider>
    );

    // Verify "Completed" phase option is present
    expect(screen.getByText("Completed")).toBeInTheDocument();

    // Verify Final Production Cost is pre-filled with overall total (25200)
    const costInput = screen.getByLabelText(/Final production cost/i);
    expect(costInput).toBeInTheDocument();
    expect(costInput.value).toBe("25200");

    // Verify hint reflects overall total with breakdown
    expect(screen.getByText(/Reflects overall total/i)).toBeInTheDocument();

    // Verify Completion date is pre-filled
    const dateInput = screen.getByLabelText(/Completion date/i);
    expect(dateInput.value).toBe("2026-10-23");

    // Verify confirm button text is "Confirm"
    expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
  });

  it("calculates revenue, profit/loss dynamically when entering actual sales data", () => {
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={ampalayaCrop}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      </LanguageProvider>
    );

    const qtyInput = screen.getByLabelText(/Final quantity sold/i);
    const priceInput = screen.getByLabelText(/Average selling price/i);

    // Enter actual sales data: 560 kg at ₱78/kg
    fireEvent.change(qtyInput, { target: { value: "560" } });
    fireEvent.change(priceInput, { target: { value: "78" } });

    // Revenue: 560 * 78 = 43,680
    // Total cost: 25,200
    // Profit: 43,680 - 25,200 = 18,480
    expect(screen.getByText("₱43,680")).toBeInTheDocument();
    expect(screen.getByText("+₱18,480")).toBeInTheDocument();
  });

  it("submits actual production and sales data, notes, and final production cost on confirm", () => {
    const onConfirm = vi.fn();
    render(
      <LanguageProvider>
        <UpdatePhaseDrawer
          open={true}
          crop={ampalayaCrop}
          onClose={vi.fn()}
          onConfirm={onConfirm}
        />
      </LanguageProvider>
    );

    const qtyInput = screen.getByLabelText(/Final quantity sold/i);
    const priceInput = screen.getByLabelText(/Average selling price/i);
    const notesInput = screen.getByLabelText(/Notes/i);
    const costInput = screen.getByLabelText(/Final production cost/i);

    fireEvent.change(qtyInput, { target: { value: "560" } });
    fireEvent.change(priceInput, { target: { value: "78" } });
    fireEvent.change(costInput, { target: { value: "25500" } });
    fireEvent.change(notesInput, { target: { value: "Harvest completed with strong demand." } });

    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "phase",
        phase: "completed",
        fields: expect.objectContaining({
          finalQtySold: 560,
          avgSellingPrice: 78,
          finalProductionCost: 25500,
          completionDate: "2026-10-23",
          notes: "Harvest completed with strong demand.",
        }),
      })
    );
  });
});
