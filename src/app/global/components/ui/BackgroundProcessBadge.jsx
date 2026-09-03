import React from "react";
import { Clock, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useBackgroundProcess } from "../../contexts/BackgroundProcessContext";
import { useIsFetching } from "@tanstack/react-query";

/**
 * BackgroundProcessBadge:
 * Pops up beside the Last Updated button whenever a background process (file upload, dataset processing) is active.
 * Only rendered for Admin and DFTC personnel.
 */
export const BackgroundProcessBadge = () => {
  const { processState } = useBackgroundProcess();

  if (!processState.active && !processState.completed && !processState.error) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-300 shadow-[var(--shadow-xs)] animate-fadeIn ${
        processState.error
          ? "bg-red-50 border-red-200 text-red-700"
          : processState.completed
          ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : "bg-emerald-50/90 border-emerald-300 text-emerald-800"
      }`}
    >
      {processState.error ? (
        <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
      ) : processState.completed ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
      ) : (
        <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin flex-shrink-0" />
      )}

      <div className="flex flex-col min-w-[130px] max-w-[240px]">
        <div className="flex items-center justify-between text-[11px] font-semibold gap-2 leading-tight">
          <span className="truncate">{processState.title}</span>
          <span className="flex-shrink-0 text-[10px] font-bold">
            {processState.completed ? "100%" : `${Math.round(processState.progress)}%`}
          </span>
        </div>
        {/* Progress bar track */}
        <div className="w-full h-1 bg-emerald-200/80 rounded-full overflow-hidden mt-1">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              processState.error ? "bg-red-500" : "bg-emerald-600"
            }`}
            style={{ width: `${processState.completed ? 100 : processState.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * LastUpdatedButton:
 * Functional button used for manually syncing data, labeled "Last updated <time>".
 */
export const LastUpdatedButton = ({ onClick, isSyncing = false, lastUpdatedTime }) => {
  const isFetching = useIsFetching();
  const activeSync = isSyncing || isFetching > 0;
  const timeDisplay = lastUpdatedTime || new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <button
      onClick={onClick}
      disabled={activeSync}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--hw-neutral-50)] hover:bg-[var(--hw-green-50)] border border-[var(--hw-neutral-200)] hover:border-[var(--hw-green-300)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-green-700)] transition-all duration-200 disabled:opacity-60 text-xs font-medium cursor-pointer"
      title={activeSync ? "Syncing data..." : "Click to sync data"}
      aria-label="Last updated / sync data"
    >
      <RefreshCw className={`w-3.5 h-3.5 text-[var(--hw-green-700)] flex-shrink-0 ${activeSync ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline whitespace-nowrap">
        {activeSync ? "Syncing..." : `Last updated ${timeDisplay}`}
      </span>
      <span className="sm:hidden text-[11px] font-semibold text-[var(--hw-green-700)]">
        {activeSync ? "Syncing" : timeDisplay}
      </span>
    </button>
  );
};
