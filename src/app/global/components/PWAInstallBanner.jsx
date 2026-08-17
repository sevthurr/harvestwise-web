import { useState } from 'react';
import { Download, Check, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallBanner({ showToast }) {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const result = await promptInstall();
    setInstalling(false);
    
    if (result.outcome === 'accepted') {
      showToast("HarvestWise is being installed...");
    } else if (result.outcome === 'dismissed') {
      showToast("Installation cancelled.");
    } else if (result.outcome === 'unavailable') {
      showToast("Install not available. Try using Chrome or Edge browser.");
    } else if (result.outcome === 'error') {
      showToast("Installation error. Please try again.");
    }
  };

  // Show install banner only if installable and not installed
  if (!isInstallable || isInstalled) {
    return null;
  }

  return (
    <div className="mb-5 p-4 bg-gradient-to-r from-[var(--hw-green-50)] to-[var(--hw-green-100)] border-2 border-[var(--hw-green-700)] rounded-2xl shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
          <Download className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[16px] font-bold text-[var(--hw-green-900)] mb-1">
            Install HarvestWise App
          </p>
          <p className="text-[13px] text-[var(--hw-green-800)] leading-relaxed mb-3">
            Get instant access to all HarvestWise features offline. 
            Install now to use HarvestWise like a native app on your device.
          </p>
          <button
            type="button"
            onClick={handleInstall}
            disabled={installing}
            className="w-full sm:w-auto h-10 px-5 flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors shadow-sm"
          >
            {installing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Install Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function PWAInstalledBadge() {
  const { isInstalled } = usePWAInstall();

  if (!isInstalled) {
    return null;
  }

  return (
    <div className="mb-5 p-4 bg-[var(--hw-green-50)] border border-[var(--hw-green-700)] rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[var(--hw-green-900)]">
            ✓ App Installed
          </p>
          <p className="text-[13px] text-[var(--hw-green-800)] mt-0.5">
            HarvestWise is installed on your device
          </p>
        </div>
      </div>
    </div>
  );
}
