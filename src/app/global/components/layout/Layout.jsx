import { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Footer } from "../Footer";
import { Toast } from "../ui/hw-ui";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";
import { useFarmerPrefetch } from "../../hooks/useFarmerPrefetch";
import { getUnreadCount } from "../../../../services/api/notificationsApi";
import { useNotificationEvent } from "../../contexts/NotificationStreamContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useAuth } from "../../contexts/AuthContext";
import { ChangePasswordPanel } from "../settings/ChangePasswordPanel";

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

  // ── Must-change-password block ─────────────────────────────────────────
  // Replaces the workspace content, not an overlay. `rotated` is cleared the
  // moment the POST succeeds: change_password() revokes every session and
  // purges the cached snapshot before returning, so the next /auth/me can come
  // back 401 and null out `user` — and with no dismiss affordance, a gate
  // derived from the flag alone would strand the user with no way forward. The
  // rotation already committed server-side; refreshUser() only reconciles the
  // cache, so it is best-effort. Same reasoning as AuthContext.patchUser.
  const [rotated, setRotated] = useState(false);
  const pendingPasswordChange = user?.must_change_password === true && !rotated;

  const handlePasswordRotated = async () => {
    setRotated(true);
    try {
      await refreshUser?.();
    } catch {
      // Deliberately swallowed — see above.
    }
  };

  // ── Unread notification count ──────────────────────────────────────────
  const { data: unreadData, refetch: refreshUnread } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      try {
        const res = await getUnreadCount();
        return res?.unread_count ?? 0;
      } catch {
        return 0;
      }
    },
    staleTime: 10 * 1000,
    refetchOnWindowFocus: true,
  });
  const unreadCount = typeof unreadData === "number" ? unreadData : (unreadData?.unread_count ?? 0);

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
  }, [location.pathname, queryClient]);

  // ── SSE: react to NOTIFICATION_CREATED events ──────────────────────────
  const [toast, setToast] = useState(null);

  // The stream is shared app-wide and already scoped to the authenticated
  // user's private Redis channel, so every NOTIFICATION_CREATED frame on it
  // belongs to this user — no client-side user_id filtering is needed.
  useNotificationEvent("NOTIFICATION_CREATED", () => {
    // Invalidate cached notifications list so the page refreshes
    queryClient.invalidateQueries({ queryKey: ["farmer-notifications"] });
    // Refresh bell badge
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
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
  });

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
          navigate("/farmer/notifications");
        }}
      />

      <main
        className={`pt-16 pb-20 md:pb-6 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}
        style={{ overflowX: "hidden" }}
      >
        <FarmerMain>
          {pendingPasswordChange ? (
            <ChangePasswordPanel onRotated={handlePasswordRotated} />
          ) : (
            <>
              <Outlet />
              <Footer className="mt-4 mb-1" />
            </>
          )}
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
    </div>
  );
};

export { Layout };
