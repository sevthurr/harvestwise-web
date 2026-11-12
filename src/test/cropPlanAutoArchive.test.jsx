import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { isArchivedCrop, normalizeCropPlan, ARCHIVED_STATUSES } from "../app/farmer/components/crops/CropsContext";
import { matchesStage, MyCropsEmpty, STAGE_TABS } from "../app/farmer/pages/MyCrops";
import { LanguageProvider } from "../app/global/contexts/LanguageContext";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, vars, fallback) => fallback || key,
    language: "en",
  }),
  LanguageProvider: ({ children }) => children,
}));

describe("Crop Plan Auto-Archive — Logic & Filtering", () => {
  const activePlan = {
    id: "CRP-0001",
    status: "Planted",
    phase: "growing",
    isArchived: false,
    archivedAt: null,
  };

  const completedPlan = {
    id: "CRP-0002",
    status: "Completed",
    phase: "completed",
    isArchived: true,
    archivedAt: "2026-11-10T10:00:00Z",
  };

  const cancelledPlan = {
    id: "CRP-0003",
    status: "Cancelled",
    phase: "completed",
    isArchived: true,
    archivedAt: "2026-11-10T11:00:00Z",
  };

  const legacyCompletedPlan = {
    id: "CRP-0004",
    status: "Completed",
    phase: "completed",
  };

  describe("isArchivedCrop helper", () => {
    it("identifies Completed and Cancelled statuses as archived", () => {
      expect(isArchivedCrop(completedPlan)).toBe(true);
      expect(isArchivedCrop(cancelledPlan)).toBe(true);
      expect(isArchivedCrop(legacyCompletedPlan)).toBe(true);
    });

    it("identifies plans with isArchived or archivedAt flag as archived", () => {
      expect(isArchivedCrop({ status: "Planning", isArchived: true })).toBe(true);
      expect(isArchivedCrop({ status: "Harvesting", archivedAt: "2026-11-10" })).toBe(true);
    });

    it("returns false for active crop plans", () => {
      expect(isArchivedCrop(activePlan)).toBe(false);
      expect(isArchivedCrop({ status: "Planning", phase: "planning" })).toBe(false);
      expect(isArchivedCrop({ status: "Draft", phase: "draft" })).toBe(false);
      expect(isArchivedCrop({ status: "Pre-Harvest", phase: "pre-harvest" })).toBe(false);
      expect(isArchivedCrop({ status: "Harvesting", phase: "harvested" })).toBe(false);
      expect(isArchivedCrop({ status: "On Hold", phase: "planning" })).toBe(false);
      expect(isArchivedCrop(null)).toBe(false);
    });
  });

  describe("normalizeCropPlan archive normalization", () => {
    it("sets isArchived and archivedAt for completed plan", () => {
      const normalized = normalizeCropPlan({
        id: "CRP-0010",
        status: "Completed",
        archived_at: "2026-11-10T12:00:00Z",
      });
      expect(normalized.isArchived).toBe(true);
      expect(normalized.archivedAt).toBe("2026-11-10T12:00:00Z");
    });

    it("falls back to status Completed when archived_at is absent", () => {
      const normalized = normalizeCropPlan({
        id: "CRP-0011",
        status: "Completed",
      });
      expect(normalized.isArchived).toBe(true);
    });
  });

  describe("My Crops stage filtering & tabs", () => {
    it("includes 'archived' tab replacing 'completed'", () => {
      const tabIds = STAGE_TABS.map((t) => t.id);
      expect(tabIds).toContain("archived");
      expect(tabIds).not.toContain("completed");
    });

    it("hides completed and cancelled plans from 'all' tab", () => {
      expect(matchesStage(activePlan, "all")).toBe(true);
      expect(matchesStage(completedPlan, "all")).toBe(false);
      expect(matchesStage(cancelledPlan, "all")).toBe(false);
      expect(matchesStage(legacyCompletedPlan, "all")).toBe(false);
    });

    it("shows completed and cancelled plans under 'archived' tab", () => {
      expect(matchesStage(completedPlan, "archived")).toBe(true);
      expect(matchesStage(cancelledPlan, "archived")).toBe(true);
      expect(matchesStage(legacyCompletedPlan, "archived")).toBe(true);
      expect(matchesStage(activePlan, "archived")).toBe(false);
    });

    it("excludes archived plans from active stage tabs (planted, harvesting, planning)", () => {
      expect(matchesStage(completedPlan, "planted")).toBe(false);
      expect(matchesStage(completedPlan, "harvesting")).toBe(false);
      expect(matchesStage(completedPlan, "planning")).toBe(false);
      expect(matchesStage(cancelledPlan, "planning")).toBe(false);
    });
  });

  describe("MyCropsEmpty state for Archived tab", () => {
    it("displays appropriate messaging and hides Add Crop button when on archived tab", () => {
      render(
        <LanguageProvider>
          <MyCropsEmpty stage="archived" onNew={vi.fn()} />
        </LanguageProvider>
      );

      expect(screen.getByText("No archived crop plans.")).toBeInTheDocument();
      expect(
        screen.getByText("Completed and cancelled crop plans will be archived here.")
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add crop/i })).not.toBeInTheDocument();
    });

    it("displays Add Crop button on active tabs when empty", () => {
      render(
        <LanguageProvider>
          <MyCropsEmpty stage="all" onNew={vi.fn()} />
        </LanguageProvider>
      );

      expect(screen.getByRole("button", { name: /Add crop/i })).toBeInTheDocument();
    });
  });
});

