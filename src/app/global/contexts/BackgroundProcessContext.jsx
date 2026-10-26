import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ingestionApi } from "../../../services/api";
import { useNotificationEvent } from "./NotificationStreamContext";
import { formatManilaTime } from "../utils/apiTransforms";

const BackgroundProcessContext = createContext(null);

const VERIFY_TIMEOUT = 15000;

// Ingestion changes data-backed views, not authentication, settings, or every
// mounted query in the application. Keeping this list explicit prevents one
// completed upload from refetching unrelated pages and exhausting the API.
const INGESTION_QUERY_PREFIXES = [
  ["adminDashboard"],
  ["adminDataSources"],
  ["adminApiSyncSources"],
  ["adminHistory"],
  ["adminDataSourceRecords"],
  ["dftc"],
  ["dftc-submissions"],
  ["dftc-home"],
  ["dftc-notifications"],
  ["dftc-report-preview"],
  ["prices"],
  ["farmer"],
  ["dashboard"],
  ["advisory"],
  ["weather"],
  ["recommendations"],
  ["monthly-recommendations"],
  ["marketCalendar"],
  ["notifications"],
];

async function verifyImportStatus(importId) {
  const poll = ingestionApi.getHistoryStatus(importId);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("verify timeout")), VERIFY_TIMEOUT)
  );
  const result = await Promise.race([poll, timeout]);
  const status = result?.status;
  if (
    status === "completed" ||
    status === "success" ||
    status === "failed" ||
    status === "completed_with_forecast_error" ||
    status === "waiting_for_complete_series"
  ) {
    return status;
  }
  return "processing";
}

export const BackgroundProcessProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [processState, setProcessState] = useState({
    active: false,
    title: "",
    progress: 0,
    statusText: "",
    eta: "",
    completed: false,
    error: false,
  });

  const activeImportIdRef = useRef(null);

  const [lastUpdatedTime, setLastUpdatedTime] = useState(() =>
    formatManilaTime()
  );

  const startProcess = useCallback(({ title, statusText = "Processing...", initialProgress = 10, importId = null }) => {
    activeImportIdRef.current = importId;
    setProcessState({
      active: true,
      title: title || "Background Task",
      progress: initialProgress,
      statusText,
      eta: "in progress...",
      completed: false,
      error: false,
    });
  }, []);

  const updateProgress = useCallback((progress, statusText, eta) => {
    setProcessState((prev) => ({
      ...prev,
      active: true,
      progress: Math.min(100, Math.max(0, progress)),
      statusText: statusText || prev.statusText,
      eta: eta !== undefined ? eta : prev.eta,
    }));
  }, []);

  const finishProcess = useCallback((message = "Completed", isError = false) => {
    const nowStr = formatManilaTime();
    setLastUpdatedTime(nowStr);
    activeImportIdRef.current = null;
    setProcessState(prev => ({
      ...prev,
      active: false,
      completed: !isError,
      error: isError,
      progress: 100,
      statusText: message,
    }));

    if (!isError) {
      for (const queryKey of INGESTION_QUERY_PREFIXES) {
        queryClient.invalidateQueries({ queryKey });
      }
    }

    // Auto-hide completed badge after 4 seconds
    setTimeout(() => {
      setProcessState((prev) => {
        if (!prev.active) {
          return { active: false, title: "", progress: 0, statusText: "", eta: "", completed: false, error: false };
        }
        return prev;
      });
    }, 4000);
  }, [queryClient]);

  // Listen for real-time background events on the shared notification stream.
  // This provider used to open its own SSE connection; it now subscribes, so a
  // session holds one connection instead of one per layout plus one per page.
  const handleEvent = useCallback(async (eventData) => {
      try {

          // Only act on completion/failure events. A broadcast's import_id must
          // match the currently active import; otherwise (unrelated PSA syncs,
          // broadcast PRICES_UPDATED for other files) we ignore it so the badge
          // does not jump to "completed" while our own upload is still running.
          if (
            eventData.type === "DATASET_INGESTION_SUCCESS" ||
            eventData.type === "DATASET_INGESTED" ||
            eventData.type === "PRICES_UPDATED"
          ) {
            const activeId = activeImportIdRef.current;
            const eventId = eventData.import_id || eventData.importId;
            if (!activeId) return;
            if (eventId && String(eventId) !== String(activeId)) return;

            // Confirm against the DB that this specific import is genuinely done
            // before marking the badge complete.
            try {
              const importDetail = await verifyImportStatus(activeId);
              if (!importDetail) return;
              if (importDetail === "completed" || importDetail === "success") {
                finishProcess(`Updated: ${eventData.filename || "Data Ingestion"}`);
              } else if (importDetail === "completed_with_forecast_error") {
                finishProcess("Data stored; forecast generation failed", true);
              } else if (importDetail === "waiting_for_complete_series") {
                finishProcess("Data stored; forecast waiting for complete series");
              } else if (importDetail === "failed") {
                finishProcess(eventData.error || "Ingestion failed", true);
              }
              // still running -> leave the badge active
            } catch {
              finishProcess(`Updated: ${eventData.filename || "Data Ingestion"}`);
            }
          } else if (eventData.type === "DATASET_INGESTION_FAILED") {
            const activeId = activeImportIdRef.current;
            const eventId = eventData.import_id || eventData.importId;
            if (!activeId) return;
            if (eventId && String(eventId) !== String(activeId)) return;
            finishProcess(eventData.error || "Ingestion failed", true);
          }
      } catch (err) {
        console.warn("SSE handler error", err);
      }
  }, [finishProcess]);

  // DATASET_INGESTED is the SSE event name the server uses for everything on
  // the shared data channel. The payload's own `type` still discriminates
  // ingestion success / price update / ingestion failure below.
  useNotificationEvent("DATASET_INGESTED", handleEvent);

  return (
    <BackgroundProcessContext.Provider
      value={{
        processState,
        lastUpdatedTime,
        startProcess,
        updateProgress,
        finishProcess,
        setLastUpdatedTime,
      }}
    >
      {children}
    </BackgroundProcessContext.Provider>
  );
};

const dummyFallback = {
  processState: { active: false, title: "", progress: 0, statusText: "", eta: "", completed: false, error: false },
  lastUpdatedTime: formatManilaTime(),
  startProcess: () => {},
  updateProgress: () => {},
  finishProcess: () => {},
  setLastUpdatedTime: () => {},
};

export const useBackgroundProcess = () => {
  const ctx = useContext(BackgroundProcessContext);
  return ctx || dummyFallback;
};

