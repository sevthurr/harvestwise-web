import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Menu,
  Settings,
  LogOut,
  ChevronDown,
  Info,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  WifiOff,
  Cloud,
  X,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { useBackgroundProcess } from "../../contexts/BackgroundProcessContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePWAInstall } from "../../hooks/usePWAInstall";
import { UserAvatar } from "../profile/UserAvatar";
import { formatManilaTime } from "../../utils/apiTransforms";

const TopBar = ({
  logo,
  onMenuClick,
  onNotificationClick,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isNotificationOpen = Boolean(location?.pathname?.includes("/notifications"));
  const { user, logout, offlineCacheStatus } = useAuth();
  const { t } = useLanguage();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() =>
    formatManilaTime()
  );
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine !== false : true));

  const ref = useRef(null);
  const syncRef = useRef(null);
  const clickTimerRef = useRef(null);
  const { processState } = useBackgroundProcess();

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Scoped on purpose: only the manual resync and an active background
  // process count as "syncing". An unfiltered useIsFetching() here made the
  // badge flash "Syncing..." on every route change, because Dashboard,
  // Prices, Profile and Notifications opt back into refetchOnMount:"always"
  // even though the login bundle seeded their cache.
  const isSyncing = isManualSyncing || processState.active;
  const cacheStatus = user?.role?.role_name?.toLowerCase() === "farmer" ? offlineCacheStatus : "idle";
  const cacheStatusCopy = {
    preparing: t("farmer.offline_preparing", {}, "Preparing offline data"),
    ready: t("farmer.offline_ready", {}, "Offline data ready"),
    error: t("farmer.offline_incomplete", {}, "Offline data incomplete"),
  }[cacheStatus];

  // Keep the "Last updated" timestamp in sync when a background process
  // completes and triggers an automatic live resync.
  useEffect(() => {
    if (processState.completed || processState.error) {
      setLastSyncedTime(
        formatManilaTime()
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processState.completed, processState.error]);

  const handleResync = async () => {
    if (isSyncing) return;
    setIsManualSyncing(true);
    try {
      await queryClient.invalidateQueries();
      setLastSyncedTime(
        formatManilaTime()
      );
    } catch (e) {
      console.error("Data resync failed:", e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handlePillClick = (e) => {
    e.preventDefault();
    if (clickTimerRef.current) {
      // Double click detected -> sync immediately
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setSyncOpen(false);
      handleResync();
    } else {
      // Single click -> open overlay
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        setSyncOpen((v) => !v);
      }, 250);
    }
  };

  const handlePillDoubleClick = (e) => {
    e.preventDefault();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    setSyncOpen(false);
    handleResync();
  };

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
      if (syncRef.current && !syncRef.current.contains(e.target)) setSyncOpen(false);
    };
    const keyHandler = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSyncOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const fullName = user?.name || (user?.first_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : "");
  const displayName = fullName || "Farmer";
  const initials = fullName ? fullName.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() : "F";

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleInstall = async () => {
    setInstalling(true);
    await promptInstall();
    setInstalling(false);
    setOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--hw-neutral-200)]">
      <div className="flex items-center h-16 px-3 gap-2">
        {/* Left: sidebar toggle + logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onMenuClick}
            className="hidden md:flex p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          {logo && <div className="flex items-center">{logo}</div>}
        </div>

        <div className="flex-1" />

        {/* Right: sync & offline status · bell · avatar */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Unified Sync & Offline Status */}
          <div className="relative" ref={syncRef}>
            <button
              type="button"
              onClick={handlePillClick}
              onDoubleClick={handlePillDoubleClick}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white hover:bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-all duration-200 text-xs font-medium cursor-pointer shadow-2xs active:scale-95 flex-shrink-0"
              aria-label={t("farmer.offline_data_title", {}, "Offline Data Status")}
              aria-expanded={syncOpen}
              aria-haspopup="dialog"
              title={`${t("common.last_updated", {}, "Last updated")} ${lastSyncedTime}`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[var(--hw-green-700)] flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`} />

              <span className="hidden sm:inline whitespace-nowrap">
                {isSyncing ? t("common.syncing", {}, "Syncing...") : `${t("common.last_updated", {}, "Last updated")} ${lastSyncedTime}`}
              </span>
              <span className="sm:hidden text-[11px] font-semibold text-[var(--hw-neutral-700)] whitespace-nowrap">
                {isSyncing ? t("common.syncing_short", {}, "Syncing") : lastSyncedTime}
              </span>
            </button>

            {/* Offline & Sync Popover */}
            {syncOpen && (
              <div
                role="dialog"
                aria-label={t("farmer.offline_data_title", {}, "Offline Data Status")}
                className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-[var(--shadow-xl)] p-4 z-50 animate-in fade-in zoom-in-95"
              >
                <div className="flex items-start justify-between pb-3 border-b border-[var(--hw-neutral-100)]">
                  <div className="flex items-start gap-2.5 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--hw-green-50)] text-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-black leading-tight">
                        {t("farmer.offline_data_title", {}, "Offline Data Status")}
                      </h3>
                      <p className="text-[12px] text-[var(--hw-neutral-600)] mt-1.5 leading-snug">
                        {!isOnline
                          ? t("farmer.offline_desc_offline", {}, "You are offline. Showing cached data from your device.")
                          : cacheStatus === "error"
                          ? t("farmer.offline_desc_error", {}, "Some offline data could not be saved. Check your connection and tap Sync Now.")
                          : cacheStatus === "preparing"
                          ? t("farmer.offline_desc_preparing", {}, "Saving latest market prices and crop recommendations to your device...")
                          : t("farmer.offline_desc_ready", {}, "Prices, forecasts, and recommendations are saved on this device for offline use.")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSyncOpen(false)}
                    className="p-1 rounded-md text-[var(--hw-neutral-400)] hover:text-black hover:bg-[var(--hw-neutral-100)] transition-colors flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="pt-3">
                  <div className="flex items-center justify-between text-xs text-black mb-3">
                    <span>{t("farmer.last_updated", {}, "Last updated")}</span>
                    <span className="font-semibold">{lastSyncedTime}</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResync}
                    disabled={isSyncing || !isOnline}
                    className="w-full h-9 px-3 bg-[var(--hw-green-700)] hover:bg-[var(--hw-green-800)] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    <span>{isSyncing ? t("farmer.syncing", {}, "Updating latest data...") : t("farmer.sync_now", {}, "Sync Now")}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onNotificationClick}
            className={`relative p-2 rounded-lg transition-all duration-200 cursor-pointer active:scale-95 ${
              isNotificationOpen
                ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] ring-1 ring-[var(--hw-green-600)]/25 hover:bg-[var(--hw-green-100)] shadow-xs"
                : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-100)] hover:text-[var(--hw-neutral-900)]"
            }`}
            aria-label={notificationCount > 0 ? `Notifications, ${notificationCount} unread` : "Notifications"}
            aria-current={isNotificationOpen ? "page" : undefined}
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[var(--hw-error)] text-white text-[10px] font-bold rounded-full flex items-center justify-center pointer-events-none leading-none">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </button>

          {/* Avatar + dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors"
              aria-label="Account menu"
            >
              <UserAvatar
                src={user?.profile_picture_path}
                initials={initials}
                alt={displayName}
                className="w-7 h-7"
                textClassName="text-xs"
              />
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-[var(--hw-neutral-400)] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden z-50">
                {/* Profile identity block */}
                <button
                  onClick={() => go("profile")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left border-b border-[var(--hw-neutral-100)]"
                >
                  <UserAvatar
                    src={user?.profile_picture_path}
                    initials={initials}
                    alt={displayName}
                    className="w-9 h-9"
                    textClassName="text-sm"
                  />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-black truncate">{displayName}</p>
                    <p className="text-[12px] text-black">{t("auth.role_farmer", {}, "Farmer")}</p>
                  </div>
                </button>

                {/* Offline status row */}
                {cacheStatusCopy && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setSyncOpen(true);
                    }}
                    className="w-full px-4 py-2 bg-[var(--hw-neutral-50)] hover:bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-100)] flex items-center justify-between text-xs transition-colors text-left"
                  >
                    <span className="text-[var(--hw-neutral-600)]">{t("farmer.offline_data", {}, "Offline Data")}</span>
                    <span className="font-medium text-[var(--hw-green-700)]">
                      {cacheStatusCopy}
                    </span>
                  </button>
                )}

                {/* Main nav items */}
                <div className="py-1">
                  <button
                    onClick={() => go("settings")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                  >
                    <Settings className="w-4 h-4 flex-shrink-0" />
                    {t("nav.settings", {}, "Settings")}
                  </button>
                  <button
                    onClick={() => go("about")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
                  >
                    <Info className="w-4 h-4 flex-shrink-0" />
                    {t("nav.about", {}, "About")}
                  </button>
                  
                  {/* Install App Button - Always show, only disable when already installed */}
                  <button
                    onClick={handleInstall}
                    disabled={isInstalled || installing}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] disabled:opacity-40 disabled:cursor-not-allowed disabled:text-[var(--hw-neutral-500)] transition-colors text-left"
                  >
                    <Download className="w-4 h-4 flex-shrink-0" />
                    {isInstalled ? t("farmer.navigation.installed", {}, "App Installed") : installing ? t("farmer.navigation.installing", {}, "Installing...") : t("farmer.navigation.get_app", {}, "Get the App")}
                  </button>
                </div>

                {/* Log out */}
                <div className="py-1 border-t border-[var(--hw-neutral-100)]">
                  <button
                    onClick={async () => {
                      setOpen(false);
                      await logout();
                      navigate("/login", { replace: true });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {t("auth.sign_out", {}, "Log out")}
                  </button>
                </div>

                </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export { TopBar };
