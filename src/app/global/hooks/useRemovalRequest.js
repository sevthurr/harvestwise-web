import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost, parseResponse } from "../api";

/**
 * Account-removal request state for the requester (farmer / DFTC).
 *
 * `GET /dftc/removal-requests` returns the caller's own rows. A requester may
 * submit again once a request has been rejected, so the newest still-open row
 * wins; if none is open we surface the newest decided one.
 */
const OPEN_STATUSES = ["pending", "submitted"];
// An approved request is still in flight from the requester's point of view, so
// it keeps blocking a duplicate submission — until it is fulfilled. `rejected`,
// `cancelled` and `fulfilled` are terminal and block nothing.
const BLOCKING_STATUSES = ["pending", "submitted", "approved"];

/** Newest first — the API does not guarantee row order. */
function byRequestedAtDesc(a, b) {
  return new Date(b?.requested_at || 0) - new Date(a?.requested_at || 0);
}

export function currentRemovalRequest(items) {
  const sorted = [...(items || [])].sort(byRequestedAtDesc);
  return sorted.find((r) => OPEN_STATUSES.includes(r.status)) || sorted[0] || null;
}

export function isRemovalBlocked(status) {
  return BLOCKING_STATUSES.includes(status);
}

/**
 * `POST /dftc/removal-requests/{id}/cancel` — owner-only cancellation of a
 * request that is still within its grace period. Terminal rows reject.
 */
export async function cancelRemovalRequest(requestId) {
  return parseResponse(await apiPost(`/dftc/removal-requests/${requestId}/cancel`));
}

export function useRemovalRequest(queryKey) {
  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => parseResponse(await apiGet("/dftc/removal-requests")),
    staleTime: 1000 * 60 * 5,
  });

  const current = currentRemovalRequest(data?.items);
  const status = current?.status || null;

  // `fulfilled_at` is the authoritative done marker. It is surfaced separately
  // because a fulfilled row can still carry the `approved` status, and such a
  // row must not keep blocking a new request.
  const fulfilledAt = current?.fulfilled_at || null;
  const blocked = !fulfilledAt && isRemovalBlocked(status);

  /** Cancels the current request. No-op when there is nothing to cancel. */
  const cancel = async () => {
    if (!current?.id) return null;
    return cancelRemovalRequest(current.id);
  };

  return {
    current,
    status,
    fulfilledAt,
    fulfillmentDueAt: current?.fulfillment_due_at || null,
    blocked,
    isLoading,
    refetch,
    cancel,
  };
}
