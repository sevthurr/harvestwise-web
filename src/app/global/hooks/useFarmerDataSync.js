import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationEvent } from "../contexts/NotificationStreamContext";
import { loadFarmerOfflineData } from "./useFarmerPrefetch";

const OFFLINE_RESEED_COALESCE_MS = 1000;

/**
 * Query-key prefixes to invalidate for each data-channel event. The stream
 * dispatches the payload `type` in addition to the channel event name, and
 * `DATASET_INGESTED` is the stable channel event; switching on `data.type`
 * keeps this independent of which channel carried the frame.
 */
export const FARMER_DATA_SYNC_SCOPES = Object.freeze({
  PRICES_UPDATED: Object.freeze([
    ["prices"],
    ["dashboard"],
    ["price-detail"],
    ["farmer-price-card-trend"],
    ["farmer", "admin-price-outlook"],
  ]),
  ARRIVAL_UPDATED: Object.freeze([["farmer", "arrival-pressure"]]),
  COMMODITIES_UPDATED: Object.freeze([["prices"]]),
});

export function farmerDataSyncScopes(type) {
  return FARMER_DATA_SYNC_SCOPES[type] ?? [];
}

export function useFarmerDataSync() {
  const queryClient = useQueryClient();
  const reseedTimerRef = useRef(null);

  useEffect(() => () => {
    if (reseedTimerRef.current !== null) clearTimeout(reseedTimerRef.current);
  }, []);

  useNotificationEvent("DATASET_INGESTED", (data) => {
    const scopes = farmerDataSyncScopes(data?.type);
    for (const queryKey of scopes) {
      // Invalidate (not refetchQueries): inactive queries are marked stale and
      // refetched on their next mount; only mounted observers refetch now.
      queryClient.invalidateQueries({ queryKey });
    }
    if (!scopes.length) return;

    // One upload emits several typed events back-to-back, and a forced load
    // starts even while another is in flight. Coalesce the burst into one seed.
    if (reseedTimerRef.current !== null) clearTimeout(reseedTimerRef.current);
    reseedTimerRef.current = setTimeout(() => {
      reseedTimerRef.current = null;
      // Read connectivity when the timer fires: a disconnect inside the
      // coalescing window would otherwise write a stale bundle on reconnect.
      if (navigator.onLine === false) return;
      (async () => {
        try {
          await loadFarmerOfflineData(queryClient, { force: true });
        } catch (err) {
          console.warn("farmer data sync offline re-seed failed", err);
        }
      })();
    }, OFFLINE_RESEED_COALESCE_MS);
  });
}
