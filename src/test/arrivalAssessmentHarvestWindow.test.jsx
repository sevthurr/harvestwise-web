import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactorDetailTabs } from "../app/farmer/components/shared/FactorDetailTabs";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (_key, _params, fallback) => fallback || _key,
  }),
}));

vi.mock("../app/global/components/shared/ArrivalVolumeTrendChart", () => ({
  ArrivalVolumeTrendChart: (props) => (
    <div
      data-testid="arrival-volume-chart"
      data-harvest-label={props.harvestPeriodLabel}
      data-planting={props.plantingDate}
      data-harvest={props.expectedHarvestDate}
      data-records={JSON.stringify(props.chartData)}
    />
  ),
}));

vi.mock("../app/global/components/shared/ForecastPriceTrendChart", () => ({
  ForecastPriceTrendChart: () => <div data-testid="price-chart" />,
}));

vi.mock("../app/global/components/shared/HistoricalAveragePriceSection", () => ({
  HistoricalAveragePriceSection: (props) => (
    <div
      data-testid="historical-price-section"
      data-planting={props.plantingDate}
      data-harvest={props.expectedHarvestDate}
    />
  ),
}));

describe("Crop Plan Assessment Enhancement - Arrival Basis (Harvest Window Classification)", () => {
  const sampleQuartiles = { q1: 100, q2: 250, q3: 400 };

  const sampleArrivalRecords = [
    { arrival_date: "2025-01-10", volume_kg: 280, farm_source_volume_kg: 200, other_source_volume_kg: 80 },
    { arrival_date: "2025-01-20", volume_kg: 320, farm_source_volume_kg: 220, other_source_volume_kg: 100 },
    { arrival_date: "2025-02-15", volume_kg: 150, farm_source_volume_kg: 100, other_source_volume_kg: 50 },
    { arrival_date: "2025-11-15", volume_kg: 50, farm_source_volume_kg: 30, other_source_volume_kg: 20 },
    { arrival_date: "2025-12-15", volume_kg: 80, farm_source_volume_kg: 50, other_source_volume_kg: 30 },
  ];

  it("evaluates expected harvest window (January 2026) for arrival basis rather than planting date", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-11-12"
        expectedHarvestDate="2026-01-06"
        arrival={{
          records: sampleArrivalRecords,
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    // Header and Expected Harvest label must indicate January 2026
    expect(screen.getByText("ARRIVAL ASSESSMENT")).toBeInTheDocument();
    expect(screen.getByText("January 2026")).toBeInTheDocument();

    // In sampleArrivalRecords, January records are 280 and 320 (avg = 300)
    // 300 is between Q2 (250) and Q3 (400) -> Upper Middle, Q2 – Q3
    expect(screen.getByText("Upper Middle")).toBeInTheDocument();
    expect(screen.getByText("Q2 – Q3")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Historical arrivals during this harvest period fall between Q2 and Q3. This period typically experiences above-average market supply."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("classifies arrival volume < Q1 as Low", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-08-01"
        expectedHarvestDate="2025-11-20"
        arrival={{
          records: sampleArrivalRecords, // Nov record has 50 kg (< Q1 of 100)
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("< Q1")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Historical arrivals during this harvest period fall below the first quartile. This period typically experiences relatively lower market supply."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("classifies arrival volume between Q1 and Q2 as Lower Middle", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-01-01"
        expectedHarvestDate="2025-02-28"
        arrival={{
          records: sampleArrivalRecords, // Feb record has 150 kg (between Q1=100 and Q2=250)
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    expect(screen.getByText("Lower Middle")).toBeInTheDocument();
    expect(screen.getByText("Q1 – Q2")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Historical arrivals during this harvest period fall between Q1 and Q2. This period typically experiences below-average market supply."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("classifies arrival volume >= Q3 as High", () => {
    const highRecords = [
      { arrival_date: "2025-03-10", volume_kg: 550, farm_source_volume_kg: 400, other_source_volume_kg: 150 },
      ...sampleArrivalRecords,
    ];
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-01-01"
        expectedHarvestDate="2025-03-20"
        arrival={{
          records: highRecords,
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("≥ Q3")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Historical arrivals during this harvest period exceed Q3. This period typically experiences the highest levels of market supply and competition."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("computes classification dynamically even when fewer than 4 arrival records are available", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-11-12"
        expectedHarvestDate="2026-01-06"
        arrival={{
          records: [
            { arrival_date: "2025-01-10", volume_kg: 280 },
            { arrival_date: "2025-01-20", volume_kg: 320 },
            { arrival_date: "2025-02-15", volume_kg: 150 },
          ], // Only 3 records
        }}
      />
    );

    expect(screen.queryByText("Withheld")).not.toBeInTheDocument();
    expect(screen.getByText("Upper Middle")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Historical arrivals during this harvest period fall between Q2 and Q3. This period typically experiences above-average market supply."
      ).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("passes harvest period label to ArrivalVolumeTrendChart and allows toggling frequency view", () => {
    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-11-12"
        expectedHarvestDate="2026-01-06"
        arrival={{
          records: sampleArrivalRecords,
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    const chart = screen.getByTestId("arrival-volume-chart");
    expect(chart).toHaveAttribute("data-harvest-label", "January 2026");

    // Frequency toggle
    const select = screen.getByDisplayValue("Monthly");
    expect(select).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "weekly" } });
    expect(screen.getByDisplayValue("Weekly")).toBeInTheDocument();
  });

  it("displays year filter and filters chart data when multiple years exist", () => {
    const multiYearRecords = [
      ...sampleArrivalRecords,
      { arrival_date: "2026-01-10", volume_kg: 350, farm_source_volume_kg: 250, other_source_volume_kg: 100 },
      { arrival_date: "2026-02-15", volume_kg: 200, farm_source_volume_kg: 150, other_source_volume_kg: 50 },
    ];

    render(
      <FactorDetailTabs
        defaultTab="arrival"
        commodityName="Kamatis"
        plantingDate="2025-11-12"
        expectedHarvestDate="2026-01-06"
        arrival={{
          records: multiYearRecords,
          quartileThresholds: sampleQuartiles,
        }}
      />
    );

    // Year filter exists
    const yearSelect = screen.getByDisplayValue("All Years");
    expect(yearSelect).toBeInTheDocument();

    // Toggle year
    fireEvent.change(yearSelect, { target: { value: "2025" } });
    expect(screen.getByDisplayValue("2025")).toBeInTheDocument();
  });
});
