/**
 * FarmerSettings Danger Zone — account-erasure grace, cancel and export.
 *
 * The backend now returns `fulfillment_due_at` / `fulfilled_at` next to the
 * status, and exposes an owner-only cancel route. This pins the three states
 * the farmer can actually be in from that row:
 *
 *  1. approved + no `fulfilled_at` → account disabled, grace note + Cancel.
 *  2. `fulfilled_at` set          → terminal, nothing left to cancel or block.
 *  3. otherwise                   → plain request button.
 *
 * Plus the "Export my data" download, which is the only way a farmer gets their
 * own data back out before the row is fulfilled.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import FarmerSettings from "../app/farmer/pages/FarmerSettings";

const h = vi.hoisted(() => ({
  // The requester's own `GET /dftc/removal-requests` rows.
  removalItems: [],
  refetches: 0,
  invalidated: [],
}));

// Language is pinned to English deliberately: the fallbacks these assertions
// read are the English copy, so a Cebuano default would prove nothing about it.
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

// One useQuery per tab of data: the removal rows come from the seeded list, the
// profile query stays empty so the account form renders from the auth user.
vi.mock("@tanstack/react-query", () => ({
  QueryClient: class {
    constructor() {}
  },
  useQueryClient: () => ({
    invalidateQueries: (q) => h.invalidated.push(q),
    getQueryData: vi.fn(),
    setQueryData: vi.fn(),
  }),
  useQuery: ({ queryKey }) => {
    if (queryKey?.[1] === "removalRequests") {
      return {
        data: { items: h.removalItems },
        isLoading: false,
        refetch: () => {
          h.refetches += 1;
        },
      };
    }
    return { data: null, isLoading: false, refetch: vi.fn() };
  },
}));

// jsdom does not implement scrollIntoView, which the settings tab bar calls on
// mount — pin it to a no-op or the page never renders. It also implements
// neither half of a blob download.
const originalScrollIntoView = Element.prototype.scrollIntoView;
const createdAnchors = [];

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  h.removalItems = [];
  h.refetches = 0;
  h.invalidated = [];
  createdAnchors.length = 0;
  window.fetch = vi.fn();
  globalThis.URL.createObjectURL = vi.fn(() => "blob:harvestwise");
  globalThis.URL.revokeObjectURL = vi.fn();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function patched() {
    createdAnchors.push(this);
  });
});

afterEach(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
  vi.restoreAllMocks();
});

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={["/farmer/settings?tab=account"]}>
      <FarmerSettings />
    </MemoryRouter>
  );

const removalRow = (overrides = {}) => ({
  id: "r1",
  status: "approved",
  requested_at: "2026-10-01T00:00:00Z",
  fulfillment_due_at: "2026-10-15T00:00:00Z",
  ...overrides,
});

function jsonFetch(body, { ok = true, status = 200 } = {}) {
  return vi.fn(async () => ({ ok, status, json: async () => body }));
}

describe("FarmerSettings account-erasure Danger Zone", () => {
  it("shows the grace note and a Cancel button while an approved request is unfulfilled", () => {
    h.removalItems = [removalRow()];
    renderSettings();

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(
      screen.getByText(/will be erased after the grace period on/i)
    ).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Cancel request" })).toBeInTheDocument();
    // An approved request is still blocking a duplicate submission.
    expect(screen.getByRole("button", { name: "Request removal" })).toBeDisabled();
  });

  it("cancels through the owner route and refetches on success", async () => {
    h.removalItems = [removalRow()];
    window.fetch = jsonFetch({ id: "r1", status: "cancelled" });
    renderSettings();

    await userEvent.click(screen.getByRole("button", { name: "Cancel request" }));

    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(1));
    const [url, init] = window.fetch.mock.calls[0];
    expect(String(url)).toContain("/dftc/removal-requests/r1/cancel");
    expect(init.method).toBe("POST");
    await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument());
    expect(h.refetches).toBeGreaterThan(0);
  });

  it("reports the failure and leaves the request blocking when the cancel is refused", async () => {
    h.removalItems = [removalRow()];
    window.fetch = jsonFetch(
      { detail: "Grace period has ended" },
      { ok: false, status: 409 }
    );
    renderSettings();

    await userEvent.click(screen.getByRole("button", { name: "Cancel request" }));

    expect(
      await screen.findByText("Grace period has ended")
    ).toBeInTheDocument();
    // Still in the grace state — the request was not actually cancelled.
    expect(screen.getByText(/will be erased after the grace period on/i)).toBeInTheDocument();
  });

  it("renders the completed note and no Cancel button once the row is fulfilled", () => {
    h.removalItems = [removalRow({ fulfilled_at: "2026-10-20T00:00:00Z" })];
    renderSettings();

    expect(
      screen.getByText("Your account removal request has been fulfilled.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel request" })).not.toBeInTheDocument();
    // Fulfilled is terminal: it must not keep blocking a fresh request.
    expect(screen.getByRole("button", { name: "Request removal" })).toBeEnabled();
  });

  it("downloads the caller's own data as harvestwise-data-export.json", async () => {
    window.fetch = jsonFetch({ farmer: { first_name: "Juan" } });
    renderSettings();

    await userEvent.click(screen.getByRole("button", { name: "Export my data" }));

    await waitFor(() => expect(window.fetch).toHaveBeenCalledTimes(1));
    expect(String(window.fetch.mock.calls[0][0])).toContain("/dftc/data-export");
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(createdAnchors).toHaveLength(1);
    expect(createdAnchors[0].getAttribute("download")).toBe(
      "harvestwise-data-export.json"
    );
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith("blob:harvestwise");
  });

  it("toasts an error when the export download fails", async () => {
    window.fetch = jsonFetch(
      { detail: "boom" },
      { ok: false, status: 500 }
    );
    renderSettings();

    await userEvent.click(screen.getByRole("button", { name: "Export my data" }));

    expect(
      await screen.findByText("Could not download your data. Please try again.")
    ).toBeInTheDocument();
    expect(globalThis.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("keeps the modal retention disclosure and the support mailto", async () => {
    h.removalItems = [];
    renderSettings();

    await userEvent.click(screen.getByRole("button", { name: "Request removal" }));

    // What is deleted *and* what is kept must both be disclosed.
    expect(
      await screen.findByText(
        /Agricultural, crop, cost, or harvest information may be retained only after it is anonymised/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Privacy Policy §8/)).toBeInTheDocument();

    const mailto = document.querySelector('a[href^="mailto:"]');
    expect(mailto).not.toBeNull();
    expect(mailto.textContent).toContain("harvestwise.app@gmail.com");
  });
});
