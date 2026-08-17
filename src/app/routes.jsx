import React from "react";
import { createBrowserRouter } from "react-router";
import { Layout } from "./global/components/layout/Layout";
import { AdminLayout } from "./global/components/layout/AdminLayout";
import { ProtectedRoute } from "./global/components/ProtectedRoute";
import LoginPage from "./auth/LoginPage";
import RegisterPage from "./auth/RegisterPage";
import OnboardingPage from "./auth/OnboardingPage";
import DashboardPage from "./farmer/pages/Dashboard";
import PricesPage from "./farmer/pages/Prices";
import CommodityDetailPage from "./farmer/pages/CommodityDetail";
import DftcWholesaleDetailPage from "./farmer/pages/DftcWholesaleDetail";
import ForecastPage from "./farmer/pages/Forecast";
import ForecastDetailPage from "./farmer/pages/ForecastDetail";
import DftcWholesaleForecastPage from "./farmer/pages/DftcWholesaleForecast";
import AssessPage from "./farmer/pages/Assess";
import RecommendationPage from "./farmer/pages/Recommendation";
import {
  MarketLayout,
  MarketOverviewPage,
} from "./farmer/pages/MarketPage";
import MarketWeatherPage from "./farmer/pages/MarketWeather";
import MarketCalendarPage from "./farmer/pages/MarketCalendar";
import MarketOutlookDetailPage from "./farmer/pages/MarketOutlookDetail";
import DftcArrivalDetailsPage from "./farmer/pages/DftcArrivalDetails";
import SeasonalProductionDetailsPage from "./farmer/pages/SeasonalProductionDetails";
import MyCropsPage from "./farmer/pages/MyCrops";
import CropCycleDetailPage from "./farmer/pages/CropCycleDetail";
import PriceTrendDetailPage from "./farmer/pages/PriceTrendDetail";
import CropFactorsPage from "./farmer/pages/CropFactorsPage";
import FactorDetailPage from "./farmer/pages/FactorDetailPage";
import InsightsPage from "./farmer/pages/Insights";
import MenuPage from "./farmer/pages/Menu";
import NotificationsPage from "./farmer/pages/Notifications";
import ShowcasePage from "./farmer/pages/Showcase";
import FarmerProfile from "./farmer/pages/FarmerProfile";
import FarmerSettings from "./farmer/pages/FarmerSettings";
import AboutPage from "./farmer/pages/About";
// DFTC workspace
import { DFTCLayout }       from "./global/components/layout/DFTCLayout";
import DFTCHome             from "./dftc/pages/DFTCHome";
import DFTCInput            from "./dftc/pages/DFTCInput";
import DFTCTrends           from "./dftc/pages/DFTCTrends";
import DFTCSubmissions      from "./dftc/pages/DFTCSubmissions";
import DFTCPriceInput       from "./dftc/pages/DFTCPriceInput";
import DFTCArrivalInput     from "./dftc/pages/DFTCArrivalInput";
import DFTCUpload              from "./dftc/pages/DFTCUpload";
import DFTCTemporaryRecords    from "./dftc/pages/DFTCTemporaryRecords";
import DFTCTemporaryRecordDetail from "./dftc/pages/DFTCTemporaryRecordDetail";
import DFTCSubmissionDetail      from "./dftc/pages/DFTCSubmissionDetail";
import DFTCCommodityRecords      from "./dftc/pages/DFTCCommodityRecords";
import DFTCProfile               from "./dftc/pages/DFTCProfile";
import DFTCSettings              from "./dftc/pages/DFTCSettings";
import DFTCAbout                 from "./dftc/pages/DFTCAbout";
// Admin workspace
import AdminDashboard from "./admin/pages/AdminDashboard";
import AdminDataSources from "./admin/pages/AdminDataSources";
import AdminImport from "./admin/pages/AdminImport";
import AdminForecasting from "./admin/pages/AdminForecasting";
import AdminAnalytics from "./admin/pages/AdminAnalytics";
import AdminAnalyticsBasis from "./admin/pages/AdminAnalyticsBasis";
import AdminAnalyticsThresholds from "./admin/pages/AdminAnalyticsThresholds";
import AdminHistory from "./admin/pages/AdminHistory";
import AdminHistoryDetail from "./admin/pages/AdminHistoryDetail";
import AdminConfiguration from "./admin/pages/AdminConfiguration";
import AdminDataSourceDetail from "./admin/pages/AdminDataSourceDetail";
import AdminProfile from "./admin/pages/AdminProfile";
import AdminSettings from "./admin/pages/AdminSettings";
import AdminAbout from "./admin/pages/AdminAbout";
import AdminSystemManagement from "./admin/pages/AdminSystemManagement";
import AdminUserDetails from "./admin/pages/AdminUserDetails";

export const router = createBrowserRouter([
  // ── Auth pages (unprotected) ──────────────────────────────────────────────────
  { path: "/", element: <LoginPage /> }, // Default to login page
  { path: "/login",      element: <LoginPage /> },
  { path: "/register",   element: <RegisterPage /> },
  { path: "/onboarding", element: <OnboardingPage /> },

  // ── Farmer workspace ─────────────────────────────────────────────────────────
  {
    path: "/farmer",
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
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
      { path: "about",         Component: AboutPage      },
    ],
  },

  // ── DFTC workspace ────────────────────────────────────────────────────────────
  {
    path: "/dftc",
    element: <ProtectedRoute><DFTCLayout /></ProtectedRoute>,
    children: [
      { index: true,               Component: DFTCHome         },
      { path: "input",             Component: DFTCInput        },
      { path: "input/commodity/:commodityName", Component: DFTCCommodityRecords },
      { path: "price-input",       Component: DFTCPriceInput   },
      { path: "arrival-input",     Component: DFTCArrivalInput },
      { path: "trends",            Component: DFTCTrends       },
      { path: "submissions",                  Component: DFTCSubmissions      },
      { path: "submissions/:submissionId",    Component: DFTCSubmissionDetail },
      { path: "upload",                        Component: DFTCUpload              },
      { path: "temporary-records",             Component: DFTCTemporaryRecords    },
      { path: "temporary-records/:recordId",   Component: DFTCTemporaryRecordDetail },
      { path: "profile",                        Component: DFTCProfile    },
      { path: "settings",                       Component: DFTCSettings   },
      { path: "about",                          Component: DFTCAbout      },
    ],
  },

  // ── Admin workspace ───────────────────────────────────────────────────────────
  {
    path: "/admin",
    element: <ProtectedRoute><AdminLayout /></ProtectedRoute>,
    children: [
      { index: true,             Component: AdminDashboard   },
      { path: "data-sources",             Component: AdminDataSources      },
      { path: "data-sources/:sourceId",   Component: AdminDataSourceDetail  },
      { path: "import",                   Component: AdminImport            },
      { path: "forecasting",     Component: AdminForecasting  },
      { path: "analytics",                Component: AdminAnalytics      },
      { path: "analytics/basis/:resultId", Component: AdminAnalyticsBasis },
      { path: "analytics/thresholds",      Component: AdminAnalyticsThresholds },
      { path: "history",              Component: AdminHistory       },
      { path: "history/:historyId",   Component: AdminHistoryDetail },
      { path: "configuration",        Component: AdminConfiguration },
      { path: "profile",              Component: AdminProfile          },
      { path: "settings",             Component: AdminSettings         },
      { path: "about",                Component: AdminAbout            },
      { path: "system",               Component: AdminSystemManagement },
      { path: "system/user/:userId", Component: AdminUserDetails      },
    ],
  },
]);
