import { useQueryClient } from "@tanstack/react-query";
import { useNotificationEvent } from "../contexts/NotificationStreamContext";

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

  useNotificationEvent("DATASET_INGESTED", (data) => {
    for (const queryKey of farmerDataSyncScopes(data?.type)) {
      // Invalidate (not refetchQueries): inactive queries are marked stale and
      // refetched on their next mount; only mounted observers refetch now.
      queryClient.invalidateQueries({ queryKey });
    }
  });
}
