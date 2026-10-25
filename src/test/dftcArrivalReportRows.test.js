/**
 * Regression tests for the arrival-volume report row helpers.
 *
 * The printed sheet is now the whole active-commodity catalogue, so ~130 rows
 * print for a submission that recorded four. `rows.length` therefore stopped
 * meaning anything to a reader, and the "Records Included" badge switched to
 * counting rows that actually carry data — the same rule
 * `countPopulatedPriceRows` uses on the price side (DFTCFilePreview.jsx).
 *
 * The trap this guards: `volume_kg` is a real reported figure and a commodity
 * the encoder reported as zero arrives as `0.0`, not `null`. A truthiness check
 * would silently drop those rows from the count while the sheet still prints
 * them, so the badge would under-report the submission.
 *
 * The helpers are imported from the component rather than re-implemented, so
 * the test exercises the real call site — the mistake
 * documentation/README.md records against the price suite.
 */
import { describe, it, expect } from "vitest";
import { arrivalRowIsPopulated, countPopulatedArrivalRows, numStr } from "../app/dftc/components/DFTCArrivalPreview.jsx";

const blank = { farm_source_volume_kg: null, other_source_volume_kg: null, volume_kg: null };
const reportedZero = { farm_source_volume_kg: null, other_source_volume_kg: null, volume_kg: 0 };

// What a catalogue-seeded row looks like for a commodity nobody reported:
// the name is present so the sheet still names it, every volume column is null.
const catalogueRow = (name) => ({ commodity_name: name, variety: null, unit: "kg", ...blank });
const reportedRow = (name, volume_kg) => ({
  commodity_name: name,
  variety: null,
  unit: "kg",
  farm_source_volume_kg: null,
  other_source_volume_kg: null,
  volume_kg
});

describe("arrivalRowIsPopulated", () => {
  it("treats a catalogue row with no volumes as blank", () => {
    expect(arrivalRowIsPopulated(blank)).toBe(false);
    expect(arrivalRowIsPopulated(catalogueRow("Saluyot"))).toBe(false);
  });

  it("counts a reported zero as data", () => {
    expect(arrivalRowIsPopulated(reportedZero)).toBe(true);
  });

  it("counts a row reporting only one source", () => {
    expect(arrivalRowIsPopulated({ ...blank, farm_source_volume_kg: 250 })).toBe(true);
    expect(arrivalRowIsPopulated({ ...blank, other_source_volume_kg: 250 })).toBe(true);
  });
});

describe("countPopulatedArrivalRows", () => {
  it("counts 4 reported rows out of the ~130-row catalogue", () => {
    const rows = [
      ...Array.from({ length: 126 }, (_, i) => catalogueRow(`Blank ${i}`)),
      reportedRow("Ampalaya", 1200),
      reportedRow("Chinese Pechay", 340),
      reportedRow("Kamatis", 500),
      reportedZero
    ];

    expect(rows.length).toBe(130);
    expect(countPopulatedArrivalRows(rows)).toBe(4);
  });

  it("is zero for an empty sheet", () => {
    expect(countPopulatedArrivalRows([])).toBe(0);
  });
});

describe("numStr", () => {
  it("renders a blank volume cell as an em dash, not 0.00", () => {
    expect(numStr(null)).toBe("—");
    expect(numStr(undefined)).toBe("—");
  });

  it("still renders a reported zero as a figure", () => {
    expect(numStr(0)).toBe("0.00");
  });
});