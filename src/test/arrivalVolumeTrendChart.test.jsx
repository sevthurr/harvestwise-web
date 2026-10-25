import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { ArrivalVolumeTrendChart } from "../app/global/components/shared/ArrivalVolumeTrendChart";

vi.mock("../app/global/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key, params, fallback) => fallback || key,
    langCode: "en",
  }),
}));

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="chart-container">
        {typeof children === "function" ? children({ width: 500, height: 300 }) : children}
      </div>
    ),
    BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    Tooltip: () => null,
    CartesianGrid: () => null,
    ReferenceLine: () => null,
    Bar: () => null,
    Cell: () => null,
    Brush: ({ startIndex, endIndex, dataKey }) => (
      <div
        data-testid="chart-brush"
        data-start={startIndex}
        data-end={endIndex}
        data-key={dataKey}
      />
    ),
  };
});

describe("ArrivalVolumeTrendChart timeframe default range", () => {
  const generateDates = (startIso, count) => {
    const list = [];
    const base = new Date(startIso);
    for (let i = 0; i < count; i++) {
      const d = new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000);
      list.push({
        month: d.toISOString().split("T")[0],
        Volume: 100 + (i % 5) * 50,
      });
    }
    return list;
  };

  it("defaults range to timeframe of crop plan when planting and harvest dates are given", () => {
    // 40 weeks spanning from 2025-03-01 to 2025-12-06
    const data = generateDates("2025-03-01", 40);

    // Crop plan from 2026-08-01 to 2026-10-15 (projected to 2025-08-01 - 2025-10-15)
    render(
      <ArrivalVolumeTrendChart
        commodity="Carrots"
        chartData={data}
        varietyKeys={["Volume"]}
        sourceType="Actual Arrivals"
        plantingDate="2026-08-01"
        expectedHarvestDate="2026-10-15"
      />
    );

    const brush = screen.getByTestId("chart-brush");
    const start = Number(brush.getAttribute("data-start"));
    const end = Number(brush.getAttribute("data-end"));

    // The brush must NOT span from 0 to 39 (the whole year)
    expect(start).toBeGreaterThan(0);
    expect(end).toBeLessThan(39);

    // Records at start and end should encompass August to October
    const startDate = data[start].month;
    const endDate = data[end].month;
    expect(startDate <= "2025-08-15").toBe(true);
    expect(endDate >= "2025-10-01").toBe(true);
  });

  it("defaults to 90-day lookback window when no crop plan timeframe is provided and dataset spans a long period", () => {
    const data = generateDates("2025-01-01", 35);

    render(
      <ArrivalVolumeTrendChart
        commodity="Carrots"
        chartData={data}
        varietyKeys={["Volume"]}
        sourceType="Actual Arrivals"
      />
    );

    const brush = screen.getByTestId("chart-brush");
    const start = Number(brush.getAttribute("data-start"));
    const end = Number(brush.getAttribute("data-end"));

    // 90 days before late August 2025 starts around week 22
    expect(start).toBe(22);
    expect(end).toBe(34);
  });

  it("defaults to full date coverage when dataset has 30 or fewer records", () => {
    const data = Array.from({ length: 25 }, (_, i) => ({
      index: i,
      Volume: 100 + i,
    }));

    render(
      <ArrivalVolumeTrendChart
        commodity="Carrots"
        chartData={data}
        varietyKeys={["Volume"]}
        xDataKey="index"
      />
    );

    const brush = screen.getByTestId("chart-brush");
    const start = Number(brush.getAttribute("data-start"));
    const end = Number(brush.getAttribute("data-end"));

    expect(start).toBe(0);
    expect(end).toBe(24);
  });

  it("defaults to recent 20 records when large dataset does not have parseable dates", () => {
    const data = Array.from({ length: 35 }, (_, i) => ({
      index: i,
      Volume: 100 + i,
    }));

    render(
      <ArrivalVolumeTrendChart
        commodity="Carrots"
        chartData={data}
        varietyKeys={["Volume"]}
        xDataKey="index"
      />
    );

    const brush = screen.getByTestId("chart-brush");
    const start = Number(brush.getAttribute("data-start"));
    const end = Number(brush.getAttribute("data-end"));

    expect(start).toBe(15);
    expect(end).toBe(34);
  });
});
