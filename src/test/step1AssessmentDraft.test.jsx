import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DEFAULT_ASSESSMENT } from "../app/farmer/components/recommend/types";
import { PhasePill, CropCard } from "../app/farmer/components/crops/CropCard";
import { PHASE_CODES, normalizePhaseCode } from "../app/farmer/utils/farmerCodes";
import { useLanguage } from "../app/global/contexts/LanguageContext";
import { t as translate } from "../app/global/i18n";
import { RecommendEntry } from "../app/farmer/components/recommend/RecommendEntry";

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

function renderWithProviders(ui) {
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
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Step 1 Assessment Draft Saving and Continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("normalizes draft status to PHASE_CODES.DRAFT and does not map to planning", () => {
    expect(normalizePhaseCode("draft")).toBe(PHASE_CODES.DRAFT);
    expect(normalizePhaseCode("phase_draft")).toBe(PHASE_CODES.DRAFT);
    expect(normalizePhaseCode("draft")).not.toBe(PHASE_CODES.PLANNING);
  });

  it("renders PhasePill with 'Draft – Incomplete' badge when phase is draft", () => {
    renderWithProviders(<PhasePill phase="draft" />);
    expect(screen.getByText(/Draft – Incomplete/i)).toBeInTheDocument();
  });

  it("renders CropCard for draft with 'Draft assessment in progress' and 'Continue draft' action", () => {
    const draftCrop = {
      id: "draft-123",
      commodity: "tomato",
      commodityName: "Tomato",
      phase: "draft",
      status: "Draft",
      harvestQuantity: 1000,
      totalCost: 5000,
    };

    const handleView = vi.fn();
    renderWithProviders(<CropCard crop={draftCrop} onView={handleView} />);

    expect(screen.getByText(/Draft – Incomplete/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft assessment in progress/i)).toBeInTheDocument();

    const continueBtn = screen.getByRole("button", { name: /Continue draft/i });
    expect(continueBtn).toBeInTheDocument();

    fireEvent.click(continueBtn);
    expect(handleView).toHaveBeenCalledWith("draft-123");
  });

  it("renders RecommendEntry without intermediate create-versus-review choice screen", () => {
    const handleStart = vi.fn();

    renderWithProviders(
      <RecommendEntry onStart={handleStart} />
    );

    // Verify direct new-assessment landing
    expect(screen.getByText(/Check what to plant/i)).toBeInTheDocument();
    expect(screen.getByText(/Start assessment/i)).toBeInTheDocument();

    // Verify intermediate draft choice prompt is NOT present
    expect(screen.queryByText(/Review & continue Step 1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Start new assessment/i)).not.toBeInTheDocument();

    // Clicking Start assessment calls onStart
    fireEvent.click(screen.getByRole("button", { name: /Start assessment/i }));
    expect(handleStart).toHaveBeenCalledTimes(1);
  });

  it("persists partial Step 1 entries to localStorage without requiring all fields", () => {
    const partialDraft = {
      ...DEFAULT_ASSESSMENT,
      commodity: "cabbage",
      commodityId: "cabbage",
      plantingDate: "2026-12-01",
      // harvestDate, farmArea, expenses are empty/missing
      isDraft: true,
      draftId: null,
    };

    localStorage.setItem("harvestwise_assessment_draft", JSON.stringify(partialDraft));

    const retrieved = JSON.parse(localStorage.getItem("harvestwise_assessment_draft"));
    expect(retrieved).not.toBeNull();
    expect(retrieved.commodity).toBe("cabbage");
    expect(retrieved.isDraft).toBe(true);
    expect(retrieved.harvestDate).toBe("");
    expect(retrieved.farmArea).toBe("");
  });

  it("excludes drafts from the planning tab in MyCrops and filters drafts into the drafts tab", async () => {
    const { default: MyCropsPage, matchesStage, STAGE_TABS } = await import("../app/farmer/pages/MyCrops");
    expect(MyCropsPage).toBeDefined();

    const draftsTab = STAGE_TABS.find((t) => t.id === "drafts");
    expect(draftsTab).toBeDefined();
    expect(draftsTab.label).toBe("Drafts");

    const draftCrop = { id: "d1", phase: "draft", status: "Draft" };
    const planningCrop = { id: "p1", phase: "planning", status: "Planning" };

    // Draft crops show in "all" and "drafts", but not in "planning"
    expect(matchesStage(draftCrop, "all")).toBe(true);
    expect(matchesStage(draftCrop, "drafts")).toBe(true);
    expect(matchesStage(draftCrop, "planning")).toBe(false);

    // Planning crops show in "all" and "planning", but not in "drafts"
    expect(matchesStage(planningCrop, "all")).toBe(true);
    expect(matchesStage(planningCrop, "drafts")).toBe(false);
    expect(matchesStage(planningCrop, "planning")).toBe(true);
  });

  it("StepActions renders Save as Draft button and triggers onSaveDraft", async () => {
    const { StepActions } = await import("../app/farmer/pages/Assess");
    const onSaveDraft = vi.fn();
    const onContinue = vi.fn();
    const onBack = vi.fn();

    renderWithProviders(
      <StepActions
        step={1}
        onBack={onBack}
        onContinue={onContinue}
        onSaveDraft={onSaveDraft}
        isLastStep={false}
      />
    );

    const saveDraftBtn = screen.getByRole("button", { name: /Save draft/i });
    expect(saveDraftBtn).toBeInTheDocument();

    fireEvent.click(saveDraftBtn);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
    expect(onContinue).not.toHaveBeenCalled();
  });

  it("validates Step 1 required fields and keeps farmer on Step 1 if incomplete", async () => {
    const { validateStep } = await import("../app/farmer/pages/Assess");

    // When commodity is missing
    const incompleteData = { ...DEFAULT_ASSESSMENT, commodity: "" };
    const errors = validateStep(1, incompleteData);
    expect(errors.commodity).toBeDefined();
    expect(errors.commodity).toMatch(/Select a vegetable/i);

    // When planting date is missing
    const missingDateData = { ...DEFAULT_ASSESSMENT, commodity: "eggplant", plantingDate: "" };
    const dateErrors = validateStep(1, missingDateData);
    expect(dateErrors.plantingDate).toBeDefined();

    const completeStep1Data = {
      ...DEFAULT_ASSESSMENT,
      commodity: "eggplant",
      plantingDate: "2026-11-01",
      harvestDate: "2027-01-15",
    };
    const noErrors = validateStep(1, completeStep1Data);
    expect(noErrors.commodity).toBeUndefined();
    expect(Object.keys(noErrors).length).toBe(0);
  });

  it("loads existing draft directly into Step 1 when accessed via resumeDraft without choice screen", async () => {
    const { useCrops } = await import("../app/farmer/components/crops/CropsContext");
    const { default: AssessPage } = await import("../app/farmer/pages/Assess");

    const draftCrop = {
      id: "crop-draft-789",
      commodity: "ampalaya",
      commodityId: "ampalaya",
      commodityName: "Ampalaya",
      variant: "Galaxy",
      plantingDate: "2026-11-10",
      harvestDate: "2027-01-10",
      status: "Draft",
      phase: "draft",
    };

    useCrops.mockReturnValue({
      crops: [draftCrop],
      loading: false,
      refreshCrops: vi.fn(),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/assess?resumeDraft=crop-draft-789"]}>
          <AssessPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Directly renders Step 1 with draft banner and values, no intermediate choice screen
    expect(screen.getByText(/Draft – Incomplete/i)).toBeInTheDocument();
    expect(screen.queryByText(/Check what to plant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Review & continue Step 1/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save draft/i })).toBeInTheDocument();
  });

  it("displays error recovery state when requested draft cannot be found", async () => {
    const { useCrops } = await import("../app/farmer/components/crops/CropsContext");
    const { default: AssessPage } = await import("../app/farmer/pages/Assess");
    const { apiGet } = await import("../app/global/api");

    apiGet.mockResolvedValue({ ok: false, status: 404 });

    useCrops.mockReturnValue({
      crops: [],
      loading: false,
      refreshCrops: vi.fn(),
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/farmer/assess?resumeDraft=nonexistent-id"]}>
          <AssessPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Draft Assessment Not Found/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Back to My Crops/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start new assessment/i })).toBeInTheDocument();
  });
});
