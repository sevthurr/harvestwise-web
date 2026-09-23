import { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Footer } from "../Footer";
import { Toast } from "../ui/hw-ui";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";
import { useFarmerPrefetch } from "../../hooks/useFarmerPrefetch";
import { getUnreadCount } from "../../../../services/api/notificationsApi";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { ChangePasswordPrompt } from "../settings/ChangePasswordPrompt";

const NAV_ROUTES = {
  home: "/farmer",
  prices: "/farmer/prices",
  guide: "/farmer/market",
  crops: "/farmer/crops",
};

function resolveActiveNav(pathname) {
  if (pathname === "/farmer" || pathname === "/farmer/") return "home";
  if (pathname.startsWith("/farmer/prices")) return "prices";
  if (pathname.startsWith("/farmer/forecast")) return "prices";
  if (pathname.startsWith("/farmer/market")) return "guide";
  if (pathname.startsWith("/farmer/crops")) return "crops";
  return "";
}

function FarmerMain({ children }) {
  return <>{children}</>;
}

const Layout = () => {
  useFarmerPrefetch();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeNav = resolveActiveNav(location.pathname);

  // ── Must-change-password prompt ────────────────────────────────────────
  const [showChangePw, setShowChangePw] = useState(false);
  useEffect(() => {
    setShowChangePw(user?.must_change_password === true);
  }, [user?.must_change_password]);

  const handlePasswordChanged = async () => {
    await refreshUser?.();
    setShowChangePw(false);
  };

  // ── Unread notification count ──────────────────────────────────────────
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const { unread_count } = await getUnreadCount();
      setUnreadCount(unread_count);
    } catch {
      // non-fatal — badge stays at last known count
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  // ── SSE: listen for FARMER_NOTIF events ────────────────────────────────
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let es = null;
    const handler = (e) => {
      try {
        const eventData = JSON.parse(e.data);
        if (eventData.type === "FARMER_NOTIF") {
          // If the event carries a user_id, only act on it for the matching farmer.
          // Bulk events (price/weather alerts) omit user_id — always act on those.
          if (eventData.user_id && eventData.user_id !== String(user?.id ?? "")) return;

          // Invalidate cached notifications list so the page refreshes
          queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] });
          // Refresh bell badge
          refreshUnread();
          // Show a brief toast
          setToast({
            type: "info",
            title: t("farmer.notifications.new_notification", {}, "New Notification"),
            message: t(
              "farmer.notifications.new_notification_body",
              {},
              "You have a new notification."
            ),
          });
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };

    try {
      es = new EventSource("/api/v1/notifications/stream");
      es.onmessage = handler;
      es.addEventListener("FARMER_NOTIF", handler);
    } catch {
      // SSE not available (offline / unsupported)
    }

    return () => {
      if (es) {
        es.removeEventListener("FARMER_NOTIF", handler);
        es.close();
      }
    };
  }, [queryClient, refreshUnread, t]);

  const handleNavClick = (id) => {
    navigate(NAV_ROUTES[id] || "/");
  };

  return (
    <div className="min-h-screen bg-[var(--hw-neutral-50)]">
      <PwaInstallPrompt />
      <Sidebar
        activeItem={activeNav}
        onItemClick={handleNavClick}
        collapsed={sidebarCollapsed}
      />

      <TopBar
        logo={
          <img
            src="/horizontal-logo.png"
            alt="HarvestWise"
            style={{ width: "190px", height: "28px", objectFit: "contain" }}
          />
        }
        onMenuClick={() => setSidebarCollapsed((v) => !v)}
        notificationCount={unreadCount}
        onNotificationClick={() => {
          setUnreadCount(0); // optimistic clear on click
          navigate("/farmer/notifications");
        }}
      />

      <main
        className={`pt-16 pb-20 md:pb-6 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}
        style={{ overflowX: "hidden" }}
      >
        <FarmerMain>
          <Outlet />
          <Footer className="mt-4 mb-1" />
        </FarmerMain>
      </main>

      <BottomNav activeItem={activeNav} onItemClick={handleNavClick} />

      {/* SSE toast */}
      {toast && (
        <Toast
          message={toast}
          onClose={() => setToast(null)}
          duration={5000}
        />
      )}

      {/* Must-change-password prompt */}
      {showChangePw && (
        <ChangePasswordPrompt
          onClose={() => setShowChangePw(false)}
          onChanged={handlePasswordChanged}
        />
      )}
    </div>
  );
};

export { Layout };
