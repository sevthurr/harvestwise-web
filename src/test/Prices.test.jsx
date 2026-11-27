import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const { getPriceDetailMock, priceListResponse } = vi.hoisted(() => ({
  getPriceDetailMock: vi.fn(),
  priceListResponse: { current: { items: [] } },
}));

vi.mock("../app/global/api.js", () => ({
  apiGet: vi.fn(async () => ({ ok: true })),
  parseResponse: vi.fn(async () => priceListResponse.current),
}));

vi.mock("../services/api/pricesApi.js", () => ({
  getPriceDetail: getPriceDetailMock,
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback,
  }),
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CommodityIllustration: () => <span data-testid="commodity-art" />,
  };
});

import PricesPage from "../app/farmer/pages/Prices.jsx";

function renderPricesPage(seed) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  seed?.(queryClient);

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PricesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const lettuce = {
  commodity_id: "COM-0025",
  name: "Lettuce",
  variety: "Ball",
  unit_of_measure: "kg",
  is_top10: true,
  prices: {
    bangkerohan_retail: 150,
    bangkerohan_wholesale: 120,
    dftc_retail: 130,
    dftc_wholesale: 100,
  },
  forecast: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  priceListResponse.current = {
    items: [lettuce],
    preferred_crops: [{ commodity_id: "COM-0025", commodity_name: "Lettuce" }],
  };
});

describe("Farmer prices page", () => {
  it("uses the series-specific price detail API for trends and forecasts", async () => {
    getPriceDetailMock.mockResolvedValue({
      historical_movement: "Falling",
      recent_records: [{ prevail_price: 140 }, { prevail_price: 150 }],
      forecast: {
        forecast_date: "2026-08-07",
        horizon_days: 7,
        trend: "Falling",
        forecast_midpoint: 141.39,
        lower_forecast: 129.74,
        upper_forecast: 153.04,
        points: [
          { forecast_date: "2026-08-01" },
          { forecast_date: "2026-08-07" },
        ],
      },
    });

    renderPricesPage();

    expect(await screen.findByText("Falling")).toBeInTheDocument();
    expect(screen.getByText("Price decreased by ₱10/kg from previous price of ₱150/kg on Bankerohan Retail.")).toBeInTheDocument();
    expect(screen.getByText("₱150/kg")).toBeInTheDocument();
    expect(screen.getByText("₱130/kg")).toBeInTheDocument();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });

  it("shows actual price movement indicator independently of forecast direction", async () => {
    // ₱100 -> ₱110 is Rising, even when the forecast predicts Falling
    getPriceDetailMock.mockResolvedValue({
      historical_movement: "Rising",
      recent_records: [{ prevail_price: 110 }, { prevail_price: 100 }],
      forecast: {
        trend: "Falling",
        forecast_midpoint: 95,
        horizon_days: 7,
      },
    });

    renderPricesPage();

    expect(await screen.findByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Price increased by ₱10/kg from previous price of ₱100/kg on Bankerohan Retail.")).toBeInTheDocument();
    expect(screen.queryByText("Price may drop soon.")).not.toBeInTheDocument();
  });

  it("displays Insufficient Data when there is no previous price record", async () => {
    getPriceDetailMock.mockResolvedValue({
      historical_movement: "Insufficient Data",
      recent_records: [{ prevail_price: 150 }],
      forecast: null,
    });

    renderPricesPage();

    expect(await screen.findByText("Insufficient Data")).toBeInTheDocument();
    expect(screen.getByText("No previous price record available for comparison on Bankerohan Retail.")).toBeInTheDocument();
  });

  it("uses summary trends for non-preferred commodities without loading detail data", async () => {
    const carrots = {
      commodity_id: "COM-0028",
      name: "Carrots",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 105 },
      forecast: { trend: "Rising" },
    };
    priceListResponse.current = {
      items: [lettuce, carrots],
      preferred_crops: [{ commodity_id: "COM-0025", commodity_name: "Lettuce" }],
    };
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 100 }],
      forecast: { trend: "Rising", forecast_midpoint: 110, horizon_days: 7 },
    });

    renderPricesPage();

    await waitFor(() => {
      expect(screen.queryByText("Loading trend")).not.toBeInTheDocument();
      expect(getPriceDetailMock).not.toHaveBeenCalledWith("COM-0028", expect.anything());
    });

    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Rising" }));
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    await waitFor(() => {
      expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", expect.anything());
      expect(getPriceDetailMock).not.toHaveBeenCalledWith("COM-0028", expect.anything());
    });
  });

  it("renders preferred crops first before non-preferred commodities", async () => {
    const pipino = {
      commodity_id: "COM-0008",
      name: "Pipino",
      variety: "Mega C",
      unit_of_measure: "kg",
      is_top10: true,
      prices: {
        bangkerohan_retail: 60,
      },
    };
    priceListResponse.current = {
      items: [lettuce, pipino],
      preferred_crops: [{ commodity_id: "COM-0008", commodity_name: "Pipino" }],
    };

    renderPricesPage();

    // Both commodities render
    expect(await screen.findByText("Pipino")).toBeInTheDocument();
    expect(screen.getByText("Lettuce")).toBeInTheDocument();

    // Verify ordering: Pipino (preferred) comes before Lettuce
    const headings = screen.getAllByText(/Pipino|Lettuce/);
    expect(headings[0]).toHaveTextContent("Pipino");
    expect(headings[1]).toHaveTextContent("Lettuce");
    expect(screen.getByText("Preferred")).toBeInTheDocument();
  });

  it("filters commodities by category", async () => {
    const ampalaya = {
      commodity_id: "COM-0001",
      name: "Ampalaya",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 96 },
      forecast: { trend: "Rising" },
    };
    const carrots = {
      commodity_id: "COM-0028",
      name: "Carrots",
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 65 },
      forecast: { trend: "Falling" },
    };
    priceListResponse.current = {
      items: [ampalaya, carrots],
    };

    renderPricesPage();

    expect(await screen.findByText("Ampalaya")).toBeInTheDocument();
    expect(screen.getByText("Carrots")).toBeInTheDocument();

    // Open filter drawer
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));

    // Click "Lowland Vegetables" chip inside the drawer
    fireEvent.click(screen.getByRole("button", { name: "Lowland Vegetables" }));

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    // Ampalaya should remain, Carrots should be filtered out
    expect(screen.getByText("Ampalaya")).toBeInTheDocument();
    expect(screen.queryByText("Carrots")).not.toBeInTheDocument();
  });

  it("does not offer sort options duplicated by price direction", () => {
    renderPricesPage();

    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));

    expect(screen.queryByRole("button", { name: "Price rising first" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Price falling first" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rising" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Falling" })).toBeInTheDocument();
  });

  it("filters commodities by price direction", async () => {
    const ampalaya = {
      commodity_id: "COM-0001",
      name: "Ampalaya",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 96 },
    };
    const carrots = {
      commodity_id: "COM-0028",
      name: "Carrots",
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 65 },
    };
    priceListResponse.current = {
      items: [ampalaya, carrots],
    };

    // Ampalaya is Rising (96 > 90), Carrots is Falling (65 < 70)
    getPriceDetailMock.mockImplementation(async (id) => {
      if (id === "COM-0001") {
        return {
          historical_movement: "Rising",
          recent_records: [{ prevail_price: 96 }, { prevail_price: 90 }],
          forecast: { trend: "Falling", forecast_midpoint: 85, horizon_days: 7 },
        };
      }
      return {
        historical_movement: "Falling",
        recent_records: [{ prevail_price: 65 }, { prevail_price: 70 }],
        forecast: { trend: "Rising", forecast_midpoint: 80, horizon_days: 7 },
      };
    });

    renderPricesPage();

    expect(await screen.findByText("Ampalaya")).toBeInTheDocument();
    expect(screen.getByText("Carrots")).toBeInTheDocument();

    // Open filter drawer
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));

    // Select Rising
    fireEvent.click(screen.getByRole("button", { name: "Rising" }));

    // Save
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    // Only Ampalaya (Rising) remains
    expect(screen.getByText("Ampalaya")).toBeInTheDocument();
    expect(screen.queryByText("Carrots")).not.toBeInTheDocument();
  });

  it("sorts commodities by lowest price first and highest price first", async () => {
    const cheap = {
      commodity_id: "COM-0003",
      name: "Kalabasa",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 40 },
    };
    const expensive = {
      commodity_id: "COM-0028",
      name: "Carrots",
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 180 },
    };
    priceListResponse.current = {
      items: [lettuce, expensive, cheap],
      preferred_crops: [{ commodity_id: "COM-0025", commodity_name: "Lettuce" }],
    };

    renderPricesPage();

    expect(await screen.findByText("Kalabasa")).toBeInTheDocument();
    expect(screen.getByText("Lettuce")).toBeInTheDocument();
    expect(screen.getByText("Carrots")).toBeInTheDocument();

    // Open filter drawer and select lowest price first
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Lowest price first" }));
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    let headings = screen.getAllByText(/Kalabasa|Lettuce|Carrots/);
    expect(headings[0]).toHaveTextContent("Kalabasa");
    expect(headings[1]).toHaveTextContent("Lettuce");

    // Open filter drawer and select highest price first
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Highest price first" }));
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    headings = screen.getAllByText(/Kalabasa|Lettuce|Carrots/);
    expect(headings[0]).toHaveTextContent("Carrots");
    expect(headings[1]).toHaveTextContent("Lettuce");
  });

  it("saves filter changes when clicking Save button in filter drawer", async () => {
    const ampalaya = {
      commodity_id: "COM-0001",
      name: "Ampalaya",
      category: "Lowland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 96 },
    };
    const carrots = {
      commodity_id: "COM-0028",
      name: "Carrots",
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 65 },
    };
    priceListResponse.current = {
      items: [ampalaya, carrots],
    };

    renderPricesPage();

    expect(await screen.findByText("Ampalaya")).toBeInTheDocument();
    expect(screen.getByText("Carrots")).toBeInTheDocument();

    // Open filter drawer
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));

    // Click "Highland Vegetables" chip inside the drawer
    fireEvent.click(screen.getByRole("button", { name: "Highland Vegetables" }));

    // Verify Save button exists and click it
    const saveBtn = screen.getByRole("button", { name: /Save/i });
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    // Carrots should remain, Ampalaya should be filtered out
    expect(screen.getByText("Carrots")).toBeInTheDocument();
    expect(screen.queryByText("Ampalaya")).not.toBeInTheDocument();
  });

  it("keeps search enabled when offline cached prices are available", async () => {
    apiGet.mockResolvedValue({ ok: false, status: 503 });
    const cachedPrices = { items: [lettuce] };

    renderPricesPage((client) => client.setQueryData(["prices", "list"], cachedPrices));

    const search = screen.getByPlaceholderText("Search commodity…");
    expect(search).not.toBeDisabled();
    expect(await screen.findByText("Lettuce")).toBeInTheDocument();
  });
  it("determines historical price movement correctly across test matrix", async () => {
    // ₱100 → ₱110 = Rising
    const risingCrop = {
      commodity_id: "COM-TEST-1",
      name: "Rising Crop",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 110 },
    };
    // ₱120 → ₱100 = Falling
    const fallingCrop = {
      commodity_id: "COM-TEST-2",
      name: "Falling Crop",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 100 },
    };
    // ₱100 → ₱100 = Stable
    const stableCrop = {
      commodity_id: "COM-TEST-3",
      name: "Stable Crop",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 100 },
    };
    // No previous record = Insufficient Data
    const insufficientCrop = {
      commodity_id: "COM-TEST-4",
      name: "Insufficient Crop",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 100 },
    };

    priceListResponse.current = {
      items: [risingCrop, fallingCrop, stableCrop, insufficientCrop],
    };

    getPriceDetailMock.mockImplementation(async (id) => {
      if (id === "COM-TEST-1") {
        return {
          historical_movement: "Rising",
          recent_records: [{ prevail_price: 110 }, { prevail_price: 100 }],
          forecast: { trend: "Falling", horizon_days: 7 },
        };
      }
      if (id === "COM-TEST-2") {
        return {
          historical_movement: "Falling",
          recent_records: [{ prevail_price: 100 }, { prevail_price: 120 }],
          forecast: { trend: "Rising", horizon_days: 7 },
        };
      }
      if (id === "COM-TEST-3") {
        return {
          historical_movement: "Stable",
          recent_records: [{ prevail_price: 100 }, { prevail_price: 100 }],
          forecast: { trend: "Rising", horizon_days: 7 },
        };
      }
      return {
        historical_movement: "Insufficient Data",
        recent_records: [{ prevail_price: 100 }],
        forecast: null,
      };
    });

    renderPricesPage();

    expect(await screen.findByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Falling")).toBeInTheDocument();
    expect(screen.getByText("Stable")).toBeInTheDocument();
    expect(screen.getByText("Insufficient Data")).toBeInTheDocument();
  });

  it("displays historical price change banner consistently across all cards without volatility reason", async () => {
    const ampalaya = {
      commodity_id: "COM-0001",
      name: "Ampalaya",
      category: "Lowland Vegetables",
      variety: "Galaxy",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 110, bangkerohan_wholesale: 100, dftc_retail: 85, dftc_wholesale: 65 },
      historical_movement: "Rising",
      volatility_reason: "Decreased Supply",
      volatility_category: "Supply",
    };

    priceListResponse.current = {
      items: [ampalaya],
    };

    getPriceDetailMock.mockResolvedValue({
      commodity_id: "COM-0001",
      name: "Ampalaya",
      historical_movement: "Rising",
      volatility_reason: "Decreased Supply",
      volatility_category: "Supply",
      recent_records: [
        { prevail_price: 110, volatility_reason: "Decreased Supply", volatility_category: "Supply" },
        { prevail_price: 100 },
      ],
      forecast: {
        trend: "Falling",
        forecast_midpoint: 90,
        horizon_days: 7,
      },
    });

    renderPricesPage();

    expect(await screen.findByText("Rising")).toBeInTheDocument();
    expect(screen.getByText("Price increased by ₱10/kg from previous price of ₱100/kg on Bankerohan Retail.")).toBeInTheDocument();
    expect(screen.queryByText("Reason for sudden price increase: Decreased Supply")).not.toBeInTheDocument();
    expect(screen.queryByText("Price may drop soon.")).not.toBeInTheDocument();
  });
});
