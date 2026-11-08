import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";
import { Step2FarmHarvest } from "../app/farmer/components/recommend/Step2FarmHarvest";
import { Step4ReviewBreakEven } from "../app/farmer/components/recommend/Step4ReviewBreakEven";
import {
  DEFAULT_ASSESSMENT,
  calculateNormalizedPrice,
  calculateNormalizedHarvestQuantity,
  formatFarmgateSummary,
  formatHarvestQuantitySummary,
} from "../app/farmer/components/recommend/types";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  useLanguage.mockReturnValue({
    langCode: "en",
    effectiveLanguage: "en",
    t: (key, params, fallback) => {
      const res = translate(key, params, "en");
      if (res === key && fallback) return fallback;
      return res || fallback;
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("Farmgate Price Units & Normalization Logic", () => {
  it("normalizes prices correctly across Kg, Crate, and Sack", () => {
    // 1. Kg option
    expect(calculateNormalizedPrice(70, "kg")).toBe(70);
    expect(calculateNormalizedPrice(70.5, "kg")).toBe(70.5);

    // 2. Crate option (User example: ₱600 / crate with 20 kg / crate = ₱30/kg)
    expect(calculateNormalizedPrice(600, "crate", 20)).toBe(30);

    // Decimal weight support (e.g. 12.5 kg)
    expect(calculateNormalizedPrice(500, "crate", 12.5)).toBe(40);

    // 3. Sack option (₱1500 / sack with 50 kg / sack = ₱30/kg)
    expect(calculateNormalizedPrice(1500, "sack", 50)).toBe(30);

    // Zero or negative handling (prevent division by zero)
    expect(calculateNormalizedPrice(600, "crate", 0)).toBeNull();
    expect(calculateNormalizedPrice(600, "crate", -5)).toBeNull();
    expect(calculateNormalizedPrice(-100, "kg")).toBeNull();
    expect(calculateNormalizedPrice(0, "kg")).toBeNull();
  });

  it("formats farmgate summary preserving original price and showing normalized price", () => {
    // Kg
    expect(formatFarmgateSummary({ enteredPrice: 70, unit: "kg" })).toBe("₱70/kg");

    // Crate
    expect(
      formatFarmgateSummary({
        enteredPrice: 600,
        unit: "crate",
        conversionWeight: 20,
        normalizedPrice: 30,
      })
    ).toBe("₱600/crate (20 kg/crate) · ₱30/kg");

    // Sack
    expect(
      formatFarmgateSummary({
        enteredPrice: 1500,
        unit: "sack",
        conversionWeight: 50,
        normalizedPrice: 30,
      })
    ).toBe("₱1500/sack (50 kg/sack) · ₱30/kg");

    // Missing conversion weight: never show a normalized per-kg price
    expect(
      formatFarmgateSummary({
        enteredPrice: 800,
        unit: "sack",
        conversionWeight: "",
        normalizedPrice: "",
      })
    ).toBe("₱800/sack");
  });
});

describe("Harvest Quantity Units & Normalization Logic", () => {
  it("normalizes harvest quantity correctly across Kg, Crate, and Sack", () => {
    // 1. Kg option
    expect(calculateNormalizedHarvestQuantity(600, "kg")).toBe(600);

    // 2. Crate option (User example: 20 crates × 15 kg/crate = 300 kg)
    expect(calculateNormalizedHarvestQuantity(20, "crate", 15)).toBe(300);

    // Decimal weight support (e.g. 12.5 kg per crate)
    expect(calculateNormalizedHarvestQuantity(10, "crate", 12.5)).toBe(125);

    // 3. Sack option (10 sacks × 50 kg/sack = 500 kg)
    expect(calculateNormalizedHarvestQuantity(10, "sack", 50)).toBe(500);

    // Zero or negative handling
    expect(calculateNormalizedHarvestQuantity(20, "crate", 0)).toBeNull();
    expect(calculateNormalizedHarvestQuantity(20, "crate", -5)).toBeNull();
    expect(calculateNormalizedHarvestQuantity(-10, "kg")).toBeNull();
    expect(calculateNormalizedHarvestQuantity(0, "kg")).toBeNull();
  });

  it("formats harvest quantity summary preserving original quantity and showing normalized kilograms", () => {
    // Kg
    expect(formatHarvestQuantitySummary({ enteredQty: 600, unit: "kg" })).toBe("600 kg");

    // Crate
    expect(
      formatHarvestQuantitySummary({
        enteredQty: 20,
        unit: "crate",
        conversionWeight: 15,
        normalizedQty: 300,
      })
    ).toBe("20 crates (15 kg/crate) · 300 kg");

    // Single crate
    expect(
      formatHarvestQuantitySummary({
        enteredQty: 1,
        unit: "crate",
        conversionWeight: 15,
        normalizedQty: 15,
      })
    ).toBe("1 crate (15 kg/crate) · 15 kg");

    // Sack
    expect(
      formatHarvestQuantitySummary({
        enteredQty: 10,
        unit: "sack",
        conversionWeight: 50,
        normalizedQty: 500,
      })
    ).toBe("10 sacks (50 kg/sack) · 500 kg");
  });
});

describe("Step 2 Harvest Quantity Unit Selection & Estimated Farmgate Price Removal", () => {
  it("completely removes farmgate price from Step 2 and displays harvest quantity UOM selector (Kg, Crate, Sack)", () => {
    const data = {
      ...DEFAULT_ASSESSMENT,
      farmArea: 500,
      harvestQuantity: 600,
      harvestQuantityUnit: "kg",
    };
    renderWithProviders(<Step2FarmHarvest data={data} onChange={() => { }} errors={{}} />);

    // Step 2 has UOM dropdown for Kg, Crate, Sack beside harvest quantity
    const unitSelect = screen.getByLabelText(/Unit of measure/i);
    expect(unitSelect).toBeDefined();
    expect(screen.getByRole("option", { name: "Kg" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Crate" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Sack" })).toBeDefined();

    // When Kg is selected, conversion weight field is NOT shown
    expect(screen.queryByLabelText(/Estimated Weight per Crate/i)).toBeNull();
    expect(screen.queryByLabelText(/Estimated Weight per Sack/i)).toBeNull();

    // Farmgate price input and label are completely removed from Step 2
    expect(screen.queryByLabelText(/Estimated farmgate price|Tansya sa Presyong Farmgate/i)).toBeNull();
    expect(screen.queryByPlaceholderText("e.g. 70")).toBeNull();
    expect(screen.queryByText(/I will sell the produce to a buyer using farmgate price/i)).toBeNull();
  });

  it("shows conditional conversion input and equivalent harvest preview when Crate or Sack is selected in Step 2", () => {
    const dataCrate = {
      ...DEFAULT_ASSESSMENT,
      farmArea: 500,
      harvestQuantity: 300,
      harvestQuantityRaw: 20,
      harvestQuantityUnit: "crate",
      harvestConversionWeight: 15,
    };
    const { rerender } = renderWithProviders(
      <Step2FarmHarvest data={dataCrate} onChange={() => { }} errors={{}} />
    );

    // Estimated Weight per Crate is displayed with entered weight
    expect(screen.getByLabelText(/Estimated Weight per Crate \(kg\)/i)).toBeDefined();
    const weightInput = screen.getByPlaceholderText("e.g. 15");
    expect(weightInput.value).toBe("15");

    // Live equivalent total harvest preview is displayed
    expect(screen.getByText(/≈ 300 kg/i)).toBeDefined();

    // Rerender with Sack
    const dataSack = {
      ...DEFAULT_ASSESSMENT,
      farmArea: 500,
      harvestQuantity: 500,
      harvestQuantityRaw: 10,
      harvestQuantityUnit: "sack",
      harvestConversionWeight: 50,
    };
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <Step2FarmHarvest data={dataSack} onChange={() => { }} errors={{}} />
      </QueryClientProvider>
    );

    expect(screen.getByLabelText(/Estimated Weight per Sack \(kg\)/i)).toBeDefined();
    expect(screen.getByPlaceholderText("e.g. 50").value).toBe("50");
    expect(screen.getByText(/≈ 500 kg/i)).toBeDefined();
  });

  it("resets conversion weight when switching harvest quantity unit back to Kg in Step 2", () => {
    const handleChange = vi.fn();
    const data = {
      ...DEFAULT_ASSESSMENT,
      farmArea: 500,
      harvestQuantity: 300,
      harvestQuantityRaw: 20,
      harvestQuantityUnit: "crate",
      harvestConversionWeight: 15,
    };

    renderWithProviders(
      <Step2FarmHarvest data={data} onChange={handleChange} errors={{}} />
    );

    const unitSelect = screen.getByLabelText(/Unit of measure/i);
    fireEvent.change(unitSelect, { target: { value: "kg" } });

    expect(handleChange).toHaveBeenCalledWith({
      harvestQuantityUnit: "kg",
      harvestConversionWeight: "",
      harvestQuantityRaw: 20,
      harvestQuantity: 20,
    });
  });
});

describe("Step 4 Farmgate Price Unit Selection & Reusing Step 2 Conversion", () => {
  it("removes duplicate conversion weight inputs in Step 4 and automatically displays read-only conversion from Step 2", () => {
    const data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "kamatis",
      farmArea: 1000,
      harvestQuantity: 300,
      harvestQuantityRaw: 20,
      harvestQuantityUnit: "crate",
      harvestConversionWeight: 15,
      costMethod: "simple",
      simpleCost: 12000,
      useFarmgate: true,
      farmgatePriceRaw: 600,
      farmgatePriceUnit: "crate",
      farmgateConversionWeight: 15,
      farmgatePrice: 40, // 600 / 15 = 40 / kg
    };

    renderWithProviders(
      <Step4ReviewBreakEven data={data} onChange={() => { }} onEditStep={() => { }} errors={{}} />
    );

    // Unit toggle buttons exist in Step 4
    expect(screen.getByRole("button", { name: "Kg" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Crate" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sack" })).toBeDefined();

    // Duplicate input fields are completely removed from Step 4
    expect(screen.queryByLabelText(/Estimated Weight per Crate \(kg\)/i)).toBeNull();
    expect(screen.queryByLabelText(/Estimated Weight per Sack \(kg\)/i)).toBeNull();

    // Read-only reference using Step 2 conversion is displayed
    expect(screen.getByText(/Using conversion from Step 2: 1 crate = 15 kg/i)).toBeDefined();
    expect(screen.getByText(/₱40.00\/kg/i)).toBeDefined();

    // Review of inputs displays original price, Step 2 conversion, and normalized price
    expect(screen.getByText("₱600/crate (15 kg/crate) · ₱40/kg")).toBeDefined();
    expect(screen.getByText("20 crates (15 kg/crate) · 300 kg")).toBeDefined();
  });

  it("prompts the farmer to complete Step 2 when Crate or Sack is selected but no Step 2 conversion exists", () => {
    const handleEditStep = vi.fn();
    const data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "kamatis",
      farmArea: 1000,
      harvestQuantity: 600,
      harvestQuantityUnit: "kg",
      harvestConversionWeight: "",
      useFarmgate: true,
      farmgatePriceRaw: 600,
      farmgatePriceUnit: "crate",
      farmgatePrice: "",
    };

    renderWithProviders(
      <Step4ReviewBreakEven data={data} onChange={() => { }} onEditStep={handleEditStep} errors={{}} />
    );

    // Minimal inline notice is displayed
    expect(screen.getByText(/Add crate weight in Step 2 to use this unit/i)).toBeDefined();

    // No (incorrect) normalized per-kg price is displayed for the entered price
    expect(screen.queryByText(/₱600\/crate \(/)).toBeNull();
    expect(screen.getByText("₱600/crate")).toBeDefined();

    // Quick link to Step 2 works
    const editBtn = screen.getByRole("button", { name: /Edit Step 2/i });
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn);
    expect(handleEditStep).toHaveBeenCalledWith(2);
  });

  it("automatically calculates normalized farmgate price using Step 2 conversion when switching to Crate or Sack", () => {
    const handleChange = vi.fn();
    const data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "kamatis",
      farmArea: 1000,
      harvestQuantity: 15000,
      harvestQuantityRaw: 600,
      harvestQuantityUnit: "crate",
      harvestConversionWeight: 25, // 1 crate = 25 kg
      useFarmgate: true,
      farmgatePriceRaw: 1000,
      farmgatePriceUnit: "kg",
      farmgatePrice: 1000,
    };

    renderWithProviders(
      <Step4ReviewBreakEven data={data} onChange={handleChange} onEditStep={() => { }} errors={{}} />
    );

    const crateBtn = screen.getByRole("button", { name: "Crate" });
    fireEvent.click(crateBtn);

    // 1000 / 25 = 40/kg
    expect(handleChange).toHaveBeenCalledWith({
      farmgatePriceUnit: "crate",
      farmgateConversionWeight: 25,
      farmgatePrice: 40,
    });
  });

  it("resets conversion weight and recalculates when switching back to Kg in Step 4", () => {
    const handleChange = vi.fn();
    const data = {
      ...DEFAULT_ASSESSMENT,
      farmArea: 1000,
      harvestQuantity: 600,
      harvestQuantityRaw: 20,
      harvestQuantityUnit: "crate",
      harvestConversionWeight: 25,
      useFarmgate: true,
      farmgatePriceRaw: 1000,
      farmgatePriceUnit: "crate",
      farmgateConversionWeight: 25,
      farmgatePrice: 40,
    };

    renderWithProviders(
      <Step4ReviewBreakEven data={data} onChange={handleChange} onEditStep={() => { }} errors={{}} />
    );

    const kgButton = screen.getByRole("button", { name: "Kg" });
    fireEvent.click(kgButton);

    expect(handleChange).toHaveBeenCalledWith({
      farmgatePriceUnit: "kg",
      farmgateConversionWeight: "",
      farmgatePrice: 1000,
    });
  });
});
