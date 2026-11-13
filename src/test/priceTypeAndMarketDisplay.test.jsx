import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";
import { Step4ReviewBreakEven } from "../app/farmer/components/recommend/Step4ReviewBreakEven";
import { RecommendationResult } from "../app/farmer/components/recommend/RecommendationResult";
import CropCycleDetailPage from "../app/farmer/pages/CropCycleDetail";
import { formatMarketPriceLabel } from "../app/global/utils/priceFormatting";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

vi.mock("../app/global/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, role: "farmer", city_municipality: "Davao City" },
  }),
}));

vi.mock("../app/farmer/components/recommend/useCommodityCatalog", () => ({
  useCommodityCatalog: () => ({
    options: [
      { id: "kamatis", name: "Tomato", baseName: "Tomato", varieties: ["Kamatis Tagalog"] },
    ],
    isLoading: false,
  }),
  findCatalogOption: () => ({
    id: "kamatis",
    name: "Tomato",
    baseName: "Tomato",
    varieties: ["Kamatis Tagalog"],
  }),
  durationForOption: () => null,
}));

vi.mock("../app/farmer/components/crops/CropsContext", () => ({
  useCrops: () => ({
    crops: [
      {
        id: "plan-1",
        commodity: "kamatis",
        commodityName: "Tomato",
        variant: "Tagalog",
        status: "Growing",
        phase: "growing",
        plantingDate: "2026-10-01",
        harvestDate: "2026-12-01",
        harvestQuantity: 500,
        farmArea: 500,
        farmAreaUnit: "sqm",
        productionCost: 10000,
        totalCost: 10000,
        expectedFarmgatePrice: null,
        farmgatePrice: null,
        currentPrice: 45,
        forecastLower: 40,
        forecastUpper: 50,
      },
    ],
    updateCrop: vi.fn(),
  }),
  formatLocalDate: vi.fn((x) => x || "Oct 01, 2026"),
  normalizeCropPlan: vi.fn((x) => x),
}));

vi.mock("../app/global/api", () => ({
  apiPost: vi.fn().mockResolvedValue({ ok: true }),
  apiPut: vi.fn().mockResolvedValue({ ok: true }),
  parseResponse: vi.fn().mockResolvedValue({
    advisory: { advisory: "Recommended", module_contributions: {}, hard_vetoes: [] },
    crop_stage: "growing",
    module_results: {
      market: "Bangkerohan",
      price_type: "Retail",
      market_price_label: "Bangkerohan Retail",
      reference_price: 45,
      historical_seasonal_price: 45,
      recent_average_price: 45,
      forecast_midpoint: 45,
      lower_forecast_price: 40,
      upper_forecast_price: 50,
      has_eligible_forecast: true,
      profitability: "Favorable",
    },
  }),
}));

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  queryClient.setQueryData(["prices", "list"], {
    items: [
      {
        commodity_id: "kamatis",
        name: "Kamatis - Tagalog",
        base_name: "Kamatis",
        variety: "Tagalog",
        is_top10: true,
        price_bangkerohan_retail: 45,
        prevailing_price: 45,
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
      <MemoryRouter initialEntries={["/farmer/crops/plan-1"]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("formatMarketPriceLabel utility", () => {
  it("formats market and price type properly", () => {
    expect(formatMarketPriceLabel("bangkerohan_retail")).toBe("Bangkerohan Retail");
    expect(formatMarketPriceLabel("Bangkerohan", "Retail")).toBe("Bangkerohan Retail");
    expect(formatMarketPriceLabel("dftc_wholesale")).toBe("DFTC Wholesale");
    expect(formatMarketPriceLabel("DFTC", "Wholesale")).toBe("DFTC Wholesale");
    expect(formatMarketPriceLabel(null, null, "Bangkerohan Retail")).toBe("Bangkerohan Retail");
  });
});

describe("Price Type and Market Display in Crop Assessment & Results", () => {
  it("renders market and price type in Step 4 current market price card and notes", () => {
    const data = {
      commodity: "kamatis",
      commodityName: "Tomato",
      variant: "Tagalog",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: true,
      farmgatePrice: 30,
    };

    renderWithProviders(
      <Step4ReviewBreakEven
        data={data}
        onChange={vi.fn()}
        onEditStep={vi.fn()}
        errors={{}}
      />
    );

    // Current market price should include market & price type badge/label (e.g. Bankerohan Retail)
    expect(screen.getAllByText(/(Bankerohan|Bangkerohan) Retail/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Current market price")).toBeInTheDocument();
    expect(screen.getByText("Break-even price")).toBeInTheDocument();
  });

  it("allows selecting market price basis among Bankerohan Retail, Bankerohan Wholesale, DFTC Retail, and DFTC Wholesale", () => {
    const handleChange = vi.fn();
    const data = {
      commodity: "kamatis",
      commodityName: "Tomato",
      variant: "Tagalog",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: true,
      farmgatePrice: 30,
      marketPriceBasis: "bankerohan_retail",
    };

    renderWithProviders(
      <Step4ReviewBreakEven
        data={data}
        onChange={handleChange}
        onEditStep={vi.fn()}
        errors={{}}
      />
    );

    const select = screen.getByTestId("market-price-basis-select");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bankerohan Retail" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Bankerohan Wholesale" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "DFTC Retail" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "DFTC Wholesale" })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "dftc_wholesale" } });
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        marketPriceBasis: "dftc_wholesale",
        market: "DFTC",
        priceType: "Wholesale",
      })
    );
  });

  it("renders market and price type in Crop Assessment Result (RecommendationResult)", () => {
    const data = {
      commodity: "tomato",
      commodityId: "tomato",
      commodityName: "Tomato",
      farmArea: 500,
      farmAreaUnit: "sqm",
      harvestQuantity: 500,
      costMethod: "simple",
      totalCost: 10000,
      useFarmgate: false,
      farmgatePrice: null,
      plantingDate: "2026-11-01",
      harvestDate: "2027-01-01",
    };

    const advisory = {
      advisory: { advisory: "Recommended", module_contributions: {}, hard_vetoes: [] },
      crop_stage: "before_planting",
      module_results: {
        market: "Bangkerohan",
        price_type: "Retail",
        market_price_label: "Bangkerohan Retail",
        reference_price: 48,
        historical_seasonal_price: 48,
        recent_average_price: 45,
        lower_forecast_price: 42,
        upper_forecast_price: 52,
        has_eligible_forecast: false,
        profitability: "Favorable",
      },
    };

    renderWithProviders(
      <RecommendationResult
        data={data}
        onBack={vi.fn()}
        onReset={vi.fn()}
        propAdvisory={advisory}
      />
    );

    // The result should explicitly show Bangkerohan Retail
    expect(screen.getAllByText(/Bangkerohan Retail/i).length).toBeGreaterThan(0);
  });

  it("renders market and price type in Crop Plan Detail (CropCycleDetail)", async () => {
    renderWithProviders(
      <Routes>
        <Route path="/farmer/crops/:cropId" element={<CropCycleDetailPage />} />
      </Routes>
    );

    await waitFor(() => {
      // Crop plan view shows Bangkerohan Retail for forecasted reference and market prices
      expect(screen.getAllByText(/Bangkerohan Retail/i).length).toBeGreaterThan(0);
    });
  });
});
