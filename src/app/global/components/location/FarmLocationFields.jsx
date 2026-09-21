import { useState, useMemo } from "react";
import { MapPin, AlertCircle, RefreshCw, Loader2, Check } from "lucide-react";
import { BarangayCombobox } from "./BarangayCombobox";
import { SearchableCombobox } from "./SearchableCombobox";
import {
  DAVAO_DISTRICTS,
  getDistrictForBarangay,
  getPurokSuggestions,
  getStreetSuggestions,
} from "../../data/davaoLocations";
import { useLanguage } from "../../contexts/LanguageContext";
import { LOCATION_ERRORS } from "../../hooks/useFarmLocation";

export function FarmLocationFields({ locationState, showCheckButton = false }) {
  const { t } = useLanguage();
  const {
    city,
    district,
    setDistrict,
    barangay,
    setBarangay,
    purokSitio,
    setPurokSitio,
    street,
    setStreet,
    specificAddress,
    setSpecificAddress,
    locationMode,
    isSettled,
    setIsSettled,
    needsBarangaySelection,
    barangays,
    barangaysLoading,
    barangaysError,
    gpsLoading,
    resolving,
    errorType,
    requestCurrentPosition,
    selectBarangayForGps,
    geocodeManualLocation,
    switchMode,
    resetToChoice,
    refetchBarangays,
    clearError,
  } = locationState;

  const labelCls = "text-[14px] font-semibold text-[var(--hw-neutral-700)]";

  const handleDistrictSelect = (selectedDistrict) => {
    setDistrict(selectedDistrict);
    // If currently selected barangay does not belong to the newly selected district, reset barangay
    if (barangay && selectedDistrict) {
      const brgyDist = getDistrictForBarangay(barangay);
      if (brgyDist && brgyDist.toLowerCase() !== selectedDistrict.trim().toLowerCase()) {
        setBarangay("");
      }
    }
  };

  const handleBarangaySelect = (selectedName) => {
    setBarangay(selectedName);
    const autoDist = getDistrictForBarangay(selectedName);
    if (autoDist && !district) {
      setDistrict(autoDist);
    }
  };

  const handleSelectBarangayForGps = (selectedName) => {
    selectBarangayForGps(selectedName);
    const autoDist = getDistrictForBarangay(selectedName);
    if (autoDist && !district) {
      setDistrict(autoDist);
    }
  };

  const districtOptions = DAVAO_DISTRICTS;

  // Filter barangays by selected district if present
  const filteredBarangays = useMemo(() => {
    if (!district) return barangays;
    const cleanDist = district.trim().toLowerCase();
    return barangays.filter((b) => {
      const dist = getDistrictForBarangay(b.name);
      return dist && dist.toLowerCase() === cleanDist;
    });
  }, [barangays, district]);

  const purokOptions = useMemo(() => getPurokSuggestions(district, barangay), [district, barangay]);
  const streetOptions = useMemo(() => getStreetSuggestions(district, barangay), [district, barangay]);

  // Error message rendering
  const renderErrorBanner = () => {
    if (!errorType) return null;

    let errorMsg = "";
    let showManualOption = false;
    let showRetryGpsOption = false;
    let showGpsOption = false;

    switch (errorType) {
      case LOCATION_ERRORS.PERMISSION_DENIED:
        errorMsg = t(
          "onboarding.gps_denied",
          {},
          "Location access wasn't allowed. Enter your farm address instead."
        );
        showManualOption = true;
        break;

      case LOCATION_ERRORS.TIMEOUT:
      case LOCATION_ERRORS.POSITION_UNAVAILABLE:
      case LOCATION_ERRORS.UNSUPPORTED:
        errorMsg = t(
          "onboarding.gps_unavailable",
          {},
          "We couldn't get your location. Try again or enter your farm address."
        );
        showRetryGpsOption = true;
        showManualOption = true;
        break;

      case LOCATION_ERRORS.ADDRESS_NOT_SPECIFIC:
        errorMsg = t(
          "onboarding.address_not_specific",
          {},
          "We couldn't find the exact farm location. Add a nearby road or landmark and try again."
        );
        showGpsOption = true;
        break;

      case LOCATION_ERRORS.OUTSIDE_DAVAO:
        errorMsg = t(
          "onboarding.gps_outside_davao",
          {},
          "HarvestWise currently supports farm locations within Davao City. Enter your farm address instead."
        );
        showManualOption = true;
        break;

      case LOCATION_ERRORS.BARANGAYS_ERROR:
        errorMsg = t(
          "onboarding.barangays_error",
          {},
          "Barangays couldn't be loaded. Please try again."
        );
        break;

      case LOCATION_ERRORS.GEOCODING_ERROR:
        errorMsg = t(
          "onboarding.geocoding_error",
          {},
          "Could not locate this address. Please check and try again."
        );
        showGpsOption = true;
        break;

      case LOCATION_ERRORS.REVERSE_GEOCODE_FAILED:
        errorMsg = t(
          "onboarding.reverse_geocode_failed",
          {},
          "We got your location but couldn't load the address. Try again or enter it manually."
        );
        showRetryGpsOption = true;
        showManualOption = true;
        break;

      default:
        errorMsg = t("common.general_error", {}, "Something went wrong. Please try again.");
    }

    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-[13px] text-amber-900">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="leading-snug">{errorMsg}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-0.5">
          {showRetryGpsOption && (
            <button
              type="button"
              onClick={requestCurrentPosition}
              className="inline-flex items-center gap-1 font-semibold text-[var(--hw-green-700)] hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {t("common.try_again", {}, "Try again")}
            </button>
          )}
          {showManualOption && (
            <button
              type="button"
              onClick={() => {
                clearError();
                switchMode("manual");
              }}
              className="font-semibold text-[var(--hw-green-700)] hover:underline"
            >
              {t("onboarding.enter_manually", {}, "Enter manually")}
            </button>
          )}
          {showGpsOption && (
            <button
              type="button"
              onClick={() => {
                clearError();
                requestCurrentPosition();
              }}
              className="inline-flex items-center gap-1 font-semibold text-[var(--hw-green-700)] hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t("onboarding.use_location", {}, "Use my current location")}
            </button>
          )}
        </div>
      </div>
    );
  };

  // 1. Confirmed / Settled Location View (Shows the 4 required fields: Barangay, District, Purok / Sitio, Street; City is hidden)
  if (isSettled) {
    return (
      <div className="space-y-3 pt-1">
        <div className="p-4 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-[var(--shadow-xs)] space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
              {t("onboarding.farm_location_label", {}, "Farm location")}
            </p>
            <button
              type="button"
              onClick={() => switchMode("manual")}
              className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline"
            >
              {t("common.edit", {}, "Edit")}
            </button>
          </div>

          <div className="space-y-2.5 text-[14px]">
            <div>
              <p className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
                {t("onboarding.barangay", {}, "Barangay")}
              </p>
              <p className="font-semibold text-[var(--hw-neutral-900)]">{barangay || "—"}</p>
            </div>

            {district ? (
              <div>
                <p className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
                  {t("onboarding.district_area", {}, "District")}
                </p>
                <p className="font-semibold text-[var(--hw-neutral-900)]">{district}</p>
              </div>
            ) : null}

            {purokSitio ? (
              <div>
                <p className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
                  {t("onboarding.purok_sitio", {}, "Purok / Sitio")}
                </p>
                <p className="font-semibold text-[var(--hw-neutral-900)]">{purokSitio}</p>
              </div>
            ) : null}

            {street ? (
              <div>
                <p className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
                  {t("onboarding.street", {}, "Street")}
                </p>
                <p className="font-semibold text-[var(--hw-neutral-900)]">{street}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // 2. GPS Reverse Geocode Incomplete: exact coordinates retained, ask farmer to pick Barangay
  if (needsBarangaySelection) {
    return (
      <div className="space-y-4 pt-1">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-[13px] text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug font-medium">
              {t(
                "onboarding.gps_barangay_missing",
                {},
                "We got your location, but please select your Barangay to finish."
              )}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="barangay-combobox" className={labelCls}>
            {t("onboarding.barangay", {}, "Barangay")} <span className="text-red-500">*</span>
          </label>
          <BarangayCombobox
            id="barangay-combobox"
            barangays={barangays}
            selectedBarangay={barangay}
            onSelect={handleSelectBarangayForGps}
            loading={barangaysLoading}
            error={
              barangaysError
                ? t("onboarding.barangays_error", {}, "Barangays couldn't be loaded.")
                : null
            }
            onRetry={refetchBarangays}
          />
        </div>
      </div>
    );
  }

  // 3. Manual Entry Mode (Barangay *, District, Purok / Sitio, Street; City is hidden)
  if (locationMode === "manual") {
    return (
      <div className="space-y-3.5 pt-1">
        {renderErrorBanner()}

        {/* District Field */}
        <div className="space-y-1">
          <label htmlFor="manual-district" className={labelCls}>
            {t("onboarding.district_area", {}, "District")}{" "}
            <span className="text-[12px] font-normal text-[var(--hw-neutral-400)]">
              {t("common.optional", {}, "(optional)")}
            </span>
          </label>
          <SearchableCombobox
            id="manual-district"
            options={districtOptions}
            value={district}
            onChange={handleDistrictSelect}
            placeholder={t("onboarding.district_select_placeholder", {}, "Search or select a District")}
            searchPlaceholder={t("onboarding.district_select_placeholder", {}, "Search or select a District")}
          />
        </div>

        {/* Barangay Field */}
        <div className="space-y-1">
          <label htmlFor="barangay-combobox" className={labelCls}>
            {t("onboarding.barangay", {}, "Barangay")} <span className="text-red-500">*</span>
          </label>
          <BarangayCombobox
            id="barangay-combobox"
            barangays={filteredBarangays}
            selectedBarangay={barangay}
            onSelect={handleBarangaySelect}
            loading={barangaysLoading}
            error={
              barangaysError
                ? t("onboarding.barangays_error", {}, "Barangays couldn't be loaded.")
                : null
            }
            onRetry={refetchBarangays}
          />
        </div>

        {/* Purok / Sitio Field */}
        <div className="space-y-1">
          <label htmlFor="manual-purok-sitio" className={labelCls}>
            {t("onboarding.purok_sitio", {}, "Purok / Sitio")}{" "}
            <span className="text-[12px] font-normal text-[var(--hw-neutral-400)]">
              {t("common.optional", {}, "(optional)")}
            </span>
          </label>
          <SearchableCombobox
            id="manual-purok-sitio"
            options={purokOptions}
            value={purokSitio}
            onChange={setPurokSitio}
            placeholder={t(
              "onboarding.purok_sitio_select_placeholder",
              {},
              "Search or select a Purok / Sitio"
            )}
            searchPlaceholder={t(
              "onboarding.purok_sitio_select_placeholder",
              {},
              "Search or select a Purok / Sitio"
            )}
            allowCustom={true}
          />
        </div>

        {/* Street Field */}
        <div className="space-y-1">
          <label htmlFor="manual-street" className={labelCls}>
            {t("onboarding.street", {}, "Street")}{" "}
            <span className="text-[12px] font-normal text-[var(--hw-neutral-400)]">
              {t("common.optional", {}, "(optional)")}
            </span>
          </label>
          <SearchableCombobox
            id="manual-street"
            options={streetOptions}
            value={street}
            onChange={setStreet}
            onKeyDown={(e) => {
              if (e.key === "Enter" && barangay && !resolving) {
                e.preventDefault();
                geocodeManualLocation();
              }
            }}
            placeholder={t(
              "onboarding.street_select_placeholder",
              {},
              "Search or select a Street"
            )}
            searchPlaceholder={t(
              "onboarding.street_select_placeholder",
              {},
              "Search or select a Street"
            )}
            allowCustom={true}
          />
        </div>

        {/* Check entered location button (proceeds to settled preview card) */}
        {showCheckButton && (
          <div className="pt-2">
            <button
              type="button"
              onClick={async () => {
                if (!barangay) return;
                await geocodeManualLocation();
                setIsSettled(true);
              }}
              disabled={!barangay || resolving || gpsLoading}
              className="w-full h-11 flex items-center justify-center gap-1.5 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
            >
              {resolving && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("onboarding.check_entered", {}, "Check entered location")}
            </button>
          </div>
        )}

        {/* Option to switch to GPS */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={requestCurrentPosition}
            disabled={gpsLoading || resolving}
            className="text-[13px] font-medium text-[var(--hw-green-700)] hover:underline inline-flex items-center gap-1.5"
          >
            {gpsLoading || resolving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5" />
            )}
            {gpsLoading || resolving
              ? t("onboarding.getting_location", {}, "Getting location...")
              : t("onboarding.use_location", {}, "Use my current location")}
          </button>
        </div>
      </div>
    );
  }

  // 4. Initial Choice Mode (locationMode === null)
  return (
    <div className="space-y-4 pt-1">
      {renderErrorBanner()}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={requestCurrentPosition}
          disabled={gpsLoading || resolving}
          className="flex-1 h-12 flex items-center justify-center gap-1.5 bg-[var(--hw-green-700)] text-white text-[13px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-60 px-2 text-center"
        >
          {gpsLoading || resolving ? (
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          ) : (
            <MapPin className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="leading-tight">
            {gpsLoading || resolving
              ? t("onboarding.getting_location", {}, "Getting location...")
              : t("onboarding.use_location", {}, "Use my current location")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchMode("manual")}
          disabled={gpsLoading || resolving}
          className="flex-1 h-12 flex items-center justify-center border border-[var(--hw-neutral-300)] text-[var(--hw-neutral-800)] text-[13px] font-semibold rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors disabled:opacity-60 px-2 text-center"
        >
          <span className="leading-tight">{t("onboarding.enter_manually", {}, "Enter manually")}</span>
        </button>
      </div>
    </div>
  );
}
