/**
 * CommodityDetail price-detail cache behaviour.
 *
 * The login bundle (/farmer/daily-snapshot) seeds
 * ["prices","detail", id, priceTypeKey, 7] for the top commodities, so opening
 * one must fire ZERO requests. The prefetch useEffect that used to warm all four
 * price types on every tap is gone, which means the page's useQuery is now the
 * only fetcher — so the cache-MISS path is the load-bearing one and needs a test.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router";

import { priceDetailKey, BUNDLE_DETAIL_PERIOD } from "../app/global/hooks/useFarmerPrefetch";

const { apiGet, parseResponse } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/global/api", () => ({ apiGet, parseResponse }));

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, params = {}, fallback) =>
      (fallback || key).replace(/\{(\w+)\}/g, (_, p) =>
        p in params ? String(params[p]) : `{${p}}`
      ),
    langCode: "en",
  }),
}));

vi.mock("../app/global/components/shared/CommodityIllustrations", () => ({
  CommodityIllustration: () => <span data-testid="art" />,
}));

const DETAIL = {
  commodity_id: "COM-0001",
  name: "Tomato",
  selected_price_type: "bangkerohan_retail",
  current_price: 42.5,
  unit_of_measure: "kg",
  recent_records: [
    { record_id: "r1", price_date: "2026-09-28", prevail_price: 42.5, change: 1.5 },
  ],
  forecast: { horizon_days: 7, trend: "Rising" },
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderPage(client) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/farmer/prices/COM-0001"]}>
        <Routes>
          <Route path="/farmer/prices/:commodityId" element={<CommodityDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

let CommodityDetail;

beforeEach(async () => {
  vi.clearAllMocks();
  apiGet.mockResolvedValue({ ok: true, status: 200 });
  parseResponse.mockResolvedValue({ items: [] });
  CommodityDetail = (await import("../app/farmer/pages/CommodityDetail.jsx")).default;
});

describe("CommodityDetail price detail caching", () => {
  it("fires ZERO requests for a commodity the bundle already seeded", async () => {
    const client = makeClient();
    client.setQueryData(priceDetailKey("COM-0001", "bangkerohan_retail", BUNDLE_DETAIL_PERIOD), {
      commodityId: "COM-0001",
      name: "Tomato",
      selectedPriceType: "bangkerohan_retail",
      currentPrice: 42.5,
      unitOfMeasure: "kg",
      recentRecords: DETAIL.recent_records,
      forecast: { horizonDays: 7, trend: "Rising" },
    });

    renderPage(client);

    await waitFor(() => expect(screen.getAllByText("Tomato").length).toBeGreaterThan(0));
    const detailCalls = apiGet.mock.calls.filter(([url]) =>
      String(url).includes("/prices/COM-0001?")
    );
    expect(detailCalls).toHaveLength(0);
  });

  it("still loads a cache-miss commodity through its own queryFn", async () => {
    const client = makeClient();
    parseResponse.mockImplementation(async (res) => (res.payload ? res.payload : DETAIL));

    renderPage(client);

    // The deep-linked commodity is not in the bundle, so the page's queryFn runs.
    await waitFor(() => {
      const calls = apiGet.mock.calls.filter(([url]) =>
        String(url).includes("/prices/COM-0001?")
      );
      expect(calls).toHaveLength(1);
    });
    const [url] = apiGet.mock.calls.find(([u]) => String(u).includes("/prices/COM-0001?"));
    expect(url).toBe(
      "/prices/COM-0001?price_type=bangkerohan_retail&horizon=7&records_limit=5"
    );
    await waitFor(() => expect(screen.getAllByText("Tomato").length).toBeGreaterThan(0));
  });

  it("fetches on demand when the period chip moves off the bundled horizon", async () => {
    const client = makeClient();
    client.setQueryData(
      priceDetailKey("COM-0001", "bangkerohan_retail", BUNDLE_DETAIL_PERIOD),
      {
        commodityId: "COM-0001",
        name: "Tomato",
        selectedPriceType: "bangkerohan_retail",
        currentPrice: 42.5,
        unitOfMeasure: "kg",
        recentRecords: DETAIL.recent_records,
        forecast: { horizonDays: 7, trend: "Rising" },
      }
    );
    parseResponse.mockResolvedValue({ ...DETAIL, forecast: { horizon_days: 14 } });

    const user = userEvent.setup();
    renderPage(client);
    await waitFor(() => expect(screen.getAllByText("Tomato").length).toBeGreaterThan(0));

    const chip14 = screen.getByText("14 days");
    await user.click(chip14);

    await waitFor(() => {
      const calls = apiGet.mock.calls.filter(([url]) =>
        String(url).includes("horizon=14")
      );
      expect(calls).toHaveLength(1);
    });
  });
});
