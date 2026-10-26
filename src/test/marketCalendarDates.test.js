import { describe, expect, it } from "vitest";
import { dateOnly, eventCoversDate } from "../app/farmer/pages/MarketCalendar.jsx";

describe("market calendar event dates", () => {
  it("normalizes API date-time values to calendar dates", () => {
    expect(dateOnly("2026-10-27T00:00:00")).toBe("2026-10-27");
  });

  it("marks every day in a configured event range", () => {
    const event = { date: "2026-10-27T00:00:00", endDate: "2026-10-28T00:00:00" };

    expect(eventCoversDate("2026-10-27", event)).toBe(true);
    expect(eventCoversDate("2026-10-28", event)).toBe(true);
    expect(eventCoversDate("2026-10-29", event)).toBe(false);
  });
});
