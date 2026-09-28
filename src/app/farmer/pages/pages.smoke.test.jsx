/**
 * Render smoke tests for the farmer page modules.
 *
 * These exist because `vite build` does NOT catch an undefined identifier.
 * Rollup treats an unknown name as a global and emits a bundle happily; the
 * failure only appears at runtime as
 * "Unexpected Application Error! buildCalendarMarkers is not defined".
 *
 * That regression shipped once already while extracting the calendar. Rendering
 * each page forces module evaluation and the first render pass, so a missing
 * import fails here instead of in a farmer's browser.
 *
 * Hooks and network modules are mocked; the assertion under test is simply "this
 * component mounts without throwing".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

const navigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../../global/api", () => ({
  apiGet: vi.fn(async () => ({ ok: true, json: async () => ({}) })),
  apiPost: vi.fn(async () => ({ ok: true })),
  apiPut: vi.fn(async () => ({ ok: true })),
  parseResponse: vi.fn(async () => ({})),
}));

vi.mock("../../global/contexts/LanguageContext", () => ({
  // Mirrors the real signature, including {param} interpolation, so assertions
  // can match rendered copy.
  useLanguage: () => ({
    t: (key, params = {}, fallback) => {
      const base = fallback || key;
      return base.replace(/\{(\w+)\}/g, (_, p) => (p in params ? String(params[p]) : `{${p}}`));
    },
    langCode: "en",
  }),
}));

vi.mock("../components/crops/CropsContext", () => ({
  useCrops: () => ({ crops: [], loading: false }),
}));

vi.mock("../../global/components/shared/CommodityIllustrations", () => ({
  CommodityIllustration: () => <span data-testid="art" />,
}));

vi.mock("../../global/hooks/useFarmerPrefetch", () => ({
  fetchFarmerProfile: vi.fn(),
}));

vi.mock("../../global/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { first_name: "Test" } }),
}));

function renderPage(ui) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("RecommendationPage mounts", () => {
  it("renders without a ReferenceError", async () => {
    const { default: RecommendationPage } = await import("./Recommendation.jsx");
    expect(() => renderPage(<RecommendationPage />)).not.toThrow();
  });

  it("shows the calendar page title", async () => {
    const { default: RecommendationPage } = await import("./Recommendation.jsx");
    renderPage(<RecommendationPage />);
    expect(await screen.findByText("Crop Calendar")).toBeTruthy();
  });
});

describe("DashboardPage mounts", () => {
  it("renders without a ReferenceError", async () => {
    const { default: DashboardPage } = await import("./Dashboard.jsx");
    expect(() => renderPage(<DashboardPage />)).not.toThrow();
  });
});

describe("calendar components mount", () => {
  it("CalendarGrid renders a full month", async () => {
    const { default: CalendarGrid } = await import(
      "../components/calendar/CalendarGrid.jsx"
    );
    // October 2026: 31 days, starts on a Thursday => 4 leading blanks, 35 cells.
    renderPage(
      <CalendarGrid
        year={2026}
        month={10}
        selectedDay={null}
        onSelectDay={() => {}}
        markers={{ 15: { crop: { id: "COM-1", name: "Ampalaya" }, weather: "rain" } }}
      />,
    );
    // 35 cells + 7 weekday headers
    expect(screen.getAllByRole("button").length).toBe(31);
  });

  it("DayDetailCard renders only present data", async () => {
    const { default: DayDetailCard } = await import(
      "../components/calendar/DayDetailCard.jsx"
    );
    const { container } = renderPage(
      <DayDetailCard
        year={2026}
        month={10}
        day={15}
        marker={{ weather: "rain", weatherInfo: { tempMin: 22, tempMax: 31, rainProb: 70 } }}
      />,
    );
    expect(container.textContent).toContain("70% rain");
    // No crop marker supplied, so no crop line and no harvest text.
    expect(container.textContent).not.toContain("Expected harvest");
  });

  it("DayDetailCard returns null for an unmarked day", async () => {
    const { default: DayDetailCard } = await import(
      "../components/calendar/DayDetailCard.jsx"
    );
    const { container } = renderPage(
      <DayDetailCard year={2026} month={10} day={15} marker={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("CalendarLegend renders nothing for an empty month", async () => {
    const { default: CalendarLegend } = await import(
      "../components/calendar/CalendarLegend.jsx"
    );
    const { container } = renderPage(<CalendarLegend markers={{}} />);
    expect(container.firstChild).toBeNull();
  });
});
