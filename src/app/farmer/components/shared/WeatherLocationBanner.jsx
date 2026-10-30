import { useState } from "react";
import { Link } from "react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudSun, X } from "lucide-react";
import { useLanguage } from "../../../global/contexts/LanguageContext";
import { useAuth } from "../../../global/contexts/AuthContext";
import { fetchFarmerProfile } from "../../../global/hooks/useFarmerPrefetch";

const DISMISS_STORAGE_KEY = "hw_dismissed_weather_location_banner";

export function WeatherLocationBanner({ className = "" }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 10,
    initialData: () => queryClient.getQueryData(["farmer", "profile"]) || queryClient.getQueryData(["dashboard", "profile"]),
  });

  const p = profile || {};
  const u = user || {};

  const barangay = p.barangay || u.barangay;
  const district = p.district || u.district;
  const purok = p.purok_sitio || p.purokSitio || u.purok_sitio || u.purokSitio;
  const street = p.street || u.street;
  const locationName = p.location_name || p.locationName || u.location_name || u.locationName;
  const hasCoords = (p.latitude != null && p.longitude != null) || (u.latitude != null && u.longitude != null);

  const hasFarmLocation = Boolean(
    barangay ||
    district ||
    purok ||
    street ||
    locationName ||
    hasCoords
  );

  // If dismissed, if location is already set, or while loading initial profile without cached data, don't show banner
  if (dismissed || hasFarmLocation || (isLoading && !profile && !user)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_STORAGE_KEY, "true");
    } catch {
      // Storage unavailable
    }
  };

  return (
    <div
      role="status"
      className={`bg-white border border-[var(--hw-green-200)] shadow-[var(--shadow-xs)] rounded-2xl p-3.5 flex items-start justify-between gap-3 text-[13px] text-[var(--hw-green-800)] transition-all ${className}`}
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <CloudSun className="w-4 h-4 text-[var(--hw-green-700)] flex-shrink-0 mt-0.5" />
        <p className="leading-snug">
          {t(
            "onboarding.davao_default_weather_banner",
            {},
            "Weather data is currently based on Davao City general weather. Enter your farm location to get localized weather advisories."
          )}{" "}
          <Link
            to="/farmer/settings?tab=farm"
            className="font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-900)] underline inline-flex items-center gap-0.5"
          >
            {t("onboarding.enter_farm_location", {}, "Enter farm location")}
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss weather location notice"
        className="text-[var(--hw-green-700)] hover:text-[var(--hw-green-900)] p-1 rounded-lg hover:bg-[var(--hw-green-50)] transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
