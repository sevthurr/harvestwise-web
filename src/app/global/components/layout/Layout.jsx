import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Footer } from "../Footer";
import { TextSizeProvider, useTextSize } from "../../contexts/TextSizeContext";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";

const NAV_ROUTES = {
  home: "/farmer",
  prices: "/farmer/prices",
  guide: "/farmer/market",
  crops: "/farmer/crops"
};

function resolveActiveNav(pathname) {
  if (pathname === "/farmer" || pathname === "/farmer/") return "home";
  if (pathname.startsWith("/farmer/prices")) return "prices";
  if (pathname.startsWith("/farmer/forecast")) return "prices";
  if (pathname.startsWith("/farmer/market")) return "guide";
  if (pathname.startsWith("/farmer/crops")) return "crops";
  return "";
}

const FONT_SIZE_MAP = { small: "13px", medium: "15px", large: "17px" };

function FarmerMain({ children }) {
  const { textSize } = useTextSize();
  return (
    <div style={{ fontSize: FONT_SIZE_MAP[textSize] }}>
      {children}
    </div>
  );
}

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeNav = resolveActiveNav(location.pathname);
  const handleNavClick = (id) => {
    navigate(NAV_ROUTES[id] || "/");
  };

  return (
    <TextSizeProvider>
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
          notificationCount={3}
          onNotificationClick={() => navigate("/farmer/notifications")}
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
      </div>
    </TextSizeProvider>
  );
};

export { Layout };
