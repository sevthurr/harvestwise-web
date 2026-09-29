import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherForecastOutlook from "../app/global/components/shared/WeatherForecastOutlook";
import { LanguageProvider } from "../app/global/contexts/LanguageContext";

vi.mock("../app/global/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "USR-001", role: "farmer", preferred_language: "ceb" },
    isAuthenticated: true,
  }),
  AuthProvider: ({ children }) => children,
}));

const MOCK_FORECAST_14D = [
  {
    date: "2026-09-28",
    day_label: "Today",
    temp_max: 30,
    temp_min: 23,
    rainfall_mm: 3.2,
    rain_probability_pct: 25,
    humidity_pct: 82,
    wind_speed_max_kmh: 9,
    weather_condition: "rain",
    suitability: "Suitable",
  },
  {
    date: "2026-09-29",
    day_label: "+1d",
    temp_max: 30,
    temp_min: 22,
    rainfall_mm: 0.6,
    rain_probability_pct: 20,
    humidity_pct: 80,
    wind_speed_max_kmh: 8,
    weather_condition: "rain",
    suitability: "Suitable",
  },
  {
    date: "2026-09-30",
    day_label: "+2d",
    temp_max: 29,
    temp_min: 22,
    rainfall_mm: 3.6,
    rain_probability_pct: 30,
    humidity_pct: 84,
    wind_speed_max_kmh: 10,
    weather_condition: "rain",
    suitability: "Caution",
  },
  {
    date: "2026-10-01",
    day_label: "+3d",
    temp_max: 29,
    temp_min: 22,
    rainfall_mm: 3.3,
    rain_probability_pct: 25,
    humidity_pct: 83,
    wind_speed_max_kmh: 9,
    weather_condition: "rain",
    suitability: "Suitable",
  },
  {
    date: "2026-10-02",
    day_label: "+4d",
    temp_max: 27,
    temp_min: 23,
    rainfall_mm: 3.6,
    rain_probability_pct: 35,
    humidity_pct: 86,
    wind_speed_max_kmh: 11,
    weather_condition: "rain",
    suitability: "Suitable",
  },
  {
    date: "2026-10-03",
    day_label: "+5d",
    temp_max: 28,
    temp_min: 23,
    rainfall_mm: 6.6,
    rain_probability_pct: 45,
    humidity_pct: 88,
    wind_speed_max_kmh: 12,
    weather_condition: "rain",
    suitability: "Caution",
  },
  {
    date: "2026-10-04",
    day_label: "+6d",
    temp_max: 27,
    temp_min: 23,
    rainfall_mm: 11.7,
    rain_probability_pct: 60,
    humidity_pct: 91,
    wind_speed_max_kmh: 14,
    weather_condition: "rain",
    suitability: "Caution",
  },
  {
    date: "2026-10-05",
    day_label: "+7d",
    temp_max: 28,
    temp_min: 23,
    rainfall_mm: 4.5,
    rain_probability_pct: 30,
    humidity_pct: 82,
    wind_speed_max_kmh: 8,
    weather_condition: "rain",
    suitability: "Suitable",
  },
];

describe("WeatherForecastOutlook Unified Component", () => {
  describe("Scenario 1: Commodity observed (Admin Weather Basis & Farmer View Basis)", () => {
    it("renders cards with weekday names, temperatures, rainfall, and suitability badges", () => {
      render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={MOCK_FORECAST_14D}
            showSuitability={true}
            commodityName="Ampalaya"
            title="14-DAY WEATHER FORECAST OUTLOOK"
            subtitle="Estimated weather parameters and risks for Ampalaya."
          />
        </LanguageProvider>
      );

      // Verify title & subtitle
      expect(screen.getByText("14-DAY WEATHER FORECAST OUTLOOK")).toBeInTheDocument();
      expect(screen.getByText(/Estimated weather parameters and risks for Ampalaya/i)).toBeInTheDocument();

      // Verify card day headers (Today/Karon/Ngayon, Tue/Mar, Wed/Miy, etc.)
      expect(screen.getAllByText(/Today|Karon|Ngayon/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Tue|Mar/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Wed|Miy/i).length).toBeGreaterThanOrEqual(1);

      // Verify temperatures and precipitation
      expect(screen.getAllByText("30°").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("23°").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("3.2mm").length).toBeGreaterThanOrEqual(1);

      // Verify suitability classification indicators are visible on cards
      expect(screen.getAllByText(/Suitable|Maayo|Angay/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Caution|Bantayi|Kinahanglan/i).length).toBeGreaterThanOrEqual(1);
    });

    it("displays conversational weather explanation container below the cards with commodity context and without badge style", () => {
      render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={MOCK_FORECAST_14D}
            showSuitability={true}
            commodityName="Ampalaya"
          />
        </LanguageProvider>
      );

      // Verify details container heading
      expect(
        screen.getByText(/Inadlaw nga Detalye|Arawang Detalye|Daily Weather/i)
      ).toBeInTheDocument();

      // Verify section titles
      expect(screen.getAllByText(/Temperatura|Temperature/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Ulan|Rainfall/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Giya para sa Ampalaya|Guidance for Ampalaya/i)).toBeInTheDocument();

      // Verify conversational 3.2mm explanation
      expect(screen.getAllByText(/3\.2 mm/i).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/taligsik|ambon|drizzle|kaumog sa yuta/i)
      ).toBeInTheDocument();

      // Verify conversational temperature explanation for Ampalaya
      expect(
        screen.getAllByText(/Ampalaya/i).length
      ).toBeGreaterThanOrEqual(1);
    });

    it("guarantees all 14 forecast days are rendered as cards even if upstream data has fewer days", () => {
      // Pass only 8 days
      const partialForecast = MOCK_FORECAST_14D.slice(0, 8);
      const { container } = render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={partialForecast}
            showSuitability={true}
            commodityName="Ampalaya"
          />
        </LanguageProvider>
      );

      // Verify exactly 14 day button cards are rendered
      const dayCards = container.querySelectorAll("button[type='button'][aria-pressed]");
      expect(dayCards.length).toBe(14);
    });

    it("updates conversational explanation container when a different card is clicked", () => {
      render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={MOCK_FORECAST_14D}
            showSuitability={true}
            commodityName="Ampalaya"
          />
        </LanguageProvider>
      );

      // Find the card for 11.7mm (day 7 / Oct 4)
      const cardWith117 = screen.getByText("11.7mm");
      fireEvent.click(cardWith117);

      // The details container should now display 11.7 mm explanation
      expect(screen.getAllByText(/11\.7 mm/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Kasarangang ulan|Katamtamang ulan|Moderate rainfall/i)).toBeInTheDocument();
    });
  });

  describe("Scenario 2: No commodity observed (Farmer > Market > Weather)", () => {
    it("renders identical cards but WITHOUT suitability badges when showSuitability is false", () => {
      render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={MOCK_FORECAST_14D}
            showSuitability={false}
            title="14-ADLAW NGA TAGNA SA PANAHON"
          />
        </LanguageProvider>
      );

      // Verify card day headers and values still render cleanly
      expect(screen.getByText("14-ADLAW NGA TAGNA SA PANAHON")).toBeInTheDocument();
      expect(screen.getAllByText(/Today|Karon|Ngayon/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("3.2mm").length).toBeGreaterThanOrEqual(1);

      // But NO suitability indicators (Suitable/Caution/Severe) should appear on cards
      expect(screen.queryByText(/● Suitable/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/● Caution/i)).not.toBeInTheDocument();
    });

    it("displays general field readiness and weather explanation when a card is clicked", () => {
      render(
        <LanguageProvider>
          <WeatherForecastOutlook
            forecast={MOCK_FORECAST_14D}
            showSuitability={false}
          />
        </LanguageProvider>
      );

      // Field condition section title (no crop name)
      expect(
        screen.getByText(/Kondisyon sa Umahan|Kondisyon sa Sakahan|Field Readiness/i)
      ).toBeInTheDocument();

      // Conversational explanation for field operations
      expect(
        screen.getByText(/pag-ani|gawain sa bukid|agricultural tasks|buluhaton/i)
      ).toBeInTheDocument();
    });
  });
});
