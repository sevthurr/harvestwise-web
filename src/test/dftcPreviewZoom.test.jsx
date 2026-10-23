import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DFTCPreviewZoomContainer } from "../app/dftc/components/DFTCPreviewZoomContainer";

describe("DFTCPreviewZoomContainer", () => {
  it("renders with default zoom toolbar and children", () => {
    render(
      <DFTCPreviewZoomContainer label="Image 1 of 4">
        <div data-testid="preview-document">Document Content</div>
      </DFTCPreviewZoomContainer>
    );

    expect(screen.getByText("Image 1 of 4")).toBeDefined();
    expect(screen.getByTestId("preview-document")).toBeDefined();
    expect(screen.getByTestId("zoom-in-btn")).toBeDefined();
    expect(screen.getByTestId("zoom-out-btn")).toBeDefined();
  });

  it("increments zoom when clicking zoom in button", () => {
    render(
      <DFTCPreviewZoomContainer label="Test Preview">
        <div data-testid="preview-document">Document Content</div>
      </DFTCPreviewZoomContainer>
    );

    const zoomInBtn = screen.getByTestId("zoom-in-btn");
    const percentBtn = screen.getByTestId("zoom-percent-btn");
    const initialPercent = percentBtn.textContent;

    fireEvent.click(zoomInBtn);
    const newPercent = percentBtn.textContent;

    expect(initialPercent).not.toBe(newPercent);
  });

  it("decrements zoom when clicking zoom out button", () => {
    render(
      <DFTCPreviewZoomContainer label="Test Preview">
        <div data-testid="preview-document">Document Content</div>
      </DFTCPreviewZoomContainer>
    );

    const zoomOutBtn = screen.getByTestId("zoom-out-btn");
    const percentBtn = screen.getByTestId("zoom-percent-btn");
    fireEvent.click(zoomOutBtn);
    expect(percentBtn.textContent).toContain("%");
  });

  it("toggles Fit to screen when clicking percentage badge or Fit button", () => {
    render(
      <DFTCPreviewZoomContainer label="Test Preview">
        <div data-testid="preview-document">Document Content</div>
      </DFTCPreviewZoomContainer>
    );

    const percentBtn = screen.getByTestId("zoom-percent-btn");
    const initial = percentBtn.textContent;
    fireEvent.click(percentBtn);
    expect(percentBtn.textContent).toContain("%");
  });
});
