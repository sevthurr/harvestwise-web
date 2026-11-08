import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DFTCFacebookImageCard } from "../app/dftc/components/DFTCFacebookImageCard";

describe("DFTCFacebookImageCard", () => {
  const mockCategories = [
    {
      name: "Lowland Vegetables",
      commodities: [
        {
          no: 1,
          name: "Ampalaya",
          variants: [{ descriptor: "(Galaxy)", uom: "kg", bankLanding: "55.00", bankWholesale: "65.00", bankRetail: "85.00", dftcWholesale: "60.00", dftcRetail: "80.00" }]
        }
      ]
    }
  ];

  it("renders creative Facebook header with badges and Davao Food Terminal branding", () => {
    render(
      <DFTCFacebookImageCard
        pageIndex={0}
        totalPages={4}
        categories={mockCategories}
        reportDate="November 4, 2026"
        isLast={false}
      />
    );

    expect(screen.getByText("Davao Food Terminal Complex")).toBeInTheDocument();
    expect(screen.getByText("Price Monitoring")).toBeInTheDocument();
    expect(screen.getByText(/Prevailing Market Prices as of November 4, 2026/i)).toBeInTheDocument();
    expect(screen.getByText("Class A")).toBeInTheDocument();
  });

  it("renders category row with solid grey background", () => {
    render(
      <DFTCFacebookImageCard
        pageIndex={0}
        totalPages={4}
        categories={mockCategories}
        reportDate="November 4, 2026"
        isLast={false}
      />
    );

    const catCell = screen.getByText("Lowland Vegetables");
    expect(catCell).toBeInTheDocument();
    expect(catCell).toHaveStyle({ background: "#cbd5e1" });
  });

  it("renders Encoded by and Reviewed by signature block on the last image card", () => {
    render(
      <DFTCFacebookImageCard
        pageIndex={3}
        totalPages={4}
        categories={mockCategories}
        reportDate="November 4, 2026"
        personnel={{
          encodedBy: "IVY JOYCE P. BOLODO",
          encodedByRole: "Agri-Service & Related Worker I",
          reviewedBy: "CHRISTIAN JOEY PAUL M. HERMOSO",
          reviewedByRole: "Agricultural Technologist"
        }}
        isLast={true}
      />
    );

    expect(screen.getByText("IVY JOYCE P. BOLODO")).toBeInTheDocument();
    expect(screen.getByText("Agri-Service & Related Worker I")).toBeInTheDocument();
    expect(screen.getByText("CHRISTIAN JOEY PAUL M. HERMOSO")).toBeInTheDocument();
    expect(screen.getByText("Agricultural Technologist")).toBeInTheDocument();
  });
});

