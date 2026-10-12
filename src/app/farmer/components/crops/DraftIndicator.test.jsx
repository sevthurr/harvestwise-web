import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { MyCropCard } from "../../pages/MyCrops";
import { PhasePill } from "./CropCard";

vi.mock("../../../global/contexts/LanguageContext", () => ({
  useLanguage: vi.fn(),
}));

const dummyCrop = (overrides = {}) => ({
  id: "cp1",
  commodity: "rice",
  commodityName: "Rice",
  variant: null,
  phase: "planning",
  isOnHold: false,
  status: "Draft",
  harvestDate: "2026-10-15",
  currentPrice: 15,
  ...overrides,
});

describe("Draft indicator", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  beforeEach(() => {
    useLanguage.mockReturnValue({
      langCode: "en",
      effectiveLanguage: "en",
      t: (key, _params, fallback) => {
        const map = {
          "farmer.phases.draft": "Draft",
          "farmer.phases.planning": "Planning",
          "farmer.phases.on_hold": "On Hold",
          "farmer.crops.harvest_on": "Harvest on",
          "farmer.crops.current_price": "Current price",
          "farmer.crops.view_crop": "View crop",
        };
        return map[key] || fallback || key;
      },
    });
  });

  it("renders Draft badge when status is Draft in PhasePill", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PhasePill phase="planning" isOnHold={false} status="Draft" />
      </QueryClientProvider>
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("still renders Planning for non-draft", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PhasePill phase="planning" isOnHold={false} status="Planning" />
      </QueryClientProvider>
    );
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("still renders On Hold for on-hold regardless", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <PhasePill phase="planning" isOnHold={true} status="Planning" />
      </QueryClientProvider>
    );
    expect(screen.getByText("On Hold")).toBeInTheDocument();
  });

  it("renders Draft badge in MyCropCard", () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MyCropCard crop={dummyCrop()} onView={() => {}} />
      </QueryClientProvider>
    );
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });
});