import React from "react";

/**
 * DFTCKpiCard
 * 
 * Standardized KPI card for DFTC interfaces matching HarvestWise design:
 * - Uppercase label on top-left (no circular dot)
 * - Large numerical value on the right
 * - Skeleton loading state matching the Farmer interface
 * - Defaults empty value to "0" instead of "-"
 */
export function DFTCKpiCard({
  label,
  value,
  labelColor = "text-[var(--hw-neutral-800)]",
  valueColor = "text-[var(--hw-neutral-900)]",
  onClick,
  active = false,
  loading = false,
  className = ""
}) {
  const Component = onClick && !loading ? "button" : "div";
  const displayValue = value !== undefined && value !== null && value !== "" && value !== "—" ? value : 0;

  return (
    <Component
      onClick={!loading ? onClick : undefined}
      className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-4 text-left flex flex-col justify-between min-h-[92px] transition-all ${
        onClick && !loading ? "hover:bg-[var(--hw-neutral-50)] cursor-pointer active:scale-[0.99]" : ""
      } ${
        active
          ? "border-[var(--hw-green-500)] ring-1 ring-[var(--hw-green-500)]"
          : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)]"
      } ${className}`}
    >
      <div className="mb-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className="flex items-end justify-end mt-auto">
        {loading ? (
          <div className="h-8 w-14 bg-[var(--hw-neutral-200)] animate-pulse rounded-md ml-auto" />
        ) : (
          <p className={`text-[28px] sm:text-[32px] font-bold ${valueColor} leading-none text-right`}>
            {displayValue}
          </p>
        )}
      </div>
    </Component>
  );
}

export default DFTCKpiCard;
