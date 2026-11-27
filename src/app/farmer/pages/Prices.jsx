import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { refetchOnMountIfOnline } from "../../global/lib/queryClient";
import {
  RefreshCw,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  X,
  SlidersHorizontal,
  Check,
  AlertCircle
} from "lucide-react";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";
import { MarketEmptyState } from "../components/market/MarketStates";
import { apiGet, parseResponse } from "../../global/api";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { SkeletonPriceGrid } from "../components/shared/FarmerSkeletons";
import {
  fetchFarmerProfile,
  fetchSupportedPricesList,
} from "../../global/hooks/useFarmerPrefetch";
import { getPreferredCropMatcher, sortWithPreferredFirst, isPreferredCrop } from "../utils/cropPreferences";
import { PreferredStar } from "../components/shared/PreferredStar";
import { getCategoryFor } from "../../global/data/commodities";
import * as pricesApi from "../../../services/api/pricesApi";

const MOVEMENT_CFG = {
  Rising: { color: "text-emerald-700", Icon: TrendingUp, key: "farmer.prices.trend_rising", label: "Rising" },
  Falling: { color: "text-red-700", Icon: TrendingDown, key: "farmer.prices.trend_falling", label: "Falling" },
  Stable: { color: "text-[var(--hw-neutral-600)]", Icon: Minus, key: "farmer.prices.trend_stable", label: "Stable" },
  "Insufficient Data": { color: "text-[var(--hw-neutral-500)]", Icon: Minus, key: "farmer.prices.trend_insufficient", label: "Insufficient Data" },
  default: { color: "text-[var(--hw-neutral-500)]", Icon: Minus, key: "farmer.prices.trend_insufficient", label: "Insufficient Data" }
};

const FORECAST_CFG = {
  Rising: { color: "text-emerald-700", bg: "bg-emerald-50/60" },
  Falling: { color: "text-red-700", bg: "bg-red-50/60" },
  Stable: { color: "text-blue-700", bg: "bg-blue-50/60" },
  default: { color: "text-[var(--hw-neutral-500)]", bg: "bg-[var(--hw-neutral-50)]" }
};

const VOLATILITY_REASON_I18N = {
  "Increased Supply": { ceb: "Midaghan ang Suplay", tl: "Dumami ang Suplay" },
  "Decreased Supply": { ceb: "Mimenos ang Suplay", tl: "Bumaba ang Suplay" },
  "Oversupply in Market": { ceb: "Sobra nga Suplay sa Palengke", tl: "Labis na Suplay sa Pamilihan" },
  "Limited Harvest Volume": { ceb: "Gamay nga Ani", tl: "Mababang Dami ng Ani" },
  "Crop Failure": { ceb: "Pagkadaot sa Tanom", tl: "Pagkasira ng Pananim" },
  "Increased Consumer Demand": { ceb: "Misaka ang Panginahanglan", tl: "Tumaas ang Pangangailangan" },
  "Decreased Consumer Demand": { ceb: "Miubos ang Panginahanglan", tl: "Bumaba ang Pangangailangan" },
  "Seasonal Demand Increase": { ceb: "Panahon sa Pagsaka sa Panginahanglan", tl: "Pana-panahong Pagtaas ng Pangangailangan" },
  "Seasonal Demand Decrease": { ceb: "Panahon sa Pag-ubos sa Panginahanglan", tl: "Pana-panahong Pagbaba ng Pangangailangan" },
  "Heavy Rainfall": { ceb: "Kusog nga Ulan", tl: "Malakas na Ulan" },
  "Drought": { ceb: "Ting-uga", tl: "Tagtuyot" },
  "Flooding": { ceb: "Baha", tl: "Baha" },
  "Typhoon": { ceb: "Bagyo", tl: "Bagyo" },
  "Extreme Heat": { ceb: "Grabe nga Kainit", tl: "Matinding Init" },
  "Transportation Cost Increase": { ceb: "Pagsaka sa Plete sa Paghatod", tl: "Pagtaas ng Gastos sa Transportasyon" },
  "Fuel Price Increase": { ceb: "Pagsaka sa Presyo sa Gasolina", tl: "Pagtaas ng Presyo ng Krudo" },
  "Delivery Delays": { ceb: "Kadelatar sa Paghatod", tl: "Pagkaantala ng Paghahatid" },
  "Market Access Issues": { ceb: "Kalisod sa Pag-access sa Palengke", tl: "Kahirapan sa Pag-access sa Pamilihan" },
  "Trader Buying Surge": { ceb: "Kalit nga Pagpamalit sa mga Komprador", tl: "Biglaang Pamimili ng mga Komprador" },
  "Import Competition": { ceb: "Kompetisyon sa Import", tl: "Kompetisyon mula sa Import" },
  "Export Demand Increase": { ceb: "Pagsaka sa Demand sa Export", tl: "Pagtaas ng Demand sa Export" },
  "Competition from Alternative Products": { ceb: "Kompetisyon sa Alternatibong Produkto", tl: "Kompetisyon mula sa Ibang Produkto" },
  "Government Intervention": { ceb: "Interbensyon sa Gobyerno", tl: "Interbensyon ng Gobyerno" },
  "Pest Infestation": { ceb: "Peste sa Tanom", tl: "Peste sa Pananim" },
  "Disease Outbreak": { ceb: "Sakit sa Tanom", tl: "Sakit sa Pananim" },
  "Delayed Harvest": { ceb: "Nadelatar nga Pag-ani", tl: "Naantalang Pag-ani" },
  "Early Harvest": { ceb: "Sayo nga Pag-ani", tl: "Maagang Pag-ani" },
  "Other": { ceb: "Uban pa", tl: "Iba pa" },
};

export function buildVolatilityAdvisory({
  rawReason,
  rawCategory,
  notes,
  movement,
  currentLang = "en",
  t = (_k, _p, fallback) => fallback,
}) {
  const reason = (rawReason || "").trim();
  const category = (rawCategory || "").trim();
  const notesText = (notes || "").trim();

  if (!reason) return null;
  const lowerReason = reason.toLowerCase();
  const lowerCategory = category.toLowerCase();
  if (
    lowerReason === "other" ||
    lowerReason === "others" ||
    lowerCategory === "other" ||
    lowerCategory === "others"
  ) {
    return null;
  }

  let translatedReason = reason;
  if (VOLATILITY_REASON_I18N[reason]?.[currentLang]) {
    translatedReason = VOLATILITY_REASON_I18N[reason][currentLang];
  }

  const reasonText = notesText ? `${translatedReason} (${notesText})` : translatedReason;

  const isRising = movement === "Rising";
  const isFalling = movement === "Falling";

  let message = "";
  if (isRising) {
    message = t(
      "farmer.commodityDetail.volatility_reason_rise",
      { reason: reasonText },
      `Reason for sudden price increase: ${reasonText}`
    );
  } else if (isFalling) {
    message = t(
      "farmer.commodityDetail.volatility_reason_drop",
      { reason: reasonText },
      `Reason for sudden price drop: ${reasonText}`
    );
  } else {
    message = t(
      "farmer.commodityDetail.volatility_reason_change",
      { reason: reasonText },
      `Reason for sudden price change: ${reasonText}`
    );
  }

  const Icon = isRising ? TrendingUp : isFalling ? TrendingDown : AlertCircle;
  const color = isRising ? "text-emerald-700" : isFalling ? "text-red-700" : "text-amber-800";
  const bg = isRising ? "bg-emerald-50/60" : isFalling ? "bg-red-50/60" : "bg-amber-50/60";

  return { message, Icon, color, bg };
}

export function buildHistoricalMovementAdvisory({
  movement,
  diff,
  prevPrice,
  unit = "kg",
  market = "Bankerohan Retail",
  t = (_k, _p, fallback) => fallback,
}) {
  const resolvedMarket = market || t("farmer.prices.trend_series_label", {}, "Bankerohan Retail");
  const isRising = movement === "Rising";
  const isFalling = movement === "Falling";
  const isStable = movement === "Stable";

  const absDiff = diff != null ? Math.abs(diff) : null;
  const formattedDiff = absDiff != null ? (Number.isInteger(absDiff) ? String(absDiff) : absDiff.toFixed(2)) : null;
  const formattedPrev = prevPrice != null ? (Number.isInteger(Number(prevPrice)) ? String(Number(prevPrice)) : Number(prevPrice).toFixed(2)) : null;

  let message = "";
  if (isRising) {
    if (formattedDiff && formattedPrev) {
      message = t(
        "farmer.prices.hist_rising",
        { diff: formattedDiff, prev: formattedPrev, unit, market: resolvedMarket },
        `Price increased by ₱${formattedDiff}/${unit} from previous price of ₱${formattedPrev}/${unit} on ${resolvedMarket}.`
      );
    } else if (formattedDiff) {
      message = t(
        "farmer.prices.hist_rising_prevonly",
        { diff: formattedDiff, unit, market: resolvedMarket },
        `Price increased by ₱${formattedDiff}/${unit} from previous record on ${resolvedMarket}.`
      );
    } else {
      message = t(
        "farmer.prices.hist_rising_nodiff",
        { market: resolvedMarket },
        `Price is higher than the previous record on ${resolvedMarket}.`
      );
    }
  } else if (isFalling) {
    if (formattedDiff && formattedPrev) {
      message = t(
        "farmer.prices.hist_falling",
        { diff: formattedDiff, prev: formattedPrev, unit, market: resolvedMarket },
        `Price decreased by ₱${formattedDiff}/${unit} from previous price of ₱${formattedPrev}/${unit} on ${resolvedMarket}.`
      );
    } else if (formattedDiff) {
      message = t(
        "farmer.prices.hist_falling_prevonly",
        { diff: formattedDiff, unit, market: resolvedMarket },
        `Price decreased by ₱${formattedDiff}/${unit} from previous record on ${resolvedMarket}.`
      );
    } else {
      message = t(
        "farmer.prices.hist_falling_nodiff",
        { market: resolvedMarket },
        `Price is lower than the previous record on ${resolvedMarket}.`
      );
    }
  } else if (isStable) {
    if (formattedPrev) {
      message = t(
        "farmer.prices.hist_stable",
        { prev: formattedPrev, unit, market: resolvedMarket },
        `Price unchanged from previous price of ₱${formattedPrev}/${unit} on ${resolvedMarket}.`
      );
    } else {
      message = t(
        "farmer.prices.hist_stable_nodiff",
        { market: resolvedMarket },
        `Price is unchanged from the previous record on ${resolvedMarket}.`
      );
    }
  } else {
    message = t(
      "farmer.prices.hist_insufficient",
      { market: resolvedMarket },
      `No previous price record available for comparison on ${resolvedMarket}.`
    );
  }

  const Icon = isRising ? TrendingUp : isFalling ? TrendingDown : Minus;
  const color = isRising ? "text-emerald-700" : isFalling ? "text-red-700" : isStable ? "text-[var(--hw-neutral-600)]" : "text-[var(--hw-neutral-500)]";
  const bg = isRising ? "bg-emerald-50/60" : isFalling ? "bg-red-50/60" : isStable ? "bg-[var(--hw-neutral-100)]" : "bg-[var(--hw-neutral-50)]";

  return { message, Icon, color, bg };
}

export function calculateMovementFromRecords(recentRecords) {
  if (!recentRecords || recentRecords.length < 2) {
    return { movement: "Insufficient Data", diff: null, prevPrice: null };
  }
  const currentPrice = Number(recentRecords[0]?.prevail_price ?? recentRecords[0]?.prevailPrice);
  const prevPrice = Number(recentRecords[1]?.prevail_price ?? recentRecords[1]?.prevailPrice);
  if (isNaN(currentPrice) || isNaN(prevPrice)) {
    return { movement: "Insufficient Data", diff: null, prevPrice: null };
  }
  const diff = Math.round((currentPrice - prevPrice) * 100) / 100;
  if (diff > 0) return { movement: "Rising", diff, prevPrice };
  if (diff < 0) return { movement: "Falling", diff, prevPrice };
  return { movement: "Stable", diff: 0, prevPrice };
}

export function getHistoricalMovement(commodity, trendDetail) {
  const detailMovement = trendDetail?.historical_movement ?? trendDetail?.historicalMovement;
  if (detailMovement) return detailMovement;

  const cardMovement = commodity?.historicalMovement ?? commodity?.historical_movement;
  if (cardMovement) return cardMovement;

  const records = trendDetail?.recent_records || trendDetail?.recentRecords;
  if (records && records.length > 0) {
    return calculateMovementFromRecords(records).movement;
  }

  return "Insufficient Data";
}

export function getForecastDirection(trendDetail, fallbackForecast) {
  const forecast = trendDetail?.forecast || fallbackForecast;
  if (!forecast || !forecast.trend) return null;
  // The list endpoint already provides the lightweight trend classification.
  // Use it for basic cards and filters without requiring chart-grade history.
  if (!trendDetail) return forecast.trend;

  const forecastPrice = forecast.forecast_midpoint != null
    ? Number(forecast.forecast_midpoint)
    : (forecast.forecastMidpoint != null ? Number(forecast.forecastMidpoint) : null);
  const records = trendDetail?.recent_records || trendDetail?.recentRecords || [];
  const hasForecast = records.length > 0 && forecastPrice != null;
  return hasForecast ? forecast.trend : null;
}

// Alias for backwards compatibility
export const getDirectionFromData = getForecastDirection;


const DEFAULT_FILTER = { direction: "All", sortBy: "name", category: "All" };

const PricesFilterDrawer = ({ open, filter, onClose, onApply, categories }) => {
  const { t } = useLanguage();
  const [draft, setDraft] = useState(filter);
  React.useEffect(() => {
    if (open) setDraft(filter);
  }, [open, filter]);
  if (!open) return null;

  const chip = (active) =>
    `px-3.5 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${active
      ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
      : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
    }`;

  const categoryLabelMap = {
    "Highland Vegetables": t("farmer.prices.category_highland", {}, "Highland Vegetables"),
    "Lowland Vegetables": t("farmer.prices.category_lowland", {}, "Lowland Vegetables"),
    "Spices": t("farmer.prices.category_spices", {}, "Spices"),
  };

  const sortOptions = [
    ["name", t("farmer.prices.sort_name", {}, "Commodity name (A–Z)")],
    ["price-low", t("farmer.prices.sort_price_low", {}, "Lowest price first")],
    ["price-high", t("farmer.prices.sort_price_high", {}, "Highest price first")]
  ];

  const directionOptions = [
    ["All", t("common.filter_all", {}, "All")],
    ["Rising", t("farmer.prices.trend_rising", {}, "Rising")],
    ["Stable", t("farmer.prices.trend_stable", {}, "Stable")],
    ["Falling", t("farmer.prices.trend_falling", {}, "Falling")]
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-[70] md:inset-y-0 md:right-0 md:left-auto md:w-80 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[88vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)] flex-shrink-0">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{t("farmer.prices.filter_and_sort", {}, "Filter & Sort")}</p>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

          {/* Sort by */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.sort_by", {}, "Sort by")}</p>
            <div className="flex flex-col gap-2">
              {sortOptions.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sortBy: v }))}
                  className={`w-full py-2.5 px-4 rounded-full text-[13px] font-medium border transition-colors text-center ${draft.sortBy === v
                      ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white"
                      : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Price direction */}
          <div>
            <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.direction_label", {}, "Price direction")}</p>
            <div className="flex flex-wrap gap-2">
              {directionOptions.map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, direction: v }))}
                  className={chip(draft.direction === v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-[var(--hw-neutral-900)] mb-2">{t("farmer.prices.category_label", {}, "Category")}</p>
              <div className="flex flex-wrap gap-2">
                {["All", ...categories].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, category: v }))}
                    className={chip(draft.category === v)}
                  >
                    {v === "All" ? t("common.filter_all", {}, "All") : (categoryLabelMap[v] || v)}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="px-5 py-4 border-t border-[var(--hw-neutral-200)] flex gap-3 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_FILTER);
              onApply(DEFAULT_FILTER);
            }}
            className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            {t("farmer.prices.clear", {}, t("common.clear", {}, "Clear"))}
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 py-2.5 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-[var(--shadow-xs)]"
            aria-label="Save filter"
          >
            <Check className="w-4 h-4" />{t("farmer.prices.save", {}, t("common.save", {}, "Save"))}
          </button>
        </div>
      </div>
    </>
  );
};

const CropPriceCard = ({ commodity, data, onViewDetails, isPreferred = false }) => {
  const { t } = useLanguage();
  const unit = commodity.unitOfMeasure || 'kg';
  const movement = data.movement ?? getHistoricalMovement(commodity, data.trendDetail);

  // Extract difference and previous price
  let diff = null;
  let prevPrice = null;

  const records = data.trendDetail?.recent_records || data.trendDetail?.recentRecords;
  if (records && records.length >= 2) {
    const calc = calculateMovementFromRecords(records);
    diff = calc.diff;
    prevPrice = calc.prevPrice;
  } else {
    diff = data.trendDetail?.price_difference ?? data.trendDetail?.priceDifference ?? commodity.priceDifference ?? null;
    prevPrice = data.trendDetail?.previous_price ?? data.trendDetail?.previousPrice ?? commodity.previousPrice ?? null;
  }

  const histAdv = buildHistoricalMovementAdvisory({
    movement,
    diff,
    prevPrice,
    unit,
    market: t("farmer.prices.trend_series_label", {}, "Bankerohan Retail"),
    t,
  });

  const moveCfg = MOVEMENT_CFG[movement] || MOVEMENT_CFG.default;
  const MoveIcon = moveCfg.Icon;

  const bannerText = histAdv.message;
  const bannerColor = histAdv.color;
  const bannerBg = histAdv.bg;
  const BannerIcon = histAdv.Icon;

  const formatPriceValue = (value) => {
    if (value === null || value === undefined || value === '') return `-/${unit}`;
    const clean = typeof value === 'string' ? value.replace(/^₱+/, '') : value;
    return `₱${clean}/${unit}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3">
      {/* Header: icon + name + historical movement indicator */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CommodityIllustration
            commodityId={commodity.id}
            baseName={commodity.baseName}
            commodityName={commodity.name}
            className="w-10 h-10 flex-shrink-0"
          />
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-[var(--hw-neutral-900)] text-base truncate">{commodity.name || '–'}</p>
            {isPreferred && (
              <PreferredStar className="w-4 h-4 text-amber-500" />
            )}
          </div>
        </div>
        <div className={`flex items-center gap-1 flex-shrink-0 ${data.trendLoading ? 'text-[var(--hw-neutral-500)]' : moveCfg.color}`}>
          <MoveIcon className="w-3.5 h-3.5" />
          <span className="text-[13px] font-medium">
            {data.trendLoading
              ? t("farmer.prices.trend_loading", {}, "Loading trend")
              : t(moveCfg.key, {}, moveCfg.label)}
          </span>
        </div>
      </div>

      {/* 4-Tier Market Price Grid */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 my-1">
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            BANGKEROHAN RETAIL
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.bangkerohanRetail)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            DFTC RETAIL
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.dftcRetail)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            BANGKEROHAN WHOLESALE
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.bangkerohanWholesale)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wider">
            DFTC WHOLESALE
          </p>
          <p className="text-[15px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {formatPriceValue(data.dftcWholesale)}
          </p>
        </div>
      </div>

      {/* Outlook summary / Volatility Reason */}
      <div className={`rounded-xl px-3.5 py-2.5 ${bannerBg}`}>
        <p className={`text-[13px] font-medium leading-snug flex items-center gap-1.5 ${bannerColor}`}>
          {BannerIcon && <BannerIcon className="w-3.5 h-3.5 flex-shrink-0" />}
          <span>{data.trendLoading ? t("farmer.prices.trend_loading", {}, "Loading trend") : bannerText}</span>
        </p>
      </div>

      {/* Action footer */}
      <div className="flex items-center justify-end pt-0.5">
        <button
          type="button"
          onClick={() => onViewDetails(commodity.id)}
          className="inline-flex items-center gap-0.5 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors cursor-pointer"
        >
          {t("common.see_details", {}, "View details")}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

function PricesPage() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data: profileData } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 5,
  });

  const preferredCrops = useMemo(() => {
    return profileData?.preferred_crops || profileData?.preferredCrops || [];
  }, [profileData]);

  const preferredMatcher = useMemo(
    () => getPreferredCropMatcher(preferredCrops),
    [preferredCrops]
  );

  const { data: apiData, isLoading: pricesLoading, isError, fetchStatus } = useQuery({
    queryKey: ["prices", "supported-list"],
    queryFn: fetchSupportedPricesList,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: true,
    refetchOnMount: refetchOnMountIfOnline(true),
  });

  const { data: dashboardPrices } = useQuery({
    queryKey: ["dashboard", "prices"],
    queryFn: () => queryClient.getQueryData(["dashboard", "prices"]),
    enabled: false,
  });

  const cachedPriceList = queryClient.getQueryData(["prices", "supported-list"]) ||
    queryClient.getQueryData(["prices", "list"]);
  const loading = pricesLoading &&
    !apiData?.items?.length &&
    !cachedPriceList?.items?.length &&
    !dashboardPrices?.length;

  const { commodities } = useMemo(() => {
    const effectiveData = apiData?.items?.length
      ? apiData
      : (
        cachedPriceList?.items?.length
          ? cachedPriceList
              : Array.isArray(dashboardPrices)
                ? { items: dashboardPrices.map((item) => ({
              commodity_id: item.id,
              name: item.name,
              base_name: item.baseName,
              is_top10: true,
              unit_of_measure: item.uom || "kg",
              prices: { bangkerohan_retail: item.price },
            })) }
            : null
      );
    if (!effectiveData) return { commodities: [] };

    const items = effectiveData.items || [];
    const baseMap = new Map();

    items.forEach(item => {
      const camelItem = toCamelCase(item);

      const rawName = camelItem.baseName || camelItem.name || '–';
      let baseName = rawName;
      if (baseName.includes(' - ')) {
        baseName = baseName.split(' - ')[0].trim();
      }
      if (baseName.includes(' (')) {
        baseName = baseName.split(' (')[0].trim();
      }
      const uom = camelItem.unitOfMeasure || 'kg';
      const cat = camelItem.category || getCategoryFor(baseName) || getCategoryFor(camelItem.name) || null;
      const itemPrices = {
        bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
        bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
        dftcRetail: camelItem.prices?.dftcRetail ?? null,
        dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
      };

      const variantItem = {
        id: camelItem.commodityId,
        name: camelItem.name,
        category: cat,
        variety: camelItem.variety,
        unitOfMeasure: uom,
        displayData: itemPrices,
      };

      const itemVolReason = camelItem.volatilityReason || camelItem.volatility_reason || null;
      const itemVolCat = camelItem.volatilityCategory || camelItem.volatility_category || null;
      const itemVolNotes = camelItem.volatilityNotes || camelItem.volatility_notes || null;

      if (!baseMap.has(baseName)) {
        baseMap.set(baseName, {
          id: camelItem.commodityId,
          name: baseName,
          baseName: baseName,
          category: cat,
          unitOfMeasure: uom,
          isTop10: true,
          displayData: { ...itemPrices },
          variants: [variantItem],
          forecast: camelItem.forecast || null,
          historicalMovement: camelItem.historicalMovement || camelItem.historical_movement || "Insufficient Data",
          priceDifference: camelItem.priceDifference ?? camelItem.price_difference ?? null,
          previousPrice: camelItem.previousPrice ?? camelItem.previous_price ?? null,
          volatilityReason: itemVolReason,
          volatilityCategory: itemVolCat,
          volatilityNotes: itemVolNotes,
        });
      } else {
        const existing = baseMap.get(baseName);
        existing.variants.push(variantItem);

        if (!existing.volatilityReason && itemVolReason) {
          existing.volatilityReason = itemVolReason;
          existing.volatilityCategory = itemVolCat;
          existing.volatilityNotes = itemVolNotes;
        }

        if (!existing.category && cat) {
          existing.category = cat;
        }

        const candidateMovement = camelItem.historicalMovement || camelItem.historical_movement;
        if ((!existing.historicalMovement || existing.historicalMovement === "Insufficient Data") && candidateMovement && candidateMovement !== "Insufficient Data") {
          existing.historicalMovement = candidateMovement;
          existing.priceDifference = camelItem.priceDifference ?? camelItem.price_difference ?? null;
          existing.previousPrice = camelItem.previousPrice ?? camelItem.previous_price ?? null;
        }

        const existingHasPrice = [
          existing.displayData.bangkerohanRetail,
          existing.displayData.bangkerohanWholesale,
          existing.displayData.dftcRetail,
          existing.displayData.dftcWholesale
        ].some(v => v != null);

        const thisHasPrice = [
          itemPrices.bangkerohanRetail,
          itemPrices.bangkerohanWholesale,
          itemPrices.dftcRetail,
          itemPrices.dftcWholesale
        ].some(v => v != null);

        if (!existingHasPrice && thisHasPrice) {
          existing.id = camelItem.commodityId;
        }

        existing.displayData = {
          bangkerohanRetail: existing.displayData.bangkerohanRetail ?? itemPrices.bangkerohanRetail,
          bangkerohanWholesale: existing.displayData.bangkerohanWholesale ?? itemPrices.bangkerohanWholesale,
          dftcRetail: existing.displayData.dftcRetail ?? itemPrices.dftcRetail,
          dftcWholesale: existing.displayData.dftcWholesale ?? itemPrices.dftcWholesale,
        };
        if (!existing.forecast && camelItem.forecast) {
          existing.forecast = camelItem.forecast;
        }
      }
    });

    return {
      commodities: Array.from(baseMap.values()),
    };
  }, [apiData, dashboardPrices, queryClient]);

  const priceTrendQueries = useQueries({
    queries: commodities.map((commodity) => ({
      queryKey: ["farmer-price-card-trend", commodity.id, "bangkerohan_retail", 7],
      queryFn: () => pricesApi.getPriceDetail(commodity.id, {
        price_type: "bangkerohan_retail",
        horizon: 7,
        records_limit: 30,
      }),
      // Warm detailed trend data for preferred crops. Other top-10 crops fetch
      // their detail data when the farmer opens them, then autosave persists it.
      enabled: Boolean(commodity.id) && preferredMatcher.isPreferred(commodity),
      staleTime: 60 * 1000,
      refetchOnMount: refetchOnMountIfOnline(true),
    })),
  });

  const priceTrendByCommodity = useMemo(
    () => new Map(commodities.map((commodity, index) => [
      commodity.id,
      {
        trendDetail: priceTrendQueries[index]?.data,
        // Disabled detail queries have TanStack Query's initial `isPending`
        // state even though no request is running. Non-preferred cards use the
        // lightweight list summary and must not render "Loading trend" forever.
        trendLoading: preferredMatcher.isPreferred(commodity) && (
          priceTrendQueries[index]?.isPending || priceTrendQueries[index]?.isFetching
        ),
        trendError: priceTrendQueries[index]?.isError,
      },
    ])),
    [commodities, priceTrendQueries],
  );

  const activeCount = (filter.direction !== "All" ? 1 : 0)
    + (filter.sortBy !== "name" ? 1 : 0)
    + (filter.category !== "All" ? 1 : 0);

  const categories = useMemo(() => {
    const set = new Set(["Highland Vegetables", "Lowland Vegetables", "Spices"]);
    commodities.forEach((c) => { if (c.category) set.add(c.category); });
    return [...set].sort();
  }, [commodities]);

  const visible = useMemo(() => {
    let list = commodities.map(commodity => {
      const data = commodity.displayData;
      const trendInfo = priceTrendByCommodity.get(commodity.id) || {};
      const forecastDirection = getForecastDirection(trendInfo.trendDetail, commodity.forecast);
      const movement = getHistoricalMovement(commodity, trendInfo.trendDetail);

      return {
        ...commodity,
        displayData: {
          ...(data || {
            bangkerohanRetail: null,
            bangkerohanWholesale: null,
            dftcRetail: null,
            dftcWholesale: null,
          }),
          ...trendInfo,
          movement,
          direction: movement,
          forecastDirection,
        },
      };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((c) => (c.name || '').toLowerCase().includes(q));
    }

    if (filter.direction !== "All") {
      list = list.filter((c) => (c.displayData.movement || c.displayData.direction) === filter.direction);
    }

    if (filter.category !== "All") {
      list = list.filter((c) => c.category === filter.category);
    }

    const secondaryCompare = (a, b) => {
      if (filter.sortBy === "price-low" || filter.sortBy === "price-high") {
        const getPrice = (c) => {
          const d = c.displayData;
          const p = d.bangkerohanRetail ?? d.dftcRetail ?? d.bangkerohanWholesale ?? d.dftcWholesale;
          return p != null ? Number(p) : null;
        };
        const priceA = getPrice(a);
        const priceB = getPrice(b);
        if (priceA == null && priceB == null) return (a.name || '').localeCompare(b.name || '');
        if (priceA == null) return 1;
        if (priceB == null) return -1;
        if (priceA !== priceB) {
          return filter.sortBy === "price-low" ? priceA - priceB : priceB - priceA;
        }
        return (a.name || '').localeCompare(b.name || '');
      }
      return (a.name || '').localeCompare(b.name || '');
    };

    // Price sorting is global; preferred-crop ordering must not override it.
    if (filter.sortBy === "price-low" || filter.sortBy === "price-high") {
      return [...list].sort(secondaryCompare);
    }

    return sortWithPreferredFirst(list, preferredCrops, secondaryCompare);
  }, [searchQuery, filter, commodities, priceTrendByCommodity, preferredCrops]);

  const sortLabelMap = {
    "name": t("farmer.prices.sort_name", {}, "Commodity name (A–Z)"),
    "price-low": t("farmer.prices.sort_price_low", {}, "Lowest price first"),
    "price-high": t("farmer.prices.sort_price_high", {}, "Highest price first"),
  };

  const directionLabelMap = {
    "Rising": t("farmer.prices.trend_rising", {}, "Rising"),
    "Falling": t("farmer.prices.trend_falling", {}, "Falling"),
    "Stable": t("farmer.prices.trend_stable", {}, "Stable"),
  };

  const categoryLabelMap = {
    "Highland Vegetables": t("farmer.prices.category_highland", {}, "Highland Vegetables"),
    "Lowland Vegetables": t("farmer.prices.category_lowland", {}, "Lowland Vegetables"),
    "Spices": t("farmer.prices.category_spices", {}, "Spices"),
  };

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)] leading-tight">
            {t("nav.prices", {}, "Prices")}
          </h1>
          <p className="text-[15px] text-[var(--hw-neutral-900)] mt-0.5">
            {t("farmer.prices.subtitle", {}, "Check today's price and likely price movement.")}
          </p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-700)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            disabled={loading}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("farmer.prices.search_placeholder", {}, "Search commodity…")}
            className="w-full pl-9 pr-9 py-2.5 text-[15px] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] focus:ring-1 focus:ring-[var(--hw-green-600)] transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-800)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="Open filter drawer"
          onClick={() => setFilterOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)] transition-colors text-[14px] font-medium shadow-[var(--shadow-xs)] flex-shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t("common.filter", {}, "Filter")}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[var(--hw-green-700)] text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Active filter tags */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className="text-[12px] font-medium text-[var(--hw-neutral-500)]">
            {t("farmer.prices.active_filters", {}, "Active filters:")}
          </span>
          {filter.sortBy !== "name" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
              {sortLabelMap[filter.sortBy] || filter.sortBy}
              <button
                type="button"
                onClick={() => setFilter((f) => ({ ...f, sortBy: "name" }))}
                className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                aria-label="Remove sort filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filter.direction !== "All" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
              {directionLabelMap[filter.direction] || filter.direction}
              <button
                type="button"
                onClick={() => setFilter((f) => ({ ...f, direction: "All" }))}
                className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                aria-label="Remove direction filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filter.category !== "All" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium bg-[var(--hw-green-50)] text-[var(--hw-green-800)] border border-[var(--hw-green-200)]">
              {categoryLabelMap[filter.category] || filter.category}
              <button
                type="button"
                onClick={() => setFilter((f) => ({ ...f, category: "All" }))}
                className="hover:opacity-75 p-0.5 text-[var(--hw-green-800)]"
                aria-label="Remove category filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setFilter(DEFAULT_FILTER)}
            className="text-[12px] font-medium text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-800)] underline ml-1 cursor-pointer"
          >
            {t("farmer.prices.clear_all", {}, "Clear all")}
          </button>
        </div>
      )}

      {/* Cards grid */}
      {loading && visible.length === 0 ? (
        <SkeletonPriceGrid count={6} />
      ) : visible.length === 0 ? (
        searchQuery.trim() ? (
          <MarketEmptyState query={searchQuery} />
        ) : activeCount > 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
              <SlidersHorizontal className="w-8 h-8 text-[var(--hw-neutral-400)]" />
            </div>
            <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">
              {t("farmer.emptyStates.no_filter_matches", {}, "No commodities match the selected filter")}
            </p>
            <p className="text-sm text-[var(--hw-neutral-500)] mb-4">
              {t("farmer.emptyStates.try_clearing_filters", {}, "Try adjusting or clearing your filters to see more results.")}
            </p>
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FILTER)}
              className="px-4 py-2 rounded-xl bg-[var(--hw-green-700)] text-white text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors cursor-pointer"
            >
              {t("farmer.prices.clear_filters", {}, "Clear filters")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-[var(--hw-neutral-400)]" />
            </div>
            <p className="text-lg font-medium text-[var(--hw-neutral-900)] mb-1">
              {t("farmer.emptyStates.no_prices", {}, "No price data available")}
            </p>
            <p className="text-sm text-[var(--hw-neutral-700)]">
              {t("farmer.emptyStates.no_prices_desc", {}, "Price data for top 10 commodities will appear here")}
            </p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
          {visible.map((c) => (
            <CropPriceCard
              key={c.id}
              commodity={c}
              data={c.displayData}
              isPreferred={isPreferredCrop(c, preferredCrops)}
              onViewDetails={() => navigate(`/farmer/prices/${c.id}`)}
            />
          ))}
        </div>
      )}
      <PricesFilterDrawer
        open={filterOpen}
        filter={filter}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => {
          setFilter(f);
          setFilterOpen(false);
        }}
        categories={categories}
      />
    </div>
  );
}

export {
  PricesPage as default
};
