import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";
import {
  Step4ReviewBreakEven,
  MARKET_PRICE_BASIS_OPTIONS,
  normalizeMarketBasis,
  getMarketBasisPrice,
  getMarketBasisLabel,
} from "../app/farmer/components/recommend/Step4ReviewBreakEven";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

vi.mock("../app/farmer/components/recommend/useCommodityCatalog", () => ({
  useCommodityCatalog: () => ({
    options: [
      { id: "atsal", name: "Bell Pepper", baseName: "Bell Pepper", varieties: ["Smooth Cayenne"] },
    ],
    isLoading: false,
  }),
  findCatalogOption: () => ({
    id: "atsal",
    name: "Bell Pepper",
    baseName: "Bell Pepper",
    varieties: ["Smooth Cayenne"],
  }),
  durationForOption: () => null,
}));

function renderStep4(data, onChange = vi.fn(), pricesItems = null) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  queryClient.setQueryData(["prices", "list"], {
    items: pricesItems || [
      {
        commodity_id: "atsal",
        name: "Bell Pepper - Smooth Cayenne",
        base_name: "Bell Pepper",
        variety: "Smooth Cayenne",
        is_top10: true,
        prices: {
          bangkerohan_retail: 150,
          bangkerohan_wholesale: 120,
          dftc_retail: 135,
          dftc_wholesale: 110,
        },
      },
    ],
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
      <MemoryRouter>
        <Step4ReviewBreakEven
          data={data}
          onChange={onChange}
          onEditStep={vi.fn()}
          errors={{}}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Step 4 Market Price Basis Selection", () => {
  it("exports the 4 required options", () => {
    expect(MARKET_PRICE_BASIS_OPTIONS.map((o) => o.label)).toEqual([
      "Bankerohan Retail",
      "Bankerohan Wholesale",
      "DFTC Retail",
      "DFTC Wholesale",
    ]);
  });

  it("normalizes basis keys accurately", () => {
    expect(normalizeMarketBasis("Bankerohan Retail")).toBe("bankerohan_retail");
    expect(normalizeMarketBasis("Bankerohan Wholesale")).toBe("bankerohan_wholesale");
    expect(normalizeMarketBasis("DFTC Retail")).toBe("dftc_retail");
    expect(normalizeMarketBasis("DFTC Wholesale")).toBe("dftc_wholesale");
    expect(normalizeMarketBasis(null)).toBe("bankerohan_retail");
  });

  it("retrieves the correct price for each basis key", () => {
    const item = {
      prices: {
        bankerohan_retail: 150,
        bankerohan_wholesale: 120,
        dftc_retail: 135,
        dftc_wholesale: 110,
      },
    };
    expect(getMarketBasisPrice(item, "bankerohan_retail")).toBe(150);
    expect(getMarketBasisPrice(item, "bankerohan_wholesale")).toBe(120);
    expect(getMarketBasisPrice(item, "dftc_retail")).toBe(135);
    expect(getMarketBasisPrice(item, "dftc_wholesale")).toBe(110);
  });

  it("renders default Bankerohan Retail price and label", () => {
    const data = {
      commodity: "atsal",
      commodityName: "Bell Pepper",
      variant: "Smooth Cayenne",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: true,
      farmgatePrice: 70,
      marketPriceBasis: "bankerohan_retail",
    };

    renderStep4(data);

    expect(screen.getByText("₱150.00/kg")).toBeInTheDocument();
    expect(screen.getAllByText("Bankerohan Retail").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByTestId("market-price-basis-select")).toHaveValue("bankerohan_retail");
  });

  it("updates price and source label when selecting another market basis", () => {
    const onChange = vi.fn();
    const data = {
      commodity: "atsal",
      commodityName: "Bell Pepper",
      variant: "Smooth Cayenne",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: true,
      farmgatePrice: 70,
      marketPriceBasis: "bankerohan_retail",
    };

    renderStep4(data, onChange);

    const select = screen.getByTestId("market-price-basis-select");

    // Change to Bankerohan Wholesale
    fireEvent.change(select, { target: { value: "bankerohan_wholesale" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        marketPriceBasis: "bankerohan_wholesale",
        market: "Bankerohan",
        priceType: "Wholesale",
      })
    );

    // Rerender with Bankerohan Wholesale
    renderStep4({ ...data, marketPriceBasis: "bankerohan_wholesale" }, onChange);
    expect(screen.getByText("₱120.00/kg")).toBeInTheDocument();
    expect(screen.getAllByText("Bankerohan Wholesale").length).toBeGreaterThanOrEqual(2);

    // Rerender with DFTC Retail
    renderStep4({ ...data, marketPriceBasis: "dftc_retail" }, onChange);
    expect(screen.getByText("₱135.00/kg")).toBeInTheDocument();
    expect(screen.getAllByText("DFTC Retail").length).toBeGreaterThanOrEqual(2);

    // Rerender with DFTC Wholesale
    renderStep4({ ...data, marketPriceBasis: "dftc_wholesale" }, onChange);
    expect(screen.getByText("₱110.00/kg")).toBeInTheDocument();
    expect(screen.getAllByText("DFTC Wholesale").length).toBeGreaterThanOrEqual(2);
  });

  it("handles missing prices with fallback 'No current market price' and shows selected label", () => {
    const data = {
      commodity: "atsal",
      commodityName: "Bell Pepper",
      variant: "Smooth Cayenne",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: true,
      farmgatePrice: 70,
      marketPriceBasis: "dftc_wholesale",
    };

    // Item with only retail price, no wholesale
    const pricesItems = [
      {
        commodity_id: "atsal",
        name: "Bell Pepper - Smooth Cayenne",
        base_name: "Bell Pepper",
        variety: "Smooth Cayenne",
        is_top10: true,
        prices: {
          bangkerohan_retail: 150,
        },
      },
    ];

    renderStep4(data, vi.fn(), pricesItems);

    expect(screen.getByText("No current market price")).toBeInTheDocument();
    expect(screen.getAllByText("DFTC Wholesale").length).toBeGreaterThanOrEqual(2);
  });
});
