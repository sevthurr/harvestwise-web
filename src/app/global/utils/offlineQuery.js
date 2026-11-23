/**
 * Returns the appropriate refetchOnMount value based on connectivity.
 * When offline, skip refetch so the persisted cache is shown as-is.
 * When online, use the caller's preferred strategy.
 */
export function offlineAwareRefetch(onlineValue = true) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  return onlineValue;
}
