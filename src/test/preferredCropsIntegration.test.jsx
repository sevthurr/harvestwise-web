import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    t: (key, params, fallback) => (typeof params === "string" ? params : fallback || key),
    langCode: "en",
  }),
}));

vi.mock("../app/global/contexts/DisplayModeContext.jsx", () => ({
  useDisplayMode: () => ({
    mode: "farmer",
    setMode: vi.fn(),
  }),
}));

vi.mock("../app/global/components/shared/CommodityIllustrations.jsx", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    CommodityIllustration: () => <span data-testid="commodity-art" />,
  };
});

const profileMock = vi.hoisted(() => ({
  data: { preferredCrops: ["COM-0008"] }, // Pipino
}));

vi.mock("../app/global/hooks/useFarmerPrefetch.js", () => ({
  fetchFarmerProfile: vi.fn(async () => profileMock.data),
}));

const mockApiGet = vi.hoisted(() => vi.fn());
const mockParseResponse = vi.hoisted(() => vi.fn());

vi.mock("../app/global/api.js", () => ({
  apiGet: mockApiGet,
  parseResponse: mockParseResponse,
}));

import ForecastPage from "../app/farmer/pages/Forecast.jsx";
import PlantingGuidePage from "../app/farmer/pages/PlantingGuide.jsx";

function renderWithClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Preferred crops prioritization across farmer account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prioritizes preferred crops in Forecast page and renders preferred badge", async () => {
    profileMock.data = { preferredCrops: ["pipino"] };

    const { container } = renderWithClient(<ForecastPage />);

    expect(await screen.findByText("Price Forecast")).toBeInTheDocument();

    // Wait until query resolves and preferred badge renders
    await waitFor(() => {
      expect(screen.getAllByText("Preferred").length).toBeGreaterThan(0);
    });

    // Check that Pipino card appears before other commodity cards in the forecast grid
    const cards = container.querySelectorAll(".grid > div");
    expect(cards.length).toBeGreaterThan(1);
    expect(cards[0]).toHaveTextContent("Pipino");
    expect(cards[0]).toHaveTextContent("Preferred");
  });

  it("prioritizes preferred crops in Planting Guide recommendations", async () => {
    profileMock.data = { preferredCrops: ["Chinese Pechay"] };

    mockApiGet.mockResolvedValue({ ok: true });
    mockParseResponse.mockResolvedValue({
      items: [
        {
          commodity_id: "COM-0001",
          commodity_name: "Kamatis",
          advisory_category: "recommended",
          explanation: "Good market demand",
        },
        {
          commodity_id: "COM-0003",
          commodity_name: "Chinese Pechay",
          advisory_category: "recommended",
          explanation: "High price outlook",
        },
      ],
    });

    const { container } = renderWithClient(<PlantingGuidePage />);

    expect(await screen.findByText("Chinese Pechay")).toBeInTheDocument();
    expect(screen.getByText("Kamatis")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Preferred")).toBeInTheDocument();
    });

    // The first advisory card should be Chinese Pechay (preferred)
    const advisoryCards = container.querySelectorAll("section div.space-y-3 > div");
    expect(advisoryCards[0]).toHaveTextContent("Chinese Pechay");
    expect(advisoryCards[0]).toHaveTextContent("Preferred");
    expect(advisoryCards[1]).toHaveTextContent("Kamatis");
  });
});
