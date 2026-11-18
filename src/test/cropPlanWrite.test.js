import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiPostMock, apiPutMock, parseResponseMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  apiPutMock: vi.fn(),
  parseResponseMock: vi.fn(),
}));

vi.mock("../app/global/api", () => ({
  apiPost: apiPostMock,
  apiPut: apiPutMock,
  parseResponse: parseResponseMock,
}));

import { isDeviceOffline, isConnectionFailure, writeCropPlan } from "../app/farmer/utils/cropPlanWrite";

const OFFLINE_MESSAGE =
  "You can view crop plans offline. Creating or updating one needs an internet connection — reconnect and tap again.";

const originalOnLine = navigator.onLine;
const tMock = vi.fn((key, params, fallback) => fallback);

function setOnline(value) {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  setOnline(true);
  apiPostMock.mockResolvedValue({ ok: true });
  apiPutMock.mockResolvedValue({ ok: true });
  parseResponseMock.mockResolvedValue({ id: "plan-1" });
});

afterEach(() => {
  setOnline(originalOnLine);
});

describe("writeCropPlan", () => {
  it("throws a tagged localized error before any fetch when the device is offline", async () => {
    setOnline(false);
    expect(isDeviceOffline()).toBe(true);

    await expect(writeCropPlan({ method: "POST", path: "/crop-plans", body: {}, t: tMock }))
      .rejects.toMatchObject({ offline: true, message: OFFLINE_MESSAGE });

    expect(tMock).toHaveBeenCalledWith(
      "farmer.errors.offline_plan_readonly",
      {},
      OFFLINE_MESSAGE
    );
    expect(apiPostMock).not.toHaveBeenCalled();
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(parseResponseMock).not.toHaveBeenCalled();
  });

  it("turns a connection rejection without a status into the same offline error", async () => {
    apiPostMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(writeCropPlan({ method: "POST", path: "/crop-plans", body: {}, t: tMock }))
      .rejects.toMatchObject({ offline: true, message: OFFLINE_MESSAGE });

    expect(apiPostMock).toHaveBeenCalledTimes(1);
    expect(parseResponseMock).not.toHaveBeenCalled();
  });

  it("preserves an HTTP error and its backend detail", async () => {
    const httpError = new Error("commodity is required");
    httpError.status = 422;
    parseResponseMock.mockRejectedValueOnce(httpError);
    expect(isConnectionFailure(httpError)).toBe(false);

    const res = { ok: true };
    apiPutMock.mockResolvedValueOnce(res);
    await expect(writeCropPlan({
      method: "PUT",
      path: "/crop-plans/plan-1/status",
      body: { target_status: "Planted" },
      t: tMock,
    })).rejects.toBe(httpError);

    expect(apiPutMock).toHaveBeenCalledWith("/crop-plans/plan-1/status", { target_status: "Planted" });
    expect(parseResponseMock).toHaveBeenCalledWith(res);
    expect(tMock).not.toHaveBeenCalled();
  });

  it("does not treat an AbortError from a session change as offline", async () => {
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    apiPostMock.mockRejectedValueOnce(abortError);
    expect(isConnectionFailure(abortError)).toBe(false);

    await expect(writeCropPlan({ method: "POST", path: "/crop-plans", body: {}, t: tMock }))
      .rejects.toBe(abortError);
  });
});
