import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDavaoCityBarangays, geocodeBarangay, reverseGeocodeCoordinates } from "../api/location";
import { getDistrictForBarangay } from "../data/davaoLocations";

export const LOCATION_ERRORS = {
  PERMISSION_DENIED: "PERMISSION_DENIED",
  POSITION_UNAVAILABLE: "POSITION_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
  UNSUPPORTED: "UNSUPPORTED",
  OUTSIDE_DAVAO: "OUTSIDE_DAVAO",
  BARANGAYS_ERROR: "BARANGAYS_ERROR",
  GEOCODING_ERROR: "GEOCODING_ERROR",
  ADDRESS_NOT_SPECIFIC: "ADDRESS_NOT_SPECIFIC",
  REVERSE_GEOCODE_FAILED: "REVERSE_GEOCODE_FAILED",
};

export function useFarmLocation({
  initialCity = "Davao City",
  initialDistrict = "",
  initialBarangay = "",
  initialPurokSitio = "",
  initialStreet = "",
  initialSpecificAddress = "",
  initialLatitude = null,
  initialLongitude = null,
  onLocationChange = null,
} = {}) {
  const [city] = useState("Davao City");
  const [district, setDistrict] = useState(initialDistrict || "");
  const [barangay, setBarangay] = useState(initialBarangay || "");
  const [purokSitio, setPurokSitio] = useState(initialPurokSitio || "");
  const [street, setStreet] = useState(initialStreet || "");
  const [specificAddress, setSpecificAddress] = useState(initialSpecificAddress || "");
  const [displayAddress, setDisplayAddress] = useState(() => {
    if (initialBarangay && initialLatitude != null && initialLongitude != null) {
      const parts = [initialStreet, initialPurokSitio, initialSpecificAddress, initialBarangay, initialDistrict, "Davao City"];
      return [...new Set(parts.filter(Boolean))].join(", ");
    }
    return "";
  });

  const [latitude, setLatitude] = useState(initialLatitude);
  const [longitude, setLongitude] = useState(initialLongitude);
  const [accuracy, setAccuracy] = useState(null);

  // locationMode: null (choice screen), "gps", or "manual"
  const [locationMode, setLocationMode] = useState(() => {
    if (initialBarangay) {
      return "manual";
    }
    return null;
  });

  // isSettled is true when a valid location is confirmed and ready to show compact result
  const [isSettled, setIsSettled] = useState(() => {
    return Boolean(initialBarangay);
  });

  // Flag if GPS succeeded but reverse geocoding could not identify the Barangay
  const [needsBarangaySelection, setNeedsBarangaySelection] = useState(false);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [errorType, setErrorType] = useState(null);

  // Sync initial values when they arrive asynchronously (e.g. profile load in settings)
  useEffect(() => {
    if (initialDistrict) setDistrict(initialDistrict);
    if (initialBarangay) setBarangay(initialBarangay);
    if (initialPurokSitio) setPurokSitio(initialPurokSitio);
    if (initialStreet) setStreet(initialStreet);
    if (initialSpecificAddress) setSpecificAddress(initialSpecificAddress);
    if (initialLatitude != null) setLatitude(initialLatitude);
    if (initialLongitude != null) setLongitude(initialLongitude);

    // If an existing registered profile is loaded (e.g. in Settings),
    // display the settled card with the "I-edit" button!
    if (initialBarangay) {
      setIsSettled(true);
      setLocationMode("manual");
      const parts = [
        initialStreet,
        initialPurokSitio,
        initialSpecificAddress,
        initialBarangay,
        initialDistrict,
        "Davao City",
      ];
      setDisplayAddress([...new Set(parts.filter(Boolean))].join(", "));
    }
  }, [initialDistrict, initialBarangay, initialPurokSitio, initialStreet, initialSpecificAddress, initialLatitude, initialLongitude]);

  // 1. Fetch and cache the 182 Davao City Barangays
  const {
    data: barangays = [],
    isLoading: barangaysLoading,
    error: barangaysLoadError,
    refetch: refetchBarangays,
  } = useQuery({
    queryKey: ["location", "davao-city", "barangays"],
    queryFn: getDavaoCityBarangays,
    staleTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    retry: 2,
  });

  const isComplete = Boolean(
    isSettled &&
    latitude != null &&
    longitude != null &&
    Boolean(barangay)
  );

  const onLocationChangeRef = useRef(onLocationChange);
  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  });

  // Sync outside state whenever location coordinates or fields settle
  useEffect(() => {
    if (onLocationChangeRef.current) {
      onLocationChangeRef.current({
        city: "Davao City",
        district,
        barangay,
        purokSitio,
        street,
        specificAddress: [street, purokSitio].filter(Boolean).join(", ") || specificAddress,
        displayAddress,
        latitude,
        longitude,
        locationMode,
        isComplete,
      });
    }
  }, [city, district, barangay, purokSitio, street, specificAddress, displayAddress, latitude, longitude, locationMode, isComplete]);

  // Request native GPS position and reverse geocode
  const requestCurrentPosition = useCallback(() => {
    setErrorType(null);
    setNeedsBarangaySelection(false);

    if (!("geolocation" in navigator)) {
      setErrorType(LOCATION_ERRORS.UNSUPPORTED);
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsLoading(false);
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const acc = pos.coords.accuracy;
        setAccuracy(acc);

        setResolving(true);
        try {
          const rev = await reverseGeocodeCoordinates(lat, lon);

          if (!rev.is_davao_city) {
            setErrorType(LOCATION_ERRORS.OUTSIDE_DAVAO);
            setLocationMode("manual");
            setLatitude(null);
            setLongitude(null);
            setIsSettled(false);
            return;
          }

          // Exact device coordinates MUST be preserved!
          setLatitude(lat);
          setLongitude(lon);
          setLocationMode("gps");

          setDistrict(rev.district || "");
          setPurokSitio(rev.purok_sitio || "");
          setStreet(rev.street || "");
          const specific = [rev.street, rev.purok_sitio].filter(Boolean).join(", ") || rev.specific_address || "";
          setSpecificAddress(specific);

          if (rev.barangay) {
            setBarangay(rev.barangay);
            setIsSettled(true);
            setNeedsBarangaySelection(false);
          } else {
            setBarangay("");
            setIsSettled(false);
            setNeedsBarangaySelection(true);
          }

          const disp = rev.display_address || [rev.street, rev.purok_sitio, rev.barangay, rev.district, "Davao City"].filter(Boolean).join(", ");
          setDisplayAddress(disp);
        } catch {
          // If reverse geocoding network fails, keep coordinates but show error to let them retry or enter manually
          setLatitude(lat);
          setLongitude(lon);
          setLocationMode(null);
          setErrorType(LOCATION_ERRORS.REVERSE_GEOCODE_FAILED);
          setNeedsBarangaySelection(false);
          setIsSettled(false);
        } finally {
          setResolving(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setErrorType(LOCATION_ERRORS.PERMISSION_DENIED);
        } else if (err.code === 2) {
          setErrorType(LOCATION_ERRORS.POSITION_UNAVAILABLE);
        } else if (err.code === 3) {
          setErrorType(LOCATION_ERRORS.TIMEOUT);
        } else {
          setErrorType(LOCATION_ERRORS.POSITION_UNAVAILABLE);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      }
    );
  }, []);

  // When GPS reverse geocode was uncertain and farmer picks the Barangay manually
  const selectBarangayForGps = useCallback((selectedName) => {
    setBarangay(selectedName);
    const autoDist = getDistrictForBarangay(selectedName);
    if (autoDist && !district) {
      setDistrict(autoDist);
    }
    setNeedsBarangaySelection(false);
    setIsSettled(true);
    const finalDist = autoDist || district;
    const disp = [street, purokSitio, selectedName, finalDist, "Davao City"].filter(Boolean).join(", ");
    setDisplayAddress(disp);
  }, [street, purokSitio, district]);

  // Handle manual forward geocode of specific farm address + Barangay
  const geocodeManualLocation = useCallback(async () => {
    if (!barangay) {
      return false;
    }

    setErrorType(null);
    setResolving(true);

    const specificComposite = [street, purokSitio, specificAddress].filter(Boolean).join(", ");

    try {
      const geo = await geocodeBarangay(barangay, specificComposite, district.trim(), purokSitio.trim(), street.trim());
      setLatitude(geo.latitude);
      setLongitude(geo.longitude);
      if (geo.district && !district.trim()) {
        setDistrict(geo.district);
      }
      setAccuracy(null);
      const disp = [street, purokSitio, barangay, district.trim() || geo.district, "Davao City"].filter(Boolean).join(", ");
      setDisplayAddress(disp);
      return true;
    } catch {
      // Fallback gracefully to canonical barangay coordinates so farmer is never blocked
      try {
        const fallbackGeo = await geocodeBarangay(barangay);
        setLatitude(fallbackGeo.latitude);
        setLongitude(fallbackGeo.longitude);
        setAccuracy(null);
        const disp = [street, purokSitio, barangay, district.trim(), "Davao City"].filter(Boolean).join(", ");
        setDisplayAddress(disp);
        setErrorType(null);
        return true;
      } catch (fallbackErr) {
        setLatitude(null);
        setLongitude(null);
        setErrorType(LOCATION_ERRORS.GEOCODING_ERROR);
        return false;
      }
    } finally {
      setResolving(false);
    }
  }, [barangay, street, purokSitio, specificAddress, district]);

  const switchMode = useCallback((mode) => {
    setLocationMode(mode);
    setErrorType(null);
    setIsSettled(false);
    setNeedsBarangaySelection(false);
  }, []);

  const resetToChoice = useCallback(() => {
    setLocationMode(null);
    setIsSettled(false);
    setErrorType(null);
    setNeedsBarangaySelection(false);
  }, []);

  return {
    city,
    district,
    barangay,
    purokSitio,
    street,
    specificAddress,
    displayAddress,
    latitude,
    longitude,
    accuracy,
    locationMode,
    isSettled,
    setIsSettled,
    needsBarangaySelection,
    barangays,
    barangaysLoading,
    barangaysError: barangaysLoadError ? LOCATION_ERRORS.BARANGAYS_ERROR : null,
    gpsLoading,
    resolving,
    errorType,
    isComplete,
    setDistrict,
    setBarangay,
    setPurokSitio,
    setStreet,
    setSpecificAddress,
    requestCurrentPosition,
    selectBarangayForGps,
    geocodeManualLocation,
    switchMode,
    resetToChoice,
    refetchBarangays,
    clearError: () => setErrorType(null),
  };
}
