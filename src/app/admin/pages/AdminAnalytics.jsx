import { PageHeader } from "../../global/components/shared/PageHeader";
import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, Info, X } from "lucide-react";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { getVariants } from "../../global/data/commodities";
import { apiGet, parseResponse } from "../../global/api";
import {
  RESULTS,
  MODULES,
  CLASSIFICATIONS,
  CLASSIFICATION_COLORS
} from "../components/analytics/adminAnalyticsMockData";

const DEFAULT_ROWS = 8;

const CommodityDropdown = ({ value, options = [], onChange, placeholder = "Select commodity", showAllOption = false }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (!options || options.length === 0) {
    return (
      <div className="px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl text-[var(--hw-neutral-500)] min-w-[148px]">
        No analytics commodities available.
      </div>
    );
  }

  const selectedName = typeof value === "object" ? value?.name : value;
  const isAll = selectedName === "All";
  const iconKey = !isAll ? getCommodityIconKey(null, null, selectedName) : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:border-[var(--hw-neutral-300)] transition-colors cursor-pointer min-w-[148px]"
      >
        {iconKey && <CommodityIllustration commodityId={iconKey} className="w-5 h-5 flex-shrink-0" />}
        <span className="flex-1 text-left text-[var(--hw-neutral-800)]">
          {isAll ? "All commodities" : (selectedName || placeholder)}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg overflow-hidden min-w-full max-h-60 overflow-y-auto">
          {showAllOption && (
            <button
              onClick={() => {
                onChange("All");
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                ${isAll ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
            >
              <span>All commodities</span>
            </button>
          )}
          {options.map((opt) => {
            const optName = typeof opt === "object" ? opt.name : opt;
            if (optName === "All") return null;
            const optIcon = typeof opt === "object" && opt.iconKey ? opt.iconKey : getCommodityIconKey(opt?.id, opt?.baseName, optName);
            const isSelected = optName === selectedName;

            return (
              <button
                key={optName}
                onClick={() => {
                  onChange(optName);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[var(--hw-neutral-50)] transition-colors text-left
                  ${isSelected ? "bg-[var(--hw-green-50)] text-[var(--hw-green-700)] font-medium" : "text-[var(--hw-neutral-800)]"}`}
              >
                <CommodityIllustration commodityId={optIcon} className="w-5 h-5 flex-shrink-0" />
                <span>{optName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

function AdminAnalytics() {
  const navigate = useNavigate();
  const [commodities, setCommodities] = useState([]);
  const [loadingCommodities, setLoadingCommodities] = useState(true);

  // Scoped analytics selection
  const [scopedCommodity, setScopedCommodity] = useState("");
  const [scopedVariety, setScopedVariety] = useState("");

  // History table filters
  const [fCommodity, setFCommodity] = useState("All");
  const [fVariety, setFVariety] = useState("All");
  const [fModule, setFModule] = useState("All");
  const [fClassification, setFClassification] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  // Fetch commodities from database
  useEffect(() => {
    let active = true;
    async function loadCommodities() {
      try {
        setLoadingCommodities(true);
        const res = await apiGet("/farmer/commodities");
        if (res.ok && active) {
          const data = await parseResponse(res);
          const rawList = Array.isArray(data) ? data : data?.items || [];
          const top10 = rawList
            .filter((c) => (c.isTop10 ?? c.is_top10 ?? true) && (c.isActive ?? c.is_active ?? true))
            .map((c) => {
              const name = c.name || c.baseName || c.base_name;
              return {
                id: c.id,
                name,
                iconKey: getCommodityIconKey(c.id, c.baseName || c.base_name, name)
              };
            });
          setCommodities(top10);
          if (top10.length > 0) {
            setScopedCommodity(top10[0].name);
          }
        }
      } catch (err) {
        console.warn("Failed to load commodities for analytics:", err);
      } finally {
        if (active) setLoadingCommodities(false);
      }
    }
    loadCommodities();
    return () => {
      active = false;
    };
  }, []);

  // Scoped varieties
  const scopedVariants = useMemo(() => {
    if (!scopedCommodity) return [];
    return getVariants(scopedCommodity);
  }, [scopedCommodity]);

  useEffect(() => {
    if (scopedVariants.length > 0) {
      setScopedVariety(scopedVariants[0]);
    } else {
      setScopedVariety("Standard");
    }
  }, [scopedCommodity, scopedVariants]);

  // History filter varieties
  const historyVariants = useMemo(() => {
    if (!fCommodity || fCommodity === "All") return [];
    return getVariants(fCommodity);
  }, [fCommodity]);

  useEffect(() => {
    setFVariety("All");
  }, [fCommodity]);

  useEffect(() => {
    if (!showTooltip) return;
    const h = (e) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target)) setShowTooltip(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showTooltip]);

  const selectCls = "px-3 py-2 text-[13px] bg-white border border-[var(--hw-neutral-200)] rounded-xl outline-none focus:border-[var(--hw-green-600)] transition cursor-pointer";

  // Filter processed results
  const filteredResults = RESULTS.filter((r) => {
    const matchComm = fCommodity === "All" || r.commodity === fCommodity;
    const matchVar = fVariety === "All" || r.variant === fVariety || (!r.variant && fVariety === "Standard");
    const matchMod = fModule === "All" || r.module === fModule;
    const matchClass = fClassification === "All" || r.classification === fClassification;
    return matchComm && matchVar && matchMod && matchClass;
  });

  const visibleResults = showAll ? filteredResults : filteredResults.slice(0, DEFAULT_ROWS);

  // 4 Module definitions for current variety outputs
  const moduleCards = [
    { module: "Price Outlook", classification: "Not processed", source: "-", processed: "-", basisId: "" },
    { module: "Arrival Pressure", classification: "Not processed", source: "-", processed: "-", basisId: "" },
    { module: "Historical Seasonal Production Level", classification: "Not processed", source: "-", processed: "-", basisId: "" },
    { module: "Weather Risk", classification: "Not processed", source: "-", processed: "-", basisId: "" }
  ];

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <PageHeader
        title="Analytics Processing"
        description="Review processed module outputs and advisory rules used by HarvestWise."
        action={<p className="text-[12px] text-[var(--hw-neutral-700)] whitespace-nowrap hidden sm:block">Last updated: -</p>}
      />

      {/* Scoped Variety Selector & Current Analytics Outputs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]">
          <div>
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">Current Analytics Scope</p>
            <p className="text-[16px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
              {scopedCommodity ? `${scopedCommodity} · ${scopedVariety || "Standard"}` : "Select a commodity and variety"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-[var(--hw-neutral-600)] font-medium px-1">Commodity</label>
              <CommodityDropdown
                value={scopedCommodity}
                options={commodities}
                onChange={setScopedCommodity}
                placeholder="Select Commodity"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[11px] text-[var(--hw-neutral-600)] font-medium px-1">Variety</label>
              <select
                value={scopedVariety}
                onChange={(e) => setScopedVariety(e.target.value)}
                disabled={!scopedCommodity || scopedVariants.length === 0}
                className={`${selectCls} min-w-[140px] disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {scopedVariants.length === 0 ? (
                  <option value="Standard">Standard</option>
                ) : (
                  scopedVariants.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Module Output Cards */}
        <div>
          <h2 className="text-[14px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide mb-3">
            Current Analytics Outputs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {moduleCards.map((card) => {
              const cc = CLASSIFICATION_COLORS[card.classification] ?? "text-[var(--hw-neutral-500)]";
              return (
                <div
                  key={card.module}
                  onClick={() => card.basisId && navigate(`/admin/analytics/basis/${card.basisId}`)}
                  className={`bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3 transition-colors ${
                    card.basisId ? "hover:bg-[var(--hw-neutral-50)] hover:border-[var(--hw-neutral-300)] cursor-pointer" : ""
                  }`}
                >
                  <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] leading-snug">{card.module}</p>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] text-[var(--hw-neutral-700)]">Classification</span>
                      <span className={`text-[12px] font-semibold ${cc}`}>{card.classification}</span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] text-[var(--hw-neutral-700)]">Source</span>
                      <span className="text-[12px] text-[var(--hw-neutral-800)] text-right max-w-[120px] leading-tight truncate">
                        {card.source}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] text-[var(--hw-neutral-700)]">Processed</span>
                      <span className="text-[12px] text-[var(--hw-neutral-800)]">{card.processed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Processed Results History Table */}
      <div className="space-y-4 pt-2">
        {/* Heading + tooltip */}
        <div ref={tooltipRef} className="relative flex items-center gap-2">
          <h2 className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">Processed Results</h2>
          <button
            onClick={() => setShowTooltip((v) => !v)}
            className="text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-800)] transition-colors"
          >
            <Info className="w-4 h-4" />
          </button>
          {showTooltip && (
            <div className="absolute top-full left-0 mt-2 z-20 w-[320px] bg-white border border-[var(--hw-neutral-200)] rounded-xl shadow-lg p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[12px] text-[var(--hw-neutral-800)] leading-relaxed">
                  This table shows processed outputs for Price Outlook, Arrival Pressure, Historical Seasonal Production Level, and Weather Risk. Profitability is calculated during individual farmer assessment because it depends on farmer-specific cost, yield, and selling-price inputs.
                </p>
                <button
                  onClick={() => setShowTooltip(false)}
                  className="text-[var(--hw-neutral-600)] hover:text-[var(--hw-neutral-800)] flex-shrink-0 mt-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Commodity Filter */}
          <CommodityDropdown
            value={fCommodity}
            options={commodities}
            onChange={(v) => {
              setFCommodity(v);
              setShowAll(false);
            }}
            placeholder="All commodities"
            showAllOption
          />

          {/* Variety Filter */}
          <select
            value={fVariety}
            onChange={(e) => {
              setFVariety(e.target.value);
              setShowAll(false);
            }}
            disabled={fCommodity === "All" || historyVariants.length === 0}
            className={`${selectCls} min-w-[130px] disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <option value="All">All varieties</option>
            {historyVariants.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          {/* Module Filter */}
          <select
            value={fModule}
            onChange={(e) => {
              setFModule(e.target.value);
              setShowAll(false);
            }}
            className={selectCls}
          >
            {MODULES.map((m) => (
              <option key={m} value={m}>
                {m === "All" ? "All modules" : m}
              </option>
            ))}
          </select>

          {/* Classification Filter */}
          <select
            value={fClassification}
            onChange={(e) => {
              setFClassification(e.target.value);
              setShowAll(false);
            }}
            className={selectCls}
          >
            {CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All classifications" : c}
              </option>
            ))}
          </select>

          {(fCommodity !== "All" || fVariety !== "All" || fModule !== "All" || fClassification !== "All") && (
            <button
              onClick={() => {
                setFCommodity("All");
                setFVariety("All");
                setFModule("All");
                setFClassification("All");
                setShowAll(false);
              }}
              className="text-[12px] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                <tr>
                  {["Module", "Commodity", "Variety", "Input Period", "Classification", "Processed Date"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--hw-neutral-500)] text-[13px]">
                      No processed results found for the selected commodity, variety, and filters.
                    </td>
                  </tr>
                ) : (
                  visibleResults.map((r) => {
                    const cc = CLASSIFICATION_COLORS[r.classification] ?? "text-[var(--hw-neutral-700)]";
                    return (
                      <tr
                        key={r.id}
                        onClick={() => navigate(`/admin/analytics/basis/${r.id}`)}
                        className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                      >
                        <td className="px-3 py-2.5 font-medium text-[var(--hw-neutral-900)] whitespace-nowrap">{r.module}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {r.commodity && (
                              <CommodityIllustration
                                commodityId={getCommodityIconKey(null, null, r.commodity)}
                                className="w-5 h-5 flex-shrink-0"
                              />
                            )}
                            <span className="text-[var(--hw-neutral-800)]">{r.commodity || "-"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{r.variant || "Standard"}</td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.inputPeriod || "-"}</td>
                        <td className={`px-3 py-2.5 font-semibold ${cc}`}>{r.classification || "Not available"}</td>
                        <td className="px-3 py-2.5 text-[var(--hw-neutral-800)] whitespace-nowrap">{r.processedAt || "-"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {filteredResults.length > DEFAULT_ROWS && (
            <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)] flex items-center justify-between">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">
                Showing {visibleResults.length} of {filteredResults.length} results
              </p>
              <button
                onClick={() => setShowAll((v) => !v)}
                className="text-[12px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                {showAll ? "Show less" : `Show all ${filteredResults.length} results`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { AdminAnalytics as default };
