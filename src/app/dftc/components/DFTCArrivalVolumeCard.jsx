import React, { useEffect, useMemo, useState } from "react";
import { Truck, ArrowRight } from "lucide-react";

const ARRIVAL_PAGE_SIZE = 6;

/**
 * DFTC home "Latest Arrival Volume" card.
 * Shows the combined volume for the latest reporting period and a per-commodity
 * breakdown with client-side pagination.
 */
export function DFTCArrivalVolumeCard({ loadingHome, latestArrivalVolume, onViewTrends }) {
  const [page, setPage] = useState(1);

  const items = useMemo(() => {
    if (!latestArrivalVolume) return [];
    const raw =
      latestArrivalVolume.commodities && latestArrivalVolume.commodities.length > 0
        ? latestArrivalVolume.commodities
        : latestArrivalVolume.provenance || [];
    return raw.map((p) => ({
      id: p.commodity_id || p.origin_province || p.commodity_name,
      name: p.commodity_name || p.origin_province,
      volumeKg: Number(p.volume_kg ?? 0).toLocaleString()
    }));
  }, [latestArrivalVolume]);

  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / ARRIVAL_PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages);
  const pageItems = items.slice(
    (clampedPage - 1) * ARRIVAL_PAGE_SIZE,
    clampedPage * ARRIVAL_PAGE_SIZE
  );

  const header = (
    <div className="flex items-center justify-between mb-4">
      <p className="font-semibold text-[var(--hw-neutral-900)]">Latest Arrival Volume</p>
      <Truck className="w-4 h-4 text-[var(--hw-neutral-400)]" />
    </div>
  );

  if (loadingHome) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        {header}
        <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">Loading…</div>
      </div>
    );
  }

  if (!latestArrivalVolume || (latestArrivalVolume.combined_volume_kg || 0) <= 0) {
    return (
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
        {header}
        <div className="py-6 text-center text-[var(--hw-neutral-500)] text-[13px]">
          No arrival volume records available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
      {header}
      <div className="space-y-3">
        <div>
          <p className="text-[12px] text-[var(--hw-neutral-800)]">
            Reporting Period {latestArrivalVolume.reporting_period || "\u2014"}
          </p>
          <p className="text-[22px] font-bold text-[var(--hw-neutral-900)] mt-0.5">
            {Number(latestArrivalVolume.combined_volume_kg).toLocaleString()}{" "}
            <span className="text-[13px] font-medium text-[var(--hw-neutral-800)]">kg</span>
          </p>
        </div>
        <div className="space-y-1.5">
          {pageItems.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-[13px]">
              <span className="text-[var(--hw-neutral-800)]">{p.name}</span>
              <span className="font-medium text-[var(--hw-neutral-900)]">{p.volumeKg} kg</span>
            </div>
          ))}
        </div>
      </div>
      {items.length > ARRIVAL_PAGE_SIZE && (
        <div className="flex items-center justify-between gap-3 pt-4">
          <span className="text-[12px] text-[var(--hw-neutral-600)]">
            Showing {(clampedPage - 1) * ARRIVAL_PAGE_SIZE + 1}–
            {Math.min(clampedPage * ARRIVAL_PAGE_SIZE, items.length)} of {items.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={clampedPage === 1}
              className="px-2.5 py-1.5 text-[12px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={clampedPage === totalPages}
              className="px-2.5 py-1.5 text-[12px] rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
      <button
        onClick={onViewTrends}
        className="mt-4 flex items-center gap-1 text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
      >
        View Arrival Volume Trends <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default DFTCArrivalVolumeCard;