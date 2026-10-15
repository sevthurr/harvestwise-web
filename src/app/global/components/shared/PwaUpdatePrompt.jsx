import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { applyUpdate, subscribeUpdateAvailable } from "../../lib/pwaUpdate";

/**
 * Global "new version available" prompt.
 *
 * vite.config.js registers the service worker with `registerType: 'prompt'`, so
 * a newly deployed build downloads and then *waits* — it never takes over on
 * its own. The waiting worker is only activated when the app calls
 * `applyUpdate()`.
 *
 * Previously the only affordance that called it lived in the farmer Menu card,
 * so any workspace without that card (notably the admin portal) stayed pinned
 * to the previous precached bundle after a deploy and could not recover without
 * manually clearing the service worker. Rendering this once at the app root
 * gives every role the same way out.
 */
export function PwaUpdatePrompt() {
  const [available, setAvailable] = useState(false);

  useEffect(() => subscribeUpdateAvailable(setAvailable), []);

  if (!available) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[min(92vw,420px)] flex items-center gap-3 px-4 py-3 rounded-2xl border border-[var(--hw-neutral-200)] bg-white shadow-lg"
    >
      <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0">
        <RefreshCw className="w-5 h-5 text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--hw-neutral-900)]">App update available</p>
        <p className="text-xs text-[var(--hw-neutral-600)] mt-0.5">A new version of HarvestWise is ready to install.</p>
      </div>
      <button
        type="button"
        onClick={applyUpdate}
        className="flex-shrink-0 px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Update now
      </button>
    </div>
  );
}

export default PwaUpdatePrompt;
