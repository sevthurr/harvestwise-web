import { useEffect, useState } from "react";
import { analyticsApi } from "../services/api";

export function useHistoricalSeasonalProduction(enabled, commodityRef) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!enabled) {
        setData(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const result = await analyticsApi.getHistoricalSeasonalProduction(commodityRef);
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setData(null);
          setError(err.message || "Unable to load historical production.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, commodityRef]);

  return { data, loading, error };
}

export function usePriceOutlook(enabled, commodity, variety) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!enabled) {
        setData(null);
        return;
      }
      try {
        setError("");
        const result = await analyticsApi.getPriceOutlook(`${commodity} ${variety}`);
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setData(null);
          setError(err.message || "Unable to load Price Outlook.");
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, commodity, variety]);

  return { data, error };
}