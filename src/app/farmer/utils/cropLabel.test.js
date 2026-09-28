/**
 * Tests for crop label formatting.
 *
 * The planting rules are keyed on (crop, variety, county, season), so "Carrots"
 * alone is ambiguous: Big, Medium and Small are scored independently and can
 * return different verdicts for the same forecast. Every farmer-facing label
 * must therefore carry the variety when one exists.
 */
import { describe, it, expect } from "vitest";
import { cropLabelOf, formatCropLabel } from "./formatters";

describe("formatCropLabel", () => {
  it("appends the variety in parentheses", () => {
    expect(formatCropLabel("Ampalaya", "Galaxy")).toBe("Ampalaya (Galaxy)");
    expect(formatCropLabel("Carrots", "Big")).toBe("Carrots (Big)");
  });

  it("returns the bare name when there is no variety", () => {
    expect(formatCropLabel("Baguio Beans", null)).toBe("Baguio Beans");
    expect(formatCropLabel("Baguio Beans", undefined)).toBe("Baguio Beans");
    expect(formatCropLabel("Baguio Beans", "")).toBe("Baguio Beans");
    expect(formatCropLabel("Baguio Beans", "   ")).toBe("Baguio Beans");
  });

  it("does not produce a dangling empty bracket for a blank variety", () => {
    expect(formatCropLabel("Cabbage", "  ")).toBe("Cabbage");
    expect(formatCropLabel("Cabbage", null)).not.toContain("(");
  });

  it("trims stray whitespace from both halves", () => {
    expect(formatCropLabel("  Kalabasa  ", "  Suprema  ")).toBe("Kalabasa (Suprema)");
  });

  it("uses the fallback when the name is missing", () => {
    expect(formatCropLabel(null, "Galaxy")).toBe("–");
    expect(formatCropLabel("", "Galaxy")).toBe("–");
    expect(formatCropLabel(null, "Galaxy", "COM-1")).toBe("COM-1");
  });

  it("keeps a multi-word variety intact", () => {
    expect(formatCropLabel("Kamatis", "Diamante Big")).toBe("Kamatis (Diamante Big)");
  });
});

describe("cropLabelOf", () => {
  it("reads a snake_case API record", () => {
    expect(
      cropLabelOf({ commodity_name: "Carrots", commodity_variety: "Medium" }),
    ).toBe("Carrots (Medium)");
  });

  it("reads a camelCase normalized record", () => {
    expect(cropLabelOf({ name: "Carrots", variety: "Small" })).toBe("Carrots (Small)");
  });

  it("handles a record with only a name", () => {
    expect(cropLabelOf({ commodity_name: "Lettuce", commodity_variety: null })).toBe(
      "Lettuce",
    );
  });

  it("returns the fallback for a missing record", () => {
    expect(cropLabelOf(null)).toBe("–");
    expect(cropLabelOf({})).toBe("–");
  });
});
