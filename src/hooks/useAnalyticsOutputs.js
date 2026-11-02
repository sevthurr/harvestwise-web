import { useEffect, useState } from "react";
import { analyticsApi } from "../services/api";

export function useHistoricalSeasonalProduction(enabled, commodityRef, quarter = null) {
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
        const result = await analyticsApi.getHistoricalSeasonalProduction(commodityRef, quarter);
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
  }, [enabled, commodityRef, quarter]);

  return { data, loading, error };
}

export function usePriceOutlook(enabled, commodityId, priceTypeKey = "bangkerohan_retail", horizon = 14) {
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
        const result = await analyticsApi.getPriceOutlook(commodityId, priceTypeKey, horizon);
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
  }, [enabled, commodityId, priceTypeKey, horizon]);

  return { data, error };
}

export function useArrivalPressure(enabled, commodityRef, year = null, source = null, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const aggregateVarieties = !!options.aggregateVarieties;

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
        let result;
        if (aggregateVarieties || (source != null && source !== "overall") || year != null) {
          result = await analyticsApi.getArrivalPressure(
            commodityRef,
            year,
            source,
            { aggregateVarieties }
          );
        } else {
          result = await analyticsApi.getArrivalPressure(commodityRef);
        }
        if (active) setData(result);
      } catch (err) {
        if (active) {
          setData(null);
          setError(err.message || "Unable to load arrival pressure.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [enabled, commodityRef, year, source, aggregateVarieties]);

  return { data, loading, error };
}
