import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", () => {
  const PassThrough = ({ children }) => <div>{children}</div>;
  return {
    PieChart: PassThrough,
    Pie: PassThrough,
    Cell: () => null,
    ResponsiveContainer: PassThrough,
    Tooltip: () => null,
  };
});

import { ArrivalSourcePieChart } from "../app/global/components/shared/ArrivalSourcePieChart";

describe("ArrivalSourcePieChart", () => {
  it("shows localized source names, calculated shares, and actual kilogram totals", () => {
    render(
      <ArrivalSourcePieChart
        data={[
          { name: "Farm source", value: 250, volumeKg: 250 },
          { name: "Other sources", value: 150, volumeKg: 150 },
        ]}
      />,
    );

    expect(screen.getByText("Farm source:")).toBeInTheDocument();
    expect(screen.getByText("62.5%")).toBeInTheDocument();
    expect(screen.getByText("(250 kg)")).toBeInTheDocument();
    expect(screen.getByText("Other sources:")).toBeInTheDocument();
    expect(screen.getByText("37.5%")).toBeInTheDocument();
    expect(screen.getByText("(150 kg)")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("keeps percentages correct when input values are already percentages", () => {
    render(
      <ArrivalSourcePieChart
        data={[
          { name: "Farm Source", value: 60, volumeKg: 600 },
          { name: "Other Sources", value: 40, volumeKg: 400 },
        ]}
      />,
    );

    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("(600 kg)")).toBeInTheDocument();
    expect(screen.getByText("(400 kg)")).toBeInTheDocument();
  });
});
