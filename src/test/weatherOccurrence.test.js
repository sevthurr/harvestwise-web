import { describe, expect, it } from "vitest";
import {
  formatWeatherTime,
  formatWeatherWindow,
  weatherOccurrenceFallback,
} from "../app/global/utils/weatherOccurrence";

describe("weather occurrence formatting", () => {
  it("converts UTC to Philippine time across a day boundary", () => {
    expect(formatWeatherTime("2026-09-07T18:00:00Z")).toBe("2:00 AM");
  });

  it("formats a farmer-friendly time window", () => {
    expect(formatWeatherWindow("2026-09-07T06:00:00Z", "2026-09-07T09:00:00Z"))
      .toBe("2:00 PM to 5:00 PM");
  });

  it("falls back clearly when the provider has no hourly timing", () => {
    expect(weatherOccurrenceFallback({ rainfall_mm: 4 })).toBe(
      "Rain is expected, but the exact time is not available."
    );
    expect(weatherOccurrenceFallback({ rainfall_mm: 0 })).toBe(
      "Exact timing is not available for this day."
    );
  });
});
