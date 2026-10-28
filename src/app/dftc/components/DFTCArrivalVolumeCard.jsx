import React, { useMemo } from "react";
import { Truck, ArrowRight } from "lucide-react";
import { CommodityIllustration } from "../../global/components/shared/CommodityIllustrations";

import { isHWCommodity } from "../../global/data/commodities";

/**
 * DFTC home "Latest Arrival Volume" card.
 * Styled similar to Price Movement, displaying latest arrival volumes per commodity
 * with available commodity icons, scrollable list, and without overall kg or direction arrows.
 */
export function DFTCArrivalVolumeCard({
  loadingHome,
  latestArrivalVolume,
  onViewTrends,
  onSelectCommodity
}) {
  const items = useMemo(() => {
    if (!latestArrivalVolume) return [];
    const raw =
      latestArrivalVolume.commodities && latestArrivalVolume.commodities.length > 0
        ? latestArrivalVolume.commodities
        : latestArrivalVolume.provenance || [];
    const mapped = raw.map((p) => {
      const name = p.commodity_name || p.origin_province || "";
      const rawVol = Number(p.volume_kg ?? 0);
      return {
        id: p.commodity_id || p.origin_province || p.commodity_name,
        name,
        rawVolume: rawVol,
        isTop10: Boolean(isHWCommodity(name) || isHWCommodity(p.commodity_id)),
        volumeKg: rawVol.toLocaleString(undefined, {
          maximumFractionDigits: 2
        })
      };
    });

    // Put top 10 commodities first, preserving descending volume within each group
    return mapped.sort((a, b) => {
      if (a.isTop10 && !b.isTop10) return -1;
      if (!a.isTop10 && b.isTop10) return 1;
      return b.rawVolume - a.rawVolume;
    });
  }, [latestArrivalVolume]);

  const reportingPeriod = latestArrivalVolume?.reporting_period;
  const formattedReportingPeriod = useMemo(() => {
    if (!reportingPeriod) return null;
    try {
      const d = new Date(reportingPeriod);
      if (isNaN(d.getTime())) return String(reportingPeriod);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return String(reportingPeriod);
    }
  }, [reportingPeriod]);

  const header = (
    <div className="flex items-center justify-between mb-4">
      <p className="font-semibold text-[var(--hw-neutral-900)]">Latest Arrival Volume</p>
      <Truck className="w-4 h-4 text-[var(--hw-neutral-400)]" />
    </div>
  );

  if (loadingHome) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5">
        {header}
        <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">Loading…</div>
      </div>
    );
  }

  if (!latestArrivalVolume || items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5">
        {header}
        <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
          No arrival volume records available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5 sm:p-5">
      {header}
      <div className="space-y-3 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (onSelectCommodity) {
                onSelectCommodity(item.name || item.id, item.id);
              } else if (onViewTrends) {
                onViewTrends();
              }
            }}
            className="w-full flex items-center justify-between gap-3 text-left hover:bg-[var(--hw-neutral-50)] rounded-lg p-2 -m-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <CommodityIllustration
                commodityId={item.id}
                commodityName={item.name}
                className="w-8 h-8 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[var(--hw-neutral-900)] truncate">
                  {item.name}
                </p>
                <p className="text-[12px] text-[var(--hw-neutral-800)] truncate">
                  DFTC Taboan{formattedReportingPeriod ? ` · ${formattedReportingPeriod}` : ""}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">
                {item.volumeKg} kg
              </p>
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onViewTrends}
        className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
      >
        View Arrival Volume Trends <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default DFTCArrivalVolumeCard;