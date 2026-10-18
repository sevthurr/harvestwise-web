import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router";

const { getArrivalPressureMock, getSeasonalProductionMock, cropState } = vi.hoisted(() => ({
  getArrivalPressureMock: vi.fn(),
  getSeasonalProductionMock: vi.fn(),
  cropState: { current: null },
}));

vi.mock("../services/api/analyticsApi.js", () => ({
  getArrivalPressure: getArrivalPressureMock,
  getHistoricalSeasonalProduction: getSeasonalProductionMock,
}));

vi.mock("../app/farmer/components/crops/CropsContext.jsx", () => ({
  useCrops: () => ({ crops: cropState.current ? [cropState.current] : [], loading: false }),
}));

vi.mock("../app/global/contexts/LanguageContext.jsx", () => ({
  useLanguage: () => ({
    t: (key, params = {}, fallback = key) =>
      fallback.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? `{${name}}`)),
  }),
}));

vi.mock("recharts", () => {
  const ChartContainer = ({ children }) => <div>{children}</div>;
  return {
    Bar: () => null,
    BarChart: ChartContainer,
    CartesianGrid: () => null,
    Cell: () => null,
    Line: () => null,
    LineChart: ChartContainer,
    ReferenceLine: () => null,
    ResponsiveContainer: ChartContainer,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

import CropArrivalPressureDetailsPage, { ArrivalVolumeTooltip } from "../app/farmer/pages/CropArrivalPressureDetails.jsx";
import CropSeasonalProductionDetailsPage from "../app/farmer/pages/CropSeasonalProductionDetails.jsx";

const crop = {
  id: "CRP-0001",
  commodity: "COM-0025",
  commodityId: "COM-0025",
  commodityName: "Lettuce",
  plantingDate: "2026-07-15",
  harvestDate: "2026-11-10",
};

function renderPage(path, page) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/farmer/crops/:cropId/arrival-pressure" element={page === "arrival" ? <CropArrivalPressureDetailsPage /> : null} />
          <Route path="/farmer/crops/:cropId/seasonal-production" element={page === "production" ? <CropSeasonalProductionDetailsPage /> : null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  cropState.current = crop;
});

describe("Farmer crop factor details", () => {
  it("renders arrival history and summary from the shared backend output", async () => {
    getArrivalPressureMock.mockResolvedValue({
      status: "processed",
      classification: "High",
      source: "DFTC Arrival Volume",
      lookback_days: 90,
      commodity_name: "Lettuce",
      current_arrival_kg: 500,
      average_arrival_kg: 250,
      total_volume_kg: 1000,
      record_count: 2,
      records: [
        {
          arrival_date: "2026-10-01",
          volume_kg: 500,
          farm_source_volume_kg: 320,
          other_source_volume_kg: 180,
        },
        {
          arrival_date: "2026-10-02",
          volume_kg: 500,
          farm_source_volume_kg: 300,
          other_source_volume_kg: 200,
        },
      ],
    });

    renderPage("/farmer/crops/CRP-0001/arrival-pressure", "arrival");

    expect(await screen.findByText("Arrival pressure: High")).toBeInTheDocument();
    expect(screen.getByText("250 kg")).toBeInTheDocument();
    expect(screen.getByText(/Historical average/)).toBeInTheDocument();
    expect(getArrivalPressureMock).toHaveBeenCalledWith("COM-0025");
  });

  it("shows farm and other source amounts below arrival volume in the chart detail", () => {
    render(
      <ArrivalVolumeTooltip
        active
        label="2026-10-01"
        payload={[{
          payload: {
            volume_kg: 500,
            farm_source_volume_kg: 320,
            other_source_volume_kg: 180,
          },
        }]}
      />,
    );

    expect(screen.getByText("Arrival volume: 500 kg")).toBeInTheDocument();
    expect(screen.getByText("Farm source: 320 kg")).toBeInTheDocument();
    expect(screen.getByText("Other sources: 180 kg")).toBeInTheDocument();
  });

  it("does not make up source amounts when a record does not report them", () => {
    render(
      <ArrivalVolumeTooltip
        active
        label="2026-10-01"
        payload={[{ payload: { volume_kg: 500 } }]}
      />,
    );

    expect(screen.getByText("Farm source: Not reported")).toBeInTheDocument();
    expect(screen.getByText("Other sources: Not reported")).toBeInTheDocument();
  });

  it("uses the crop's harvest quarter and shared seasonal production output", async () => {
    getSeasonalProductionMock.mockResolvedValue({
      status: "processed",
      classification: "High",
      source: "PSA OpenSTAT",
      season: "Q4",
      years_covered: "2022–2025",
      grand_average_quarterly_mt: 100,
      quarterly_profiles: [
        { quarter: "Q4", classification: "High", average_production_mt: 125, years_available: 4 },
      ],
      records: [
        { reference_year: 2024, reference_quarter: "Q4", volume_produced: 120 },
        { reference_year: 2025, reference_quarter: "Q4", volume_produced: 130 },
      ],
    });

    renderPage("/farmer/crops/CRP-0001/seasonal-production", "production");

    expect(await screen.findByText("Production level: High")).toBeInTheDocument();
    expect(screen.getByText("125 MT")).toBeInTheDocument();
    expect(getSeasonalProductionMock).toHaveBeenCalledWith("COM-0025", "Q4");
  });

  it("shows missing production data without a fabricated production value", async () => {
    getSeasonalProductionMock.mockResolvedValue({
      status: "not_processed",
      classification: null,
      message: "No production history is available.",
      quarterly_profiles: [],
      records: [],
    });

    renderPage("/farmer/crops/CRP-0001/seasonal-production", "production");

    expect(await screen.findByText("Production level: No Data")).toBeInTheDocument();
    expect(screen.getByText("No historical production data available for this period.")).toBeInTheDocument();
    expect(screen.queryByText("0 MT")).not.toBeInTheDocument();
  });
});
