import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";

const {
  getArrivalPressureMock,
  getSeasonalProductionMock,
  listWeatherRulesMock,
  getWeatherForecastMock,
  apiGetMock,
  parseResponseMock,
} = vi.hoisted(() => ({
  getArrivalPressureMock: vi.fn(),
  getSeasonalProductionMock: vi.fn(),
  listWeatherRulesMock: vi.fn(),
  getWeatherForecastMock: vi.fn(),
  apiGetMock: vi.fn(),
  parseResponseMock: vi.fn(),
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: getArrivalPressureMock,
  getHistoricalSeasonalProduction: getSeasonalProductionMock,
  listWeatherRules: listWeatherRulesMock,
  getWeatherForecast: getWeatherForecastMock,
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    langCode: "en",
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

// fetchPricesList (["prices","list"]) goes through this module.
vi.mock("../app/global/api.js", () => ({
  apiGet: apiGetMock,
  parseResponse: parseResponseMock,
}));

// Capture what the tabs receive instead of rendering the whole chart tree.
vi.mock("../app/farmer/components/shared/FactorDetailTabs.jsx", () => ({
  FactorDetailTabs: ({ arrival, production }) => (
    <div>
      <span data-testid="arrival-classification">{arrival?.arrivalPressure ?? "none"}</span>
      <span data-testid="production-level">{production?.productionLevel ?? "none"}</span>
    </div>
  ),
}));

import FactorDetailPage from "../app/farmer/pages/FactorDetailPage.jsx";

// Snapshot of GET /prices?is_top10=true: per-variety commodity rows.
const PRICE_ITEMS = {
  items: [
    { commodity_id: "COM-0024", name: "Lettuce", variety: "Curly", prices: { bangkerohan_retail: 80 } },
    { commodity_id: "COM-0025", name: "Lettuce", variety: "Ball", prices: { bangkerohan_retail: 75 } },
  ],
};

function renderPage(state) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[{ pathname: "/farmer/assess/factors", state }]}>
        <Routes>
          <Route path="/farmer/assess/factors" element={<FactorDetailPage />} />
          <Route path="/farmer/market" element={<div data-testid="market-page">Market Page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiGetMock.mockResolvedValue({ ok: true });
  parseResponseMock.mockResolvedValue(PRICE_ITEMS);
  getArrivalPressureMock.mockResolvedValue({
    status: "processed",
    classification: "High",
    current_arrival_kg: 500,
    average_arrival_kg: 250,
    records: [],
  });
  getSeasonalProductionMock.mockResolvedValue({
    status: "processed",
    classification: "High",
    quarterly_profiles: [
      { quarter: "Q4", classification: "High", average_production_mt: 125, years_available: 4 },
    ],
    records: [],
  });
  listWeatherRulesMock.mockResolvedValue({ items: [] });
  getWeatherForecastMock.mockResolvedValue({ forecast: [] });
});

describe("FactorDetailPage — arrival and production data", () => {
  it("queries and displays arrival and production data on the first view", async () => {
    renderPage({
      title: "Lettuce — Detailed Factors",
      commodityId: "COM-0025",
      commodityName: "Lettuce",
      selectedQuarter: "Q4",
      backPath: "/farmer/assess",
      backLabel: "Assessment Result",
    });

    await waitFor(() =>
      expect(screen.getByTestId("arrival-classification")).toHaveTextContent("High")
    );
    expect(screen.getByTestId("production-level")).toHaveTextContent("High");
    expect(getArrivalPressureMock).toHaveBeenCalledWith("COM-0025");
    expect(getSeasonalProductionMock).toHaveBeenCalledWith("COM-0025", "Q4");
  });

  it("resolves a catalog icon key to a real commodity id instead of 404ing", async () => {
    // What the assessment wizard used to hand over: the icon key, not the id.
    renderPage({
      title: "Lettuce — Detailed Factors",
      commodityId: "lettuce",
      commodityName: "Lettuce",
      selectedQuarter: "Q4",
      backPath: "/farmer/assess",
      backLabel: "Assessment Result",
    });

    await waitFor(() =>
      expect(screen.getByTestId("arrival-classification")).toHaveTextContent("High")
    );
    expect(screen.getByTestId("production-level")).toHaveTextContent("High");
    expect(getArrivalPressureMock).toHaveBeenCalledWith("COM-0024");
    expect(getSeasonalProductionMock).toHaveBeenCalledWith("COM-0024", "Q4");
    expect(getArrivalPressureMock).not.toHaveBeenCalledWith("lettuce");
  });

  it("renders the commodity icon before page title and supports clicking previous breadcrumb for back navigation", async () => {
    renderPage({
      title: "Tomato — Detailed Factors",
      commodityId: "COM-0004",
      commodityName: "Tomato",
      backPath: "/farmer/market",
      backLabel: "Market",
      breadcrumbs: [
        { label: "Market", path: "/farmer/market" },
        { label: "Tomato" },
        { label: "Detailed Factors" },
      ],
    });

    // Check heading exists
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Tomato — Detailed Factors");

    // Check SVG illustration exists right before heading in the same container
    const iconContainer = heading.closest("div")?.parentElement;
    const svg = iconContainer?.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Check breadcrumb items
    const breadcrumbNav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(breadcrumbNav).toBeInTheDocument();

    // "Market" and "Tomato" are buttons (clickable)
    const marketBtn = within(breadcrumbNav).getByRole("button", { name: "Market" });
    const tomatoBtn = within(breadcrumbNav).getByRole("button", { name: "Tomato" });
    expect(marketBtn).toBeInTheDocument();
    expect(tomatoBtn).toBeInTheDocument();

    // Clicking previous breadcrumb "Tomato" triggers back navigation to /farmer/market
    fireEvent.click(tomatoBtn);
    expect(await screen.findByTestId("market-page")).toBeInTheDocument();
  });
});
