import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

vi.mock("../app/global/api", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  parseResponse: vi.fn(),
}));

vi.mock("../app/farmer/components/crops/CropsContext", async () => {
  const actual = await vi.importActual("../app/farmer/components/crops/CropsContext");
  return {
    ...actual,
    useCrops: vi.fn(() => ({
      crops: [],
      loading: false,
      refreshCrops: vi.fn(),
    })),
  };
});

const LOCAL_DRAFT = {
  commodity: "cabbage",
  commodityId: "cabbage",
  commodityName: "Cabbage",
  plantingDate: "2026-12-01",
  harvestDate: "2027-02-01",
  isDraft: true,
  draftId: null,
};

// Stable references: AssessPage re-runs its resume effect when `crops` changes
// identity, so a fresh array per `useCrops()` call would loop forever.
const NO_CROPS = [];

function renderApp(ui, initialEntries) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
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
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

async function loadPages() {
  const { apiGet, parseResponse } = await import("../app/global/api");
  apiGet.mockResolvedValue({ ok: true, status: 200 });
  parseResponse.mockResolvedValue({});

  const { useCrops } = await import("../app/farmer/components/crops/CropsContext");
  useCrops.mockReturnValue({ crops: NO_CROPS, loading: false, refreshCrops: vi.fn() });

  const { default: MyCropsPage } = await import("../app/farmer/pages/MyCrops");
  const { default: AssessPage } = await import("../app/farmer/pages/Assess");
  return { MyCropsPage, AssessPage };
}

describe("Crop assessment offline behaviour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resumes a device-only draft prefilled instead of dropping it on the entry screen", async () => {
    const { MyCropsPage, AssessPage } = await loadPages();
    localStorage.setItem("harvestwise_assessment_draft", JSON.stringify(LOCAL_DRAFT));

    renderApp(
      <Routes>
        <Route path="/farmer/crops" element={<MyCropsPage />} />
        <Route path="/farmer/assess" element={<AssessPage />} />
      </Routes>,
      ["/farmer/crops"]
    );

    fireEvent.click(await screen.findByRole("button", { name: /Continue draft/i }));

    // The draft id must survive the navigation, so the assessment loads the
    // localStorage snapshot rather than showing the empty entry screen.
    expect(await screen.findByDisplayValue("2026-12-01")).toBeInTheDocument();
    expect(screen.getByText(/Draft – Incomplete/i)).toBeInTheDocument();
    expect(screen.queryByText(/Check what to plant/i)).not.toBeInTheDocument();
  });

  it("shows the offline banner on the assessment and keeps Save draft enabled", async () => {
    const { AssessPage } = await loadPages();
    localStorage.setItem("harvestwise_assessment_draft", JSON.stringify(LOCAL_DRAFT));

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    renderApp(<AssessPage />, ["/farmer/assess?resumeDraft=local_draft"]);

    expect(await screen.findByText(/You're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/save your progress as a draft on this device/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save draft/i })).toBeEnabled();
  });

  it("disables the advisory action and explains why while offline", async () => {
    const { StepActions } = await import("../app/farmer/pages/Assess");

    render(
      <StepActions
        step={4}
        isLastStep
        offline
        onGenerate={vi.fn()}
        onSaveDraft={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /See advisory/i })).toBeDisabled();
    expect(screen.getByText(/Connect to the internet to see your advisory and save this crop plan\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save draft/i })).toBeEnabled();
  });
});
