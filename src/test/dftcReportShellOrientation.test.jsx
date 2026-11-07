import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DFTCReportShell } from "../app/dftc/components/DFTCReportShell";

describe("DFTCReportShell Orientation Selector", () => {
  it("shows Landscape and Portrait selector when format is PDF", () => {
    const onOrientationChange = vi.fn();
    render(
      <DFTCReportShell
        title="Preview Test"
        format="PDF"
        onFormatChange={() => {}}
        orientation="portrait"
        onOrientationChange={onOrientationChange}
        showOrientation={true}
      >
        <div>Content</div>
      </DFTCReportShell>
    );

    expect(screen.getByRole("button", { name: "Landscape" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Portrait" })).toBeInTheDocument();
  });

  it("hides Landscape and Portrait selector when format is Excel", () => {
    const onOrientationChange = vi.fn();
    render(
      <DFTCReportShell
        title="Preview Test"
        format="Excel"
        onFormatChange={() => {}}
        orientation="portrait"
        onOrientationChange={onOrientationChange}
        showOrientation={true}
      >
        <div>Content</div>
      </DFTCReportShell>
    );

    expect(screen.queryByRole("button", { name: "Landscape" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Portrait" })).not.toBeInTheDocument();
  });

  it("hides Landscape and Portrait selector when format is IMG", () => {
    const onOrientationChange = vi.fn();
    render(
      <DFTCReportShell
        title="Preview Test"
        format="IMG"
        onFormatChange={() => {}}
        orientation="portrait"
        onOrientationChange={onOrientationChange}
        showOrientation={true}
      >
        <div>Content</div>
      </DFTCReportShell>
    );

    expect(screen.queryByRole("button", { name: "Landscape" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Portrait" })).not.toBeInTheDocument();
  });
});
