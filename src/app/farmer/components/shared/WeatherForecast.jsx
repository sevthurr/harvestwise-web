import { useLanguage } from "../../../global/contexts/LanguageContext";
import { WeatherForecastOutlook } from "../../../global/components/shared/WeatherForecastOutlook";

/**
 * Shared Weather Forecast Component
 * 
 * Displays a 14-day weather forecast carousel with suitability indicators.
 * Used in both the Weather page and the Weather tab in Detailed Factors.
 */
export function WeatherForecastCarousel({ forecast14d = [] }) {
  const { t } = useLanguage();

  return (
    <WeatherForecastOutlook
      title={t ? t("farmer.factors.weather.forecast_14day_title") : "14-Day Weather Forecast Outlook"}
      subtitle=""
      forecast={forecast14d}
      showSuitability={true}
      emptyMessage={t ? t("farmer.factors.weather.empty_forecast", {}, "No weather details available right now.") : "No weather details available right now."}
    />
  );
}

export { WeatherForecastOutlook };
