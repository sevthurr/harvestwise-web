import React from "react";
import { lazy } from "react";
import { createBrowserRouter, Navigate, useParams, useSearchParams } from "react-router";
import { Layout } from "./global/components/layout/Layout";
import { AdminLayout } from "./global/components/layout/AdminLayout";
import { ProtectedRoute } from "./global/components/ProtectedRoute";
import { roleHome, useAuth } from "./global/contexts/AuthContext";
import { RouteErrorElement } from "./global/components/RouteError";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import ForgotPasswordPage from "./auth/ForgotPasswordPage";
import ResetPasswordPage from "./auth/ResetPasswordPage";
import OnboardingPage from "./auth/OnboardingPage";
const DashboardPage = lazy(() => import("./farmer/pages/Dashboard"));
const PricesPage = lazy(() => import("./farmer/pages/Prices"));
const CommodityDetailPage = lazy(() => import("./farmer/pages/CommodityDetail"));
const DftcWholesaleDetailPage = lazy(() => import("./farmer/pages/DftcWholesaleDetail"));
const ForecastPage = lazy(() => import("./farmer/pages/Forecast"));
const ForecastDetailPage = lazy(() => import("./farmer/pages/ForecastDetail"));
const DftcWholesaleForecastPage = lazy(() => import("./farmer/pages/DftcWholesaleForecast"));
const AssessPage = lazy(() => import("./farmer/pages/Assess"));
const RecommendationPage = lazy(() => import("./farmer/pages/Recommendation"));
const MarketLayout = lazy(() => import("./farmer/pages/MarketPage").then((m) => ({ default: m.MarketLayout })));
const MarketOverviewPage = lazy(() => import("./farmer/pages/MarketPage").then((m) => ({ default: m.MarketOverviewPage })));
const MarketWeatherPage = lazy(() => import("./farmer/pages/MarketWeather"));
const MarketCalendarPage = lazy(() => import("./farmer/pages/MarketCalendar"));
const MarketOutlookDetailPage = lazy(() => import("./farmer/pages/MarketOutlookDetail"));
const DftcArrivalDetailsPage = lazy(() => import("./farmer/pages/DftcArrivalDetails"));
const SeasonalProductionDetailsPage = lazy(() => import("./farmer/pages/SeasonalProductionDetails"));
const MyCropsPage = lazy(() => import("./farmer/pages/MyCrops"));
const CropCycleDetailPage = lazy(() => import("./farmer/pages/CropCycleDetail"));
const CropArrivalPressureDetailsPage = lazy(() => import("./farmer/pages/CropArrivalPressureDetails"));
const CropSeasonalProductionDetailsPage = lazy(() => import("./farmer/pages/CropSeasonalProductionDetails"));
const PriceTrendDetailPage = lazy(() => import("./farmer/pages/PriceTrendDetail"));
const CropFactorsPage = lazy(() => import("./farmer/pages/CropFactorsPage"));
const FactorDetailPage = lazy(() => import("./farmer/pages/FactorDetailPage"));
const InsightsPage = lazy(() => import("./farmer/pages/Insights"));
const MenuPage = lazy(() => import("./farmer/pages/Menu"));
const NotificationsPage = lazy(() => import("./farmer/pages/Notifications"));
const ShowcasePage = lazy(() => import("./farmer/pages/Showcase"));
const FarmerProfile = lazy(() => import("./farmer/pages/FarmerProfile"));
const FarmerSettings = lazy(() => import("./farmer/pages/FarmerSettings"));
const AboutPage = lazy(() => import("./farmer/pages/About"));
const MyActivitiesPage = lazy(() => import("./farmer/pages/MyActivities"));

import PrivacyPolicyPage from "./global/pages/PrivacyPolicyPage";
import TermsPage from "./global/pages/TermsPage";
// DFTC workspace — lazy loaded so the login bundle excludes all DFTC page code
import { DFTCLayout }       from "./global/components/layout/DFTCLayout";
const DFTCHome             = lazy(() => import("./dftc/pages/DFTCHome"));
const DFTCInput            = lazy(() => import("./dftc/pages/DFTCInput"));
const DFTCTrends           = lazy(() => import("./dftc/pages/DFTCTrends"));
const DFTCSubmissions      = lazy(() => import("./dftc/pages/DFTCSubmissions"));
const DFTCPriceInput       = lazy(() => import("./dftc/pages/DFTCPriceInput"));
const DFTCArrivalInput     = lazy(() => import("./dftc/pages/DFTCArrivalInput"));
const DFTCGenerateReport   = lazy(() => import("./dftc/pages/DFTCGenerateReport"));
const DFTCUpload              = lazy(() => import("./dftc/pages/DFTCUpload"));
const DFTCTemporaryRecords    = lazy(() => import("./dftc/pages/DFTCTemporaryRecords"));
const DFTCTemporaryRecordDetail = lazy(() => import("./dftc/pages/DFTCTemporaryRecordDetail"));
const DFTCSubmissionDetail      = lazy(() => import("./dftc/pages/DFTCSubmissionDetail"));
const DFTCCommodityRecords      = lazy(() => import("./dftc/pages/DFTCCommodityRecords"));
const DFTCNotifications         = lazy(() => import("./dftc/pages/DFTCNotifications"));
const DFTCProfile               = lazy(() => import("./dftc/pages/DFTCProfile"));
const DFTCSettings              = lazy(() => import("./dftc/pages/DFTCSettings"));
const DFTCAbout                 = lazy(() => import("./dftc/pages/DFTCAbout"));
const DFTCAuditLogs             = lazy(() => import("./dftc/pages/DFTCAuditLogs"));
const DFTCEditApprovalRequests  = lazy(() => import("./dftc/pages/DFTCEditApprovalRequests"));
// Admin workspace
const AdminDashboard = lazy(() => import("./admin/pages/AdminDashboard"));
const AdminDataSources = lazy(() => import("./admin/pages/AdminDataSources"));
const AdminImport = lazy(() => import("./admin/pages/AdminImport"));
const AdminAnalytics = lazy(() => import("./admin/pages/AdminAnalytics"));
const AdminAnalyticsBasis = lazy(() => import("./admin/pages/AdminAnalyticsBasis"));
const AdminHistoryDetail = lazy(() => import("./admin/pages/AdminHistoryDetail"));
const AdminConfiguration = lazy(() => import("./admin/pages/AdminConfiguration"));
const AdminDataSourceDetail = lazy(() => import("./admin/pages/AdminDataSourceDetail"));
const AdminProfile = lazy(() => import("./admin/pages/AdminProfile"));
const AdminSettings = lazy(() => import("./admin/pages/AdminSettings"));
const AdminAbout = lazy(() => import("./admin/pages/AdminAbout"));
const AdminSystemManagement = lazy(() => import("./admin/pages/AdminSystemManagement"));
const AdminUserDetails = lazy(() => import("./admin/pages/AdminUserDetails"));
const AdminAuditLogs = lazy(() => import("./admin/pages/AdminAuditLogs"));
const AdminNotifications = lazy(() => import("./admin/pages/AdminNotifications"));
const AdminForecasting = lazy(() => import("./admin/pages/AdminForecasting"));

export function SmartRedirect({ fallback }) {
  const { user, isLoggedIn, loading } = useAuth();

  if (loading) return null;

  if (isLoggedIn) return <Navigate to={roleHome(user?.role?.role_name)} replace />;

  return fallback ?? <Navigate to="/login" replace />;
}

// Legacy /admin/analytics/basis/:resultId → canonical /admin/modules/basis/:resultId
function LegacyAnalyticsBasisRedirect() {
  const { resultId } = useParams();
  return <Navigate to={`/admin/modules/basis/${resultId}`} replace />;
}

// Legacy /admin/modules/thresholds and /admin/analytics/thresholds → canonical /admin/modules?tab=weights
function LegacyThresholdsRedirect() {
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight");
  const target = highlight
    ? `/admin/modules?tab=weights&highlight=${encodeURIComponent(highlight)}`
    : "/admin/modules?tab=weights";
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  // ── Auth & Legal pages (unprotected) ──────────────────────────────────────────
  { path: "/", element: <SmartRedirect />, errorElement: <RouteErrorElement /> },
  { path: "/login", element: <SmartRedirect fallback={<LoginPage />} />, errorElement: <RouteErrorElement /> },
  { path: "/register",   element: <RegisterPage />, errorElement: <RouteErrorElement /> },
  { path: "/forgot-password", element: <ForgotPasswordPage />, errorElement: <RouteErrorElement /> },
  { path: "/reset-password", element: <ResetPasswordPage />, errorElement: <RouteErrorElement /> },
  { path: "/onboarding", element: <OnboardingPage />, errorElement: <RouteErrorElement /> },
  { path: "/privacy",    element: <PrivacyPolicyPage />, errorElement: <RouteErrorElement /> },
  { path: "/terms",      element: <TermsPage />, errorElement: <RouteErrorElement /> },
  { path: "/about",      element: <Navigate to="/" replace />, errorElement: <RouteErrorElement /> },


  // ── Farmer workspace ─────────────────────────────────────────────────────────
  {
    path: "/farmer",
    element: <ProtectedRoute requiredRole="Farmer"><Layout /></ProtectedRoute>,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true, Component: DashboardPage },

      { path: "prices",                              Component: PricesPage },
      { path: "prices/:commodityId",               Component: CommodityDetailPage },
      { path: "prices/:commodityId/price-trend",   Component: PriceTrendDetailPage },
      { path: "prices/:commodityId/wholesale",     Component: DftcWholesaleDetailPage },

      { path: "forecast",                          Component: ForecastPage },
      { path: "forecast/:commodityId",             Component: ForecastDetailPage },
      { path: "forecast/:commodityId/wholesale",   Component: DftcWholesaleForecastPage },

      { path: "market",                      Component: RecommendationPage },
      { path: "market/weather",              Component: MarketWeatherPage },

      // Legacy market sub-pages (kept accessible but no longer linked from nav)
      {
        path: "market/legacy",
        Component: MarketLayout,
        children: [
          { index: true,                    Component: MarketOverviewPage },
          { path: "detail/:commodityId",    Component: MarketOutlookDetailPage },
          { path: "calendar",               Component: MarketCalendarPage },
        ],
      },

      // Standalone modules — outside Advisories layout, no tabs/header
      { path: "market/dftc-arrivals",       Component: DftcArrivalDetailsPage      },
      { path: "market/seasonal-production", Component: SeasonalProductionDetailsPage },

      { path: "crops",                Component: MyCropsPage },
      { path: "crops/:cropId",       Component: CropCycleDetailPage },
      { path: "crops/:cropId/arrival-pressure", Component: CropArrivalPressureDetailsPage },
      { path: "crops/:cropId/seasonal-production", Component: CropSeasonalProductionDetailsPage },
      { path: "crops/:cropId/factors", Component: CropFactorsPage },
      { path: "assess",              Component: AssessPage },
      { path: "assess/factors",      Component: FactorDetailPage },
      { path: "market/factors",      Component: FactorDetailPage },

      { path: "insights",      Component: InsightsPage },
      { path: "menu",          Component: MenuPage },
      { path: "notifications", Component: NotificationsPage },
      { path: "showcase",      Component: ShowcasePage },
      { path: "profile",       Component: FarmerProfile  },
      { path: "settings",      Component: FarmerSettings },
      { path: "activities",    Component: MyActivitiesPage },
      { path: "about",         Component: AboutPage      },
    ],
  },

  // ── DFTC workspace ────────────────────────────────────────────────────────────
  {
    path: "/dftc",
    element: <ProtectedRoute requiredRole={["DFTC"]}><DFTCLayout /></ProtectedRoute>,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true,               Component: DFTCHome         },
      { path: "input",             Component: DFTCInput        },
      { path: "input/commodity/:commodityName", Component: DFTCCommodityRecords },
      { path: "price-input",       Component: DFTCPriceInput   },
      { path: "arrival-input",     Component: DFTCArrivalInput },
      { path: "generate-report",   Component: DFTCGenerateReport },
      { path: "trends",            Component: DFTCTrends       },
      { path: "submissions",                  Component: DFTCSubmissions      },
      { path: "submissions/:submissionId",    Component: DFTCSubmissionDetail },
      { path: "upload",                        Component: DFTCUpload              },
      { path: "temporary-records",             Component: DFTCTemporaryRecords    },
      { path: "temporary-records/:recordId",   Component: DFTCTemporaryRecordDetail },
      { path: "notifications",                  Component: DFTCNotifications },
      { path: "profile",                        Component: DFTCProfile    },
      { path: "settings",                       Component: DFTCSettings   },
      { path: "about",                          Component: DFTCAbout      },
      { path: "audit-logs",                     Component: DFTCAuditLogs },
      { path: "edit-approval-requests",         Component: DFTCEditApprovalRequests },
    ],
  },

  // ── Admin workspace ───────────────────────────────────────────────────────────
  {
    path: "/admin",
    element: <ProtectedRoute requiredRole={["Admin", "SuperAdmin"]}><AdminLayout /></ProtectedRoute>,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true,             Component: AdminDashboard   },
      { path: "data-sources",             Component: AdminDataSources      },
      { path: "data-sources/:sourceId",   Component: AdminDataSourceDetail  },
      { path: "import",                   Component: AdminImport            },
      { path: "modules",                  Component: AdminAnalytics      },
      { path: "forecasting",              Component: AdminForecasting    },
      { path: "modules/basis/:resultId",  Component: AdminAnalyticsBasis },
      { path: "modules/thresholds",       element: <LegacyThresholdsRedirect /> },
      { path: "analytics",                 element: <Navigate to="/admin/modules" replace /> },
      { path: "analytics/basis/:resultId", element: <LegacyAnalyticsBasisRedirect /> },
      { path: "analytics/thresholds",      element: <LegacyThresholdsRedirect /> },
      { path: "history", element: <Navigate to="/admin/data-sources?tab=history" replace /> },
      { path: "history/:historyId",   Component: AdminHistoryDetail },
      { path: "configuration",        Component: AdminConfiguration },
      { path: "profile",              Component: AdminProfile          },
      { path: "settings",             Component: AdminSettings         },
      { path: "about",                Component: AdminAbout            },
      { path: "system",               Component: AdminSystemManagement },
      { path: "system/user/:userId", Component: AdminUserDetails      },
      { path: "audit-logs",            Component: AdminAuditLogs        },
      { path: "notifications",         Component: AdminNotifications    },
    ],
  },
]);
