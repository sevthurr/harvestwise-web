import { apiPost, apiPut, parseResponse } from "../../global/api";

const OFFLINE_MESSAGE =
  "You can view crop plans offline. Creating or updating one needs an internet connection — reconnect and tap again.";

export function isDeviceOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
export function isConnectionFailure(error) {
  return isDeviceOffline() || (typeof error?.status !== "number" && error?.name !== "AbortError");
}

function offlineError(t) {
  const err = new Error(t("farmer.errors.offline_plan_readonly", {}, OFFLINE_MESSAGE));
  err.offline = true;
  return err;
}

export async function writeCropPlan({ method, path, body, t }) {
  if (isDeviceOffline()) throw offlineError(t);

  try {
    const res = String(method).toLowerCase() === "put"
      ? await apiPut(path, body)
      : await apiPost(path, body);
    return await parseResponse(res);
  } catch (error) {
    if (!isConnectionFailure(error)) throw error;
    throw offlineError(t);
  }
}

