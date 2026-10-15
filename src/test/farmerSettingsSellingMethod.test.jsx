/**
 * FarmerSettings "Farm Profile" tab — what `PUT /farmer/profile` actually sends.
 *
 * `preferred_crops` and `selling_method_ids` are both replaced wholesale by the
 * backend: an explicit `[]` means "clear these", an omitted key means "leave
 * alone" (`farmer_profile_service.py` guards on `is not None`). The client
 * therefore has to resolve every id it sends, and must leave a key out entirely
 * whenever its lookup was incomplete.
 *
 * These tests assert the payload because every failure mode here is silent — the
 * save returns 200, the toast says success, and the value is gone on the next
 * load. Three lookup states are covered, because they fail differently:
 *
 *  1. nothing at all — failed fetch, empty response, or a cache entry past its
 *     7-day expiry;
 *  2. a *non-empty but partial* list — the subtler one, and the reason both keys
 *     sit behind a conditional spread instead of a plain `filter()`;
 *  3. a complete list, where an empty selection must still clear.
 *
 * State (2) is reachable without any failure at all: `/prices?is_top10=true` is
 * paginated at `page_size=50`, so a saved crop ranked past the first page is
 * dropped from the grid while `/farmer/profile` still reports it.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import FarmerSettings from "../app/farmer/pages/FarmerSettings";

// The seeded rows (api/scripts/seed_selling_methods.py). The client's
// DEFAULT_SELLING_OPTIONS share none of these labels, which is exactly what
// makes the fallback list unresolvable.
const SEEDED = [
  { id: "SLM-0001", label: "Trader / Viajero (Wholesale)" },
  { id: "SLM-0002", label: "Palengke / Retail (Local Market)" },
  { id: "SLM-0003", label: "Cooperative / Association" },
  { id: "SLM-0004", label: "Direct to Consumers / Farm Gate" },
];

const TRADING = "Trader / Viajero (Wholesale)";
const COOPERATIVE = "Cooperative / Association";

const TOP_PRICES = [
  { id: "COM-0001", name: "Tomato", base_name: null, is_top10: true },
  { id: "COM-0002", name: "Ampalaya", base_name: null, is_top10: true },
];

const h = vi.hoisted(() => ({
  profile: {},
  sellingMethods: [],
  priceItems: [],
  failSellingMethods: false,
  failPrices: false,
  /** Body of every PUT, in order. */
  puts: [],
}));

// Language is pinned to English so the assertions read the copy the component
// actually renders; a Cebuano default would prove nothing about it.
vi.mock("../app/global/contexts/LanguageContext", async () => {
  const { t, formatDate } = await import("../app/global/i18n");
  return {
    useLanguage: () => ({
      t: (key, params, fallback) => {
        const res = t(key, params, "en");
        return res === key && fallback ? fallback : res;
      },
      formatDate: (value, options) => formatDate(value, options, "en"),
      langCode: "en",
      effectiveLanguage: "en",
    }),
    LanguageProvider: ({ children }) => children,
  };
});

vi.mock("../app/global/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { first_name: "Juan", email: "juan@example.com" },
    logout: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {
    constructor() {}
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }),
  // `useFarmLocation` reads the Davao City barangay list through useQuery. An
  // empty result keeps the farm-location card inert and out of these assertions.
  useQuery: () => ({ data: null, isLoading: false, error: null, refetch: vi.fn() }),
}));

const originalScrollIntoView = Element.prototype.scrollIntoView;

function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => body };
}

function profileBody({ selling = [], crops = [], area = "" } = {}) {
  return {
    city: "Davao City",
    district: null,
    barangay: "",
    street: "",
    latitude: null,
    longitude: null,
    usual_selling_area_or_buyer: area,
    selling_methods: selling,
    preferred_crops: crops,
  };
}

beforeEach(() => {
  // jsdom implements neither scrollIntoView nor the focus bits the settings tab
  // bar touches on mount.
  Element.prototype.scrollIntoView = vi.fn();

  h.profile = profileBody({
    selling: [{ id: "SLM-0003", label: "Cooperative / Association" }],
  });
  h.sellingMethods = SEEDED;
  h.priceItems = TOP_PRICES;
  h.failSellingMethods = false;
  h.failPrices = false;
  h.puts = [];

  window.fetch = vi.fn(async (url, init) => {
    const href = String(url);
    const method = String(init?.method || "GET").toUpperCase();

    if (method === "PUT") {
      h.puts.push(init.body);
      return jsonResponse(h.profile);
    }
    if (href.includes("/prices?")) {
      if (h.failPrices) return jsonResponse({ detail: "boom" }, { ok: false, status: 500 });
      return jsonResponse({ items: h.priceItems, total: h.priceItems.length });
    }
    if (href.includes("/farmer/selling-methods")) {
      if (h.failSellingMethods) {
        return jsonResponse({ detail: "boom" }, { ok: false, status: 500 });
      }
      return jsonResponse(h.sellingMethods);
    }
    if (href.includes("/farmer/profile")) return jsonResponse(h.profile);
    throw new Error(`Unexpected ${method} ${href}`);
  });
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
});

const renderFarmTab = () =>
  render(
    <MemoryRouter initialEntries={["/farmer/settings?tab=farm"]}>
      <FarmerSettings />
    </MemoryRouter>
  );

/**
 * Open the confirm modal and save, then return the decoded PUT body.
 *
 * The two buttons differ by one capital: the page button renders the
 * `farmer.settings.save_changes` key ("Save Changes"), the modal confirm is a
 * literal ("Save changes"). Exact names separate them cleanly.
 */
async function saveFarmProfile() {
  await userEvent.click(
    await screen.findByRole("button", { name: "Save Changes", exact: true })
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Save changes", exact: true })
  );
  await waitFor(() => expect(h.puts.length).toBe(1));
  return JSON.parse(h.puts[0]);
}

describe("FarmerSettings farm profile — selling_method_ids", () => {
  it("resolves the selected label to its id", async () => {
    renderFarmTab();
    // Deliberately not the first row: an index-based lookup would coincidentally
    // agree here and the test would pass against a broken implementation.
    await userEvent.click(
      await screen.findByRole("button", { name: "Palengke / Retail (Local Market)" })
    );

    const body = await saveFarmProfile();
    expect(body.selling_method_ids).toEqual(["SLM-0002"]);
  });

  it("omits the key entirely when the lookup fails, rather than clearing", async () => {
    h.failSellingMethods = true;
    renderFarmTab();

    // The fallback labels render, but none of them is a real selling_method row.
    const fallback = await screen.findByRole("button", { name: "Directly in the market" });
    await userEvent.click(fallback);

    const body = await saveFarmProfile();
    // Absence, not []. Sending [] here would delete a correctly-saved method
    // because one fetch failed.
    expect(body).not.toHaveProperty("selling_method_ids");
    // And the farmer must not be told a write happened when none did.
    expect(await screen.findByText(/options could not be loaded/i)).toBeInTheDocument();
  });

  it("omits the key when a non-empty lookup does not contain the saved label", async () => {
    // The stale-cache case. The list is present but predates the label that
    // GET /farmer/profile now reports, so that option is not rendered at all
    // and the farmer never touches it — `selling.method` still names a label
    // `find` cannot resolve.
    h.sellingMethods = SEEDED.filter((m) => m.id !== "SLM-0003");
    renderFarmTab();

    await screen.findByRole("button", { name: TRADING });

    const body = await saveFarmProfile();
    expect(body).not.toHaveProperty("selling_method_ids");
  });

  it("sends [] when the farmer deselects the already-selected option", async () => {
    renderFarmTab();

    // SLM-0003 comes from GET /farmer/profile, so it renders pre-selected.
    await userEvent.click(
      await screen.findByRole("button", { name: COOPERATIVE })
    );

    const body = await saveFarmProfile();
    // An empty selection is a real deselect and must clear, not be omitted.
    expect(body.selling_method_ids).toEqual([]);
  });
});

describe("FarmerSettings farm profile — preferred_crops", () => {
  it("maps every saved crop name to its commodity id", async () => {
    h.profile = profileBody({
      selling: [{ id: "SLM-0003", label: "Cooperative / Association" }],
      crops: [{ commodity_id: "COM-0002", commodity_name: "Ampalaya", variety_name: null }],
    });
    renderFarmTab();

    await userEvent.click(await screen.findByRole("button", { name: "Tomato" }));

    const body = await saveFarmProfile();
    expect(body.preferred_crops).toEqual(
      expect.arrayContaining([{ commodity_id: "COM-0002" }, { commodity_id: "COM-0001" }])
    );
  });

  it("omits preferred_crops when the top-10 price lookup fails", async () => {
    h.profile = profileBody({
      crops: [{ commodity_id: "COM-0002", commodity_name: "Ampalaya", variety_name: null }],
    });
    h.failPrices = true;
    renderFarmTab();

    await screen.findByRole("button", { name: TRADING });

    const body = await saveFarmProfile();
    // availableCrops is empty, so nameToId resolves nothing. Sending [] would
    // delete every crop preference the farmer had saved.
    expect(body).not.toHaveProperty("preferred_crops");
  });

  it("omits preferred_crops when the price lookup omits one saved crop", async () => {
    // No failure: the top-10 page simply no longer lists Ampalaya, so the name
    // cannot be resolved to an id.
    h.profile = profileBody({
      crops: [{ commodity_id: "COM-0002", commodity_name: "Ampalaya", variety_name: null }],
    });
    h.priceItems = TOP_PRICES.filter((c) => c.name !== "Ampalaya");
    renderFarmTab();

    await screen.findByRole("button", { name: "Tomato" });

    const body = await saveFarmProfile();
    expect(body).not.toHaveProperty("preferred_crops");
  });
});