import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { Footer } from "../Footer";
import { TextSizeProvider, useTextSize } from "../../contexts/TextSizeContext";
import { PwaInstallPrompt } from "../pwa/PwaInstallPrompt";

const NAV_ROUTES = {
  home: "/",
  prices: "/prices",
  guide: "/market",
  crops: "/crops"
};

function resolveActiveNav(pathname) {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/prices")) return "prices";
  if (pathname.startsWith("/forecast")) return "prices";
  if (pathname.startsWith("/market")) return "guide";
  if (pathname.startsWith("/crops")) return "crops";
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
          onNotificationClick={() => navigate("/insights")}
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
