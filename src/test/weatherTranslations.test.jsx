import { describe, it, expect } from "vitest";
import { buildWeatherRiskAnalysis } from "../app/global/utils/weatherRiskAnalysis";
import { formatCropAdvisory } from "../app/farmer/components/shared/CropWeatherCard";
import { t } from "../app/global/i18n";

describe("Weather Multi-Language Translations", () => {
  const mockForecast = {
    status: "ok",
    days: [
      {
        date: "2026-10-15",
        day_label: "Today",
        temp_max: 31,
        temp_min: 24,
        rainfall_mm: 5.5,
        rain_probability_pct: 40,
        humidity_pct: 85,
        wind_speed_max_kmh: 12,
        weather_condition: "Partly Cloudy",
      },
      {
        date: "2026-10-16",
        day_label: "+1d",
        temp_max: 32,
        temp_min: 24,
        rainfall_mm: 18.0,
        rain_probability_pct: 65,
        humidity_pct: 92,
        wind_speed_max_kmh: 14,
        weather_condition: "Rain",
      },
    ],
  };

  it("buildWeatherRiskAnalysis generates conversational Bisaya when lang='ceb'", () => {
    const analysis = buildWeatherRiskAnalysis({
      weatherForecast: mockForecast,
      commodityName: "Kamatis",
      lang: "ceb",
    });

    expect(analysis.resultExplanation).toContain("Ang 14-adlaw nga tagna sa panahon nagpakita og kasarangang temperatura");
    expect(analysis.resultExplanation).toContain("mm/adlaw");
    expect(analysis.inputPeriod).toContain("ka adlaw");
    expect(analysis.basisInputs.Location).toBe("Davao City ug mga Tanoman");
    expect(analysis.thresholds[0].classification).toBe("Maayo");
    expect(analysis.thresholds[1].classification).toBe("Kinahanglan Bantayan");
    expect(analysis.thresholds[2].classification).toBe("Taas ang Risk");
  });

  it("buildWeatherRiskAnalysis generates conversational Tagalog when lang='tl'", () => {
    const analysis = buildWeatherRiskAnalysis({
      weatherForecast: mockForecast,
      commodityName: "Kamatis",
      lang: "tl",
    });

    expect(analysis.resultExplanation).toContain("Ipinapakita ng 14-araw na ulat sa panahon ang karaniwang temperatura");
    expect(analysis.resultExplanation).toContain("mm/araw");
    expect(analysis.inputPeriod).toContain("araw");
    expect(analysis.basisInputs.Location).toBe("Davao City at mga Sakahan");
    expect(analysis.thresholds[0].classification).toBe("Angkop");
    expect(analysis.thresholds[1].classification).toBe("Kailangang Bantayan");
    expect(analysis.thresholds[2].classification).toBe("Mataas ang Panganib");
  });

  it("buildWeatherRiskAnalysis generates English when lang='en'", () => {
    const analysis = buildWeatherRiskAnalysis({
      weatherForecast: mockForecast,
      commodityName: "Kamatis",
      lang: "en",
    });

    expect(analysis.resultExplanation).toContain("14-day weather forecast indicates an average temperature range of");
    expect(analysis.resultExplanation).toContain("mm/day");
    expect(analysis.inputPeriod).toContain("days");
    expect(analysis.basisInputs.Location).toBe("Davao City & Production Areas");
    expect(analysis.thresholds[0].classification).toBe("Suitable");
    expect(analysis.thresholds[1].classification).toBe("Caution");
    expect(analysis.thresholds[2].classification).toBe("Severe");
  });

  it("formatCropAdvisory translates correctly into Bisaya, Tagalog, and English", () => {
    const crop = {
      crop_id: "COM-0004",
      crop_name: "Kamatis",
      risk_level: "caution",
      headline: "Forecast temperature for Kamatis is >24°C",
      recommended_actions: [],
    };

    // 1. Bisaya (ceb)
    const advCeb = formatCropAdvisory(crop, "ceb", (k, p, fb) => t(k, p, "ceb") || fb);
    expect(advCeb.statusVal).toBe("Pagbantay");
    expect(advCeb.dateRange).toBe("Sunod 7 ka Adlaw");
    expect(advCeb.headline).toContain("Ang gitagnang temperatura alang sa Kamatis");
    expect(advCeb.actions.length).toBeGreaterThanOrEqual(2);
    expect(advCeb.actions[0]).not.toMatch(/[a-z]+/i.test("Protect root") ? /root/i : /xyz/);

    // 2. Tagalog (tl)
    const advTl = formatCropAdvisory(crop, "tl", (k, p, fb) => t(k, p, "tl") || fb);
    expect(advTl.statusVal).toBe("Binabantayan");
    expect(advTl.dateRange).toBe("Susunod na 7 Araw");
    expect(advTl.headline).toContain("Ang tinatayang temperatura para sa Kamatis");
    expect(advTl.actions.length).toBeGreaterThanOrEqual(2);
    expect(advTl.actions[0]).toContain("Protektahan");

    // 3. English (en)
    const advEn = formatCropAdvisory(crop, "en", (k, p, fb) => t(k, p, "en") || fb);
    expect(advEn.statusVal).toBe("Monitoring");
    expect(advEn.dateRange).toBe("Next 7 Days");
    expect(advEn.headline).toContain("Forecast temperature for Kamatis is");
    expect(advEn.actions[0]).toContain("Protect");
  });

  it("common.items translates correctly across languages", () => {
    expect(t("common.items", {}, "ceb")).toBe("ka mga tanom");
    expect(t("common.items", {}, "tl")).toBe("na pananim");
    expect(t("common.items", {}, "en")).toBe("items");
  });

  it("farmer.calendar.months translates correctly across languages", () => {
    expect(t("farmer.calendar.months.november", {}, "ceb")).toBe("Nobyembre");
    expect(t("farmer.calendar.months.november", {}, "tl")).toBe("Nobyembre");
    expect(t("farmer.calendar.months.november", {}, "en")).toBe("November");

    expect(t("farmer.calendar.months.october", {}, "ceb")).toBe("Oktubre");
    expect(t("farmer.calendar.months.october", {}, "tl")).toBe("Oktubre");
    expect(t("farmer.calendar.months.october", {}, "en")).toBe("October");
  });
});
