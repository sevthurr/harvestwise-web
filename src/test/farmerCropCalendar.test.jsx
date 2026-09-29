import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RecommendationPage from "../app/farmer/pages/Recommendation";
import { LanguageProvider } from "../app/global/contexts/LanguageContext";

vi.mock("../app/global/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "USR-001", role: "farmer" },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

// Mock the API calls
vi.mock("../app/global/api", () => ({
  apiGet: vi.fn((url) => {
    if (url.includes("/market/calendar")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                calendar_date: "2026-09-15",
                holiday_name: "Payday",
                is_payday: true,
              },
              {
                calendar_date: "2026-09-30",
                holiday_name: "Payday",
                is_payday: true,
              },
            ],
          }),
      });
    }
    if (url.includes("/market/monthly-recommendations")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                commodity_id: "COM-0004",
                commodity_name: "Kamatis",
                advisory_category: "Recommended",
                explanation: "Price may rise soon",
                bestVariety: "Diamante Big",
                price_outlook: "Favorable",
                arrival_pressure: "Moderate",
                historical_seasonal_production_level: "Moderate",
                weather_risk_level: "Suitable",
              },
              {
                commodity_id: "COM-0001",
                commodity_name: "Ampalaya",
                advisory_category: "Recommended",
                explanation: "Good estimated profit",
                bestVariety: "Galaxy",
                price_outlook: "Favorable",
                arrival_pressure: "Moderate",
                historical_seasonal_production_level: "Moderate",
                weather_risk_level: "Suitable",
              },
              {
                commodity_id: "COM-0006",
                commodity_name: "Atsal",
                advisory_category: "Caution",
                explanation: "High price volatility",
              },
            ],
          }),
      });
    }
    if (url.includes("/weather/advisory")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            daily_forecasts: [
              {
                date: "2026-09-28",
                rainfall_mm: 18.0,
                suitability: "Storm",
                temperature_max: 30,
                temperature_min: 24,
              },
              {
                date: "2026-09-29",
                rainfall_mm: 0,
                suitability: "Hot",
                temperature_max: 34,
                temperature_min: 25,
              },
            ],
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ items: [] }),
    });
  }),
  parseResponse: vi.fn(async (res) => res.json()),
}));

// Mock CropsContext
vi.mock("../app/farmer/components/crops/CropsContext", () => ({
  useCrops: () => ({
    crops: [],
    loading: false,
  }),
}));

describe("Farmer Crop Calendar Page", () => {
  let queryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <MemoryRouter>
            <RecommendationPage />
          </MemoryRouter>
        </LanguageProvider>
      </QueryClientProvider>
    );

  it("renders page title and subtitle without redundant update timestamp", async () => {
    renderComponent();

    expect(await screen.findByText(/Crop Calendar|Kalendaryo sa Tanom/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Track crop schedules and harvest timing|Subaya ang iskedyul/i)
    ).toBeInTheDocument();
    // Verify redundant update timestamp badge was removed
    expect(
      screen.queryByText(/Updated today at 7:30 AM|Gi-update karon sa 7:30 AM/i)
    ).not.toBeInTheDocument();
  });

  it("renders the calendar legend matching weather cards, events, and crop milestones", async () => {
    renderComponent();

    expect(await screen.findByText(/Light rain|Gamay nga ulan/i)).toBeInTheDocument();
    expect(screen.getByText(/Heavy rain|Kusog nga ulan/i)).toBeInTheDocument();
    expect(screen.getByText(/Hot days|Init nga mga adlaw/i)).toBeInTheDocument();
    expect(screen.getByText(/Events|Mga Hitabo/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Crop schedule$|^Iskedyul sa tanom$/i).length).toBeGreaterThanOrEqual(1);
  });

  it("only displays Recommended crops in the 'Good crops to plant' section, excluding Caution crops", async () => {
    renderComponent();

    // Kamatis and Ampalaya are Recommended
    expect(await screen.findByText("Kamatis")).toBeInTheDocument();
    expect(screen.getByText("Ampalaya")).toBeInTheDocument();

    // Atsal is Caution, so it must NOT be in the recommendations section
    expect(screen.queryByText("Atsal")).not.toBeInTheDocument();
  });

  it("renders expandable factor accordion for recommended crops", async () => {
    renderComponent();

    const accordionTitles = await screen.findAllByText(
      /Why this is a good crop this month|Nganong maayo kini nga tanom/i
    );
    expect(accordionTitles.length).toBeGreaterThanOrEqual(1);

    // Kamatis is expanded by default
    expect(screen.getAllByText(/Price|Presyo/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Supply|Suplay/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Production|Produksyon/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Weather|Panahon/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Profit|Ganansya/i).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/View detailed factors|Tan-awa ang detalyadong mga hinungdan/i)
    ).toBeInTheDocument();
  });

  it("renders Weather Note and Check Crop action cards without redundant footer hyperlinks", async () => {
    renderComponent();

    expect(await screen.findByText(/Weather note|Pahibalo sa panahon/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Check a crop before planting|Susiha ang tanom sa dili pa itanom/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Start check|Sugdi ang pagsusi/i)
    ).toBeInTheDocument();
    // Redundant privacy and terms hyperlinks removed (already present in the global footer)
    expect(
      screen.queryByText(/Privacy Policy|Patakaran sa Pribasidad/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Terms & Conditions|Mga Termino ug Kondisyon/i)
    ).not.toBeInTheDocument();
  });

  it("renders detailed breakdown cards below the calendar when a day is clicked", async () => {
    renderComponent();

    // Find and click on day 28 (which has storm weather in mock)
    const day28Btn = await screen.findByRole("button", { name: /28/i });
    expect(day28Btn).toBeInTheDocument();
    fireEvent.click(day28Btn);

    // Verify details container appears with date title and 3 cards
    expect(
      await screen.findByText(/Daily Calendar & Farming Details|Inadlaw nga Detalye sa Kalendaryo ug Pag-uma/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Weather Note|Pahinumdom sa Panahon/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Crop Schedule|Iskedyul sa Tanom/i).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(/Market Note|Pahinumdom sa merkado|Panahon sa sweldo/i).length
    ).toBeGreaterThanOrEqual(1);
  });
});
