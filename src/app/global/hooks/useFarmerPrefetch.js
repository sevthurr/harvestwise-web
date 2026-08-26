import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiGet, parseResponse } from "../api";
import { toCamelCase } from "../utils/apiTransforms";

export function useFarmerPrefetch() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const STALE_TIME = 1000 * 60 * 30; // 30 mins

    // 1. All price records (Retail, Wholesale, Landing, Forecasts across all sources)
    queryClient.prefetchQuery({
      queryKey: ["prices", "list"],
      queryFn: async () => {
        const res = await apiGet("/prices?page_size=100");
        return parseResponse(res);
      },
      staleTime: STALE_TIME,
    });

    // 2. Dashboard summary prices
    queryClient.prefetchQuery({
      queryKey: ["dashboard", "prices"],
      queryFn: async () => {
        const res = await apiGet("/prices?page_size=100");
        if (!res.ok) return [];
        const pricesData = await parseResponse(res);
        const baseMap = new Map();
        (pricesData?.items || []).forEach((item) => {
          const camelItem = toCamelCase(item);
          const isTop = camelItem.isTop10 === true || item.is_top10 === true;
          if (!isTop) return;
          const name = camelItem.name || "–";
          const retailPrice = camelItem.prices?.bangkerohanRetail ?? camelItem.prices?.dftcRetail ?? null;
          if (!baseMap.has(name)) {
            baseMap.set(name, {
              id: camelItem.commodityId,
              name,
              baseName: camelItem.baseName,
              price: retailPrice,
              uom: camelItem.unitOfMeasure || "kg",
              direction: camelItem.forecast?.trend || null,
            });
          } else if (retailPrice !== null && baseMap.get(name).price === null) {
            const existing = baseMap.get(name);
            existing.price = retailPrice;
            existing.direction = camelItem.forecast?.trend || existing.direction;
            existing.id = camelItem.commodityId;
          }
        });
        return Array.from(baseMap.values());
      },
      staleTime: STALE_TIME,
    });

    // 3. Farmer profile
    queryClient.prefetchQuery({
      queryKey: ["dashboard", "profile"],
      queryFn: async () => {
        const res = await apiGet("/farmer/profile");
        if (res.ok) return parseResponse(res);
        return null;
      },
      staleTime: STALE_TIME,
    });

    // 4. Crop plans (used by Dashboard, CropsContext, MarketCalendar, Recommendation)
    queryClient.prefetchQuery({
      queryKey: ["farmer", "crops"],
      queryFn: async () => {
        const res = await apiGet("/crop-plans");
        if (!res.ok) return [];
        const data = await parseResponse(res);
        return data?.crop_plans || data?.items || (Array.isArray(data) ? data : []);
      },
      staleTime: STALE_TIME,
    });

    // 5. Backend unified daily snapshot (offline bundle & ETag sync)
    queryClient.prefetchQuery({
      queryKey: ["farmer", "dailySnapshot"],
      queryFn: async () => {
        const res = await apiGet("/farmer/daily-snapshot");
        if (res.ok) return parseResponse(res);
        return null;
      },
      staleTime: STALE_TIME,
    });

    // 6. Market calendar events
    queryClient.prefetchQuery({
      queryKey: ["marketCalendar"],
      queryFn: async () => {
        const marketRes = await apiGet("/market/calendar");
        if (!marketRes.ok) return [];
        const data = await parseResponse(marketRes);
        return data.items || [];
      },
      staleTime: STALE_TIME,
    });

    // 7. Weather advisory for Market Weather page
    queryClient.prefetchQuery({
      queryKey: ["weather", "advisory"],
      queryFn: async () => {
        const res = await apiGet("/weather/advisory?latitude=7.0722&longitude=125.6131");
        if (!res.ok) return null;
        return parseResponse(res);
      },
      staleTime: STALE_TIME,
    });
  }, [queryClient]);
}
