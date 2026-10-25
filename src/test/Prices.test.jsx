import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

function renderPricesPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

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
  priceListResponse.current = { items: [lettuce] };
});

describe("Farmer prices page", () => {
  it("uses the series-specific price detail API for trends and forecasts", async () => {
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 150 }],
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
    expect(screen.getByText("Price may drop soon.")).toBeInTheDocument();
    expect(screen.getByText("₱150/kg")).toBeInTheDocument();
    expect(screen.getByText("₱130/kg")).toBeInTheDocument();
    expect(getPriceDetailMock).toHaveBeenCalledWith("COM-0025", {
      price_type: "bangkerohan_retail",
      horizon: 7,
      records_limit: 100,
    });
  });

  it("shows missing trend data without inventing a forecast price", async () => {
    getPriceDetailMock.mockResolvedValue({
      recent_records: [{ prevail_price: 150 }],
      forecast: null,
    });

    renderPricesPage();

    expect(await screen.findAllByText("No trend data")).not.toHaveLength(0);
    expect(screen.queryByText("Not available")).not.toBeInTheDocument();
    expect(screen.queryByText("₱0/kg")).not.toBeInTheDocument();
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

    // Click "Lowland Vegetables" chip inside the drawer
    fireEvent.click(screen.getByRole("button", { name: "Lowland Vegetables" }));

    // Click Save
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    // Ampalaya should remain, Carrots should be filtered out
    expect(screen.getByText("Ampalaya")).toBeInTheDocument();
    expect(screen.queryByText("Carrots")).not.toBeInTheDocument();
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

    // Ampalaya is Rising, Carrots is Falling
    getPriceDetailMock.mockImplementation(async (id) => {
      if (id === "COM-0001") {
        return {
          recent_records: [{ prevail_price: 96 }],
          forecast: { trend: "Rising", forecast_midpoint: 98, horizon_days: 7 },
        };
      }
      return {
        recent_records: [{ prevail_price: 65 }],
        forecast: { trend: "Falling", forecast_midpoint: 60, horizon_days: 7 },
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
      commodity_id: "COM-0025",
      name: "Lettuce",
      category: "Highland Vegetables",
      unit_of_measure: "kg",
      is_top10: true,
      prices: { bangkerohan_retail: 180 },
    };
    priceListResponse.current = {
      items: [expensive, cheap],
    };

    renderPricesPage();

    expect(await screen.findByText("Kalabasa")).toBeInTheDocument();
    expect(screen.getByText("Lettuce")).toBeInTheDocument();

    // Open filter drawer and select lowest price first
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Lowest price first" }));
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    let headings = screen.getAllByText(/Kalabasa|Lettuce/);
    expect(headings[0]).toHaveTextContent("Kalabasa");
    expect(headings[1]).toHaveTextContent("Lettuce");

    // Open filter drawer and select highest price first
    fireEvent.click(screen.getByRole("button", { name: /Open filter drawer/i }));
    fireEvent.click(screen.getByRole("button", { name: "Highest price first" }));
    fireEvent.click(screen.getByRole("button", { name: /Save|Apply/i }));

    headings = screen.getAllByText(/Kalabasa|Lettuce/);
    expect(headings[0]).toHaveTextContent("Lettuce");
    expect(headings[1]).toHaveTextContent("Kalabasa");
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
});
