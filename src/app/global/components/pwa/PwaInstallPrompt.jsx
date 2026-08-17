import React, { useState, useEffect } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (dismissed) return null;

  return (
    <>
      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-16 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            <span>{t("farmer.offline_available", {}, "Offline Mode Active - Cached data is being used")}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-amber-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* PWA Install prompt */}
      {deferredPrompt && !isOffline && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-[99] max-w-sm bg-white border border-[var(--hw-green-700)] rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--hw-green-50)] text-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-black">Install HarvestWise App</p>
            <p className="text-[11px] text-[var(--hw-neutral-600)] truncate">Access offline prices & forecasts instantly</p>
          </div>
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 bg-[var(--hw-green-700)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--hw-green-800)] transition-colors flex-shrink-0"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setDeferredPrompt(null)}
            className="text-gray-400 hover:text-black p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
