import { useState, useRef, useEffect } from "react";
import { Bell, Menu, RefreshCw, Settings, LogOut, ChevronDown, ArrowLeftRight, Info, Download } from "lucide-react";
import { useNavigate } from "react-router";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { usePWAInstall } from "../../hooks/usePWAInstall";

const TopBar = ({
  logo,
  onMenuClick,
  onNotificationClick,
  notificationCount = 0
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fullName = user?.name || "Juan Dela Cruz";
  const initials = fullName.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

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

        {/* Right: sync · bell · avatar */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 pr-2 text-[var(--hw-neutral-400)]">
            <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs whitespace-nowrap">{t("farmer.last_synced", {}, "Last synced")}: {t("common.updated", {}, "Updated")} 8:30 AM</span>
          </div>

          <button
            onClick={onNotificationClick}
            className="relative p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--hw-error)] rounded-full" />}
          </button>

          {/* Avatar + dropdown */}
          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex items-center gap-1 p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors"
              aria-label="Account menu"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center text-white text-xs font-bold select-none">
                {initials}
              </div>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-[var(--hw-neutral-400)] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-[var(--shadow-lg)] overflow-hidden z-50">
                {/* Profile identity block */}
                <button
                  onClick={() => go("profile")}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left border-b border-[var(--hw-neutral-100)]"
                >
                  <div className="w-9 h-9 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center text-white text-sm font-bold select-none flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-black truncate">{fullName}</p>
                    <p className="text-[12px] text-black">{t("auth.role_farmer", {}, "Farmer")}</p>
                  </div>
                </button>

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
                    {isInstalled ? "App Installed" : installing ? "Installing..." : "Get the App"}
                  </button>
                </div>

                {/* Log out */}
                <div className="py-1 border-t border-[var(--hw-neutral-100)]">
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                      navigate("/login", { replace: true });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 flex-shrink-0" />
                    {t("auth.sign_out", {}, "Log out")}
                  </button>
                </div>

                {/* Switch views */}
                <div className="py-1 border-t border-[var(--hw-neutral-100)]">
                  <button
                    onClick={() => go("/admin")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
                    Switch to Admin View
                  </button>
                  <button
                    onClick={() => go("/dftc")}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 flex-shrink-0" />
                    Switch to DFTC View
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
