/**
 * Tests for the timezone-safe date helpers.
 *
 * The bug these guard against: `new Date("2026-10-01")` is parsed as UTC
 * midnight, which renders as the PREVIOUS day anywhere at or west of UTC. A
 * farmer in Manila and a reviewer in London would read different months off the
 * same record.
 */
import { describe, it, expect } from "vitest";
import { parseLocalDate, formatMonthShort } from "./formatters";

describe("parseLocalDate", () => {
  it("parses a bare ISO date to local midnight", () => {
    const d = parseLocalDate("2026-10-01");
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9); // October, 0-indexed
    expect(d.getDate()).toBe(1);
  });

  it("does not shift the calendar day", () => {
    // The whole point: the day component must survive parsing.
    for (const iso of ["2026-01-01", "2026-03-31", "2026-10-01", "2026-12-31"]) {
      const d = parseLocalDate(iso);
      expect(d.getDate()).toBe(Number(iso.slice(8, 10)));
      expect(d.getMonth() + 1).toBe(Number(iso.slice(5, 7)));
    }
  });

  it("handles a full ISO timestamp", () => {
    const d = parseLocalDate("2026-10-01T00:00:00Z");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(1);
  });

  it("returns null for missing or unparseable input", () => {
    expect(parseLocalDate(null)).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
    expect(parseLocalDate("")).toBeNull();
    expect(parseLocalDate("not-a-date")).toBeNull();
  });

  it("passes a Date through unchanged", () => {
    const original = new Date(2026, 9, 1);
    expect(parseLocalDate(original)).toBe(original);
  });
});

describe("formatMonthShort", () => {
  it("formats the month of an ISO date", () => {
    expect(formatMonthShort("2026-10-01")).toBe("Oct");
    expect(formatMonthShort("2026-01-15")).toBe("Jan");
  });

  it("does not roll back a month-start date", () => {
    // Regression: with new Date("2026-10-01") a UTC-negative viewer prints "Sep".
    expect(formatMonthShort("2026-10-01")).not.toBe("Sep");
    expect(formatMonthShort("2026-01-01")).not.toBe("Dec");
  });

  it("returns the fallback when the value is missing", () => {
    expect(formatMonthShort(null)).toBe("–");
    expect(formatMonthShort(undefined, "n/a")).toBe("n/a");
  });
});
