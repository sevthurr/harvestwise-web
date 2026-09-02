import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Database,
  TrendingUp,
  LineChart,
  History,
  Bell,
  ChevronDown,
  Settings,
  LogOut,
  ArrowLeftRight,
  RefreshCw,
  Info,
  Shield,
  Layers
} from "lucide-react";
import { Footer } from "../Footer";
import { TextSizeProvider, useTextSize } from "../../contexts/TextSizeContext";
import { useAuth } from "../../contexts/AuthContext";
const FONT_SIZE_MAP = { small: "13px", medium: "15px", large: "17px" };
const ADMIN_NAV = [
  { id: "dashboard", label: "Dashboard", path: "/admin", Icon: LayoutDashboard },
  { id: "modules", label: "Analytical Modules", path: "/admin/modules", Icon: Layers },
  { id: "forecasting", label: "Forecasting", path: "/admin/forecasting", Icon: TrendingUp },
  { id: "data", label: "Data Sources", path: "/admin/data-sources", Icon: Database },
  { id: "history", label: "History", path: "/admin/history", Icon: History }
];
function getActive(pathname) {
  if (pathname === "/admin") return "dashboard";
  if (pathname.startsWith("/admin/data-sources") || pathname.startsWith("/admin/import")) return "data";
  if (pathname.startsWith("/admin/forecasting")) return "forecasting";
  if (pathname.startsWith("/admin/modules") || pathname.startsWith("/admin/analytics")) return "modules";
  if (pathname.startsWith("/admin/history")) return "history";
  return "";
}
const AdminMain = ({ children }) => {
  const { textSize } = useTextSize();
  return <main className="pt-13 pb-16 md:pb-4 md:ml-[220px]" style={{ fontSize: FONT_SIZE_MAP[textSize] }}>
      {children}
    </main>;
};
const AdminLayoutInner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const active = getActive(location.pathname);
  const { user, logout } = useAuth();
  // Build a proper display name whether or not the profile fields are populated.
  // If first_name is available, use "First Last". Otherwise parse the username
  // (which may contain dots, e.g. "kaye.mayugba") and title-case it.
  function toTitleCase(str) {
    return str
      .split(/[._\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  const displayName =
    user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : user?.username
      ? toTitleCase(user.username)
      : "HarvestWise Admin";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "HA";

  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const go = (path) => {
    setAvatarOpen(false);
    navigate(path);
  };

  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  const isSyncing = isManualSyncing || isFetching > 0;

  const handleResync = async () => {
    if (isSyncing) return;
    setIsManualSyncing(true);
    try {
      await queryClient.refetchQueries();
      await queryClient.invalidateQueries();
      setLastSyncedTime(
        new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (e) {
      console.error("Data resync failed:", e);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleLogout = () => {
    setAvatarOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--hw-neutral-50)]">
      {/* ── Compact top bar ── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--hw-neutral-200)] h-13">
        <div className="flex items-center h-13 px-4 gap-3">
          {/* Logo + label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="/horizontal-logo.png" 
              alt="HarvestWise" 
              style={{ width: "140px", height: "20px", objectFit: "contain" }}
            />
            <span className="hidden md:block text-[11px] font-semibold text-[var(--hw-neutral-500)] tracking-wide border-l border-[var(--hw-neutral-200)] pl-2 ml-1">
              Admin Workspace
            </span>
            <span className="md:hidden px-1.5 py-0.5 bg-[var(--hw-green-700)] text-white text-[10px] font-bold rounded tracking-wide">
              ADMIN
            </span>
          </div>

          <div className="flex-1" />

          {/* Resync */}
          <button
            onClick={handleResync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--hw-neutral-50)] hover:bg-[var(--hw-green-50)] border border-[var(--hw-neutral-200)] hover:border-[var(--hw-green-300)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-green-700)] transition-all duration-200 disabled:opacity-60 text-xs font-medium cursor-pointer"
            title={isSyncing ? "Syncing data..." : "Click to resync data"}
            aria-label="Resync data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--hw-green-700)] flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline whitespace-nowrap">
              {isSyncing ? "Syncing..." : `Resync (${lastSyncedTime})`}
            </span>
            <span className="sm:hidden text-[11px] font-semibold text-[var(--hw-green-700)]">
              {isSyncing ? "Syncing" : "Resync"}
            </span>
          </button>

          {/* Bell */}
          <button
            onClick={() => navigate("/admin/notifications")}
            className="relative p-2 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] transition-colors flex-shrink-0 cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Admin avatar + dropdown */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setAvatarOpen((v) => !v)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center">
                <span className="text-white text-[11px] font-bold select-none">{initials}</span>
              </div>
              <span className="hidden sm:block text-[13px] font-medium text-black">{displayName}</span>
              <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-[var(--hw-neutral-400)] transition-transform ${avatarOpen ? "rotate-180" : ""}`} />
            </button>

            {avatarOpen && <div
    className="absolute right-0 top-full mt-1 w-60 bg-white border border-[var(--hw-neutral-200)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden z-50"
    style={{ scrollbarWidth: "none" }}
  >
                {
    /* Identity row → /admin/profile */
  }
                <button
    onClick={() => go("/admin/profile")}
    className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-[var(--hw-neutral-100)] hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                  <div className="w-9 h-9 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[13px] font-bold select-none">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-black truncate">{displayName}</p>
                    <p className="text-[12px] text-black">Admin</p>
                  </div>
                </button>

                {
    /* Menu items */
  }
                <div className="py-1">
                  <button
    onClick={() => go("/admin/settings")}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                    <Settings className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
                    Settings
                  </button>
                  <button
    onClick={() => go("/admin/system")}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                    <Shield className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
                    System Management
                  </button>
                  <button
    onClick={() => go("/admin/about")}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                    <Info className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
                    About
                  </button>
                  <button
    onClick={handleLogout}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-black hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                    <LogOut className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
                    Log out
                  </button>
                </div>

                {
    /* Switch views */
  }
                <div className="py-1 border-t border-[var(--hw-neutral-100)]">
                  <button
    onClick={() => go("/farmer")}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
  >
                    <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
                    Switch to Farmer View
                  </button>
                  <button
    onClick={() => go("/dftc")}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-[14px] text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
  >
                    <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
                    Switch to DFTC View
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </header>

      {
    /* ── Desktop sidebar — compact 220px ── */
  }
      <aside className="fixed left-0 top-13 bottom-0 z-40 w-[220px] bg-white border-r border-[var(--hw-neutral-200)] hidden md:flex flex-col">
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 pt-3" style={{ scrollbarWidth: "none" }}>
          {ADMIN_NAV.map(({ id, label, path, Icon }) => {
    const isActive = active === id;
    return <button
      key={id}
      onClick={() => navigate(path)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${isActive ? "bg-[var(--hw-green-700)] text-white" : "text-black hover:bg-[var(--hw-neutral-100)]"}`}
    >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="text-[13px] font-medium">{label}</span>
              </button>;
  })}
        </nav>

        {
    /* Bottom: switch views + profile */
  }
        <div className="p-2 border-t border-[var(--hw-neutral-200)] space-y-0.5">
          <button
    onClick={() => navigate("/farmer")}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
  >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-[13px] font-medium">Farmer View</span>
          </button>
          <button
    onClick={() => navigate("/dftc")}
    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)] transition-colors text-left"
  >
            <ArrowLeftRight className="w-4 h-4 flex-shrink-0" />
            <span className="text-[13px] font-medium">DFTC View</span>
          </button>
          <button
    onClick={() => navigate("/admin/profile")}
    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors text-left"
  >
            <div className="w-6 h-6 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-bold select-none">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-black truncate">{displayName}</p>
              <p className="text-[11px] text-black">Admin</p>
            </div>
          </button>
        </div>
      </aside>

      {
    /* ── Main content area ── */
  }
      <AdminMain>
        <Outlet />
        <Footer className="mt-6 mb-2" />
      </AdminMain>

      {
    /* ── Mobile bottom nav — exactly 5 items ── */
  }
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[var(--hw-neutral-200)] md:hidden">
        <div className="flex items-stretch">
          {ADMIN_NAV.map(({ id, label, path, Icon }) => {
    const isActive = active === id;
    return <button
      key={id}
      onClick={() => navigate(path)}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive ? "text-[var(--hw-green-700)]" : "text-black"}`}
    >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </button>;
  })}
        </div>
      </nav>
    </div>
  );
};

const AdminLayout = () => (
  <TextSizeProvider storageKey="hw_admin_text_size">
    <AdminLayoutInner />
  </TextSizeProvider>
);

export { AdminLayout };
