import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ingestionApi } from "../../../services/api";

const BackgroundProcessContext = createContext(null);

const VERIFY_TIMEOUT = 15000;

async function verifyImportStatus(importId) {
  const poll = ingestionApi.getHistoryDetail(importId);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("verify timeout")), VERIFY_TIMEOUT)
  );
  const result = await Promise.race([poll, timeout]);
  const status = result?.status;
  if (status === "completed" || status === "success" || status === "failed") {
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
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
    const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

    queryClient.invalidateQueries();
    // Force-refetch every currently mounted query so all visible pages update
    // live as soon as the background process finishes (no manual per-page sync).
    queryClient.refetchQueries();

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

  // Connect to SSE stream for real-time background events
  useEffect(() => {
    let es = null;
    const handlers = [];
    try {
      es = new EventSource("/api/v1/notifications/stream");

      const handleEvent = async (e) => {
        try {
          const eventData = JSON.parse(e.data);

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
          console.warn("SSE parse error", err);
        }
      };

      // Listen for the default "message" event (no "event:" field in SSE)
      es.onmessage = handleEvent;
      // Also listen for named events sent by backend ("event: DATASET_INGESTED")
      es.addEventListener("DATASET_INGESTED", handleEvent);
      handlers.push(["DATASET_INGESTED", handleEvent]);
    } catch (err) {
      console.warn("SSE connection error", err);
    }
    return () => {
      if (es) {
        handlers.forEach(([name, fn]) => es.removeEventListener(name, fn));
        es.close();
      }
    };
  }, [finishProcess]);

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
  lastUpdatedTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  startProcess: () => {},
  updateProgress: () => {},
  finishProcess: () => {},
  setLastUpdatedTime: () => {},
};

export const useBackgroundProcess = () => {
  const ctx = useContext(BackgroundProcessContext);
  return ctx || dummyFallback;
};

