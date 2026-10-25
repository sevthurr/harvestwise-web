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
  sub,
  labelColor = "text-[var(--hw-neutral-800)]",
  valueColor = "text-[var(--hw-neutral-900)]",
  onClick,
  active = false,
  loading = false,
  className = ""
}) {
  const Component = onClick && !loading ? "button" : "div";
  const displayValue = value !== undefined && value !== null && value !== "" && value !== "—" ? value : 0;
  const isRatio = typeof displayValue === "string" && displayValue.includes("/");
  const isText = typeof displayValue === "string" && isNaN(Number(displayValue)) && !isRatio;
  const textSize = isText
    ? "text-[17px] xs:text-[20px] sm:text-[24px]"
    : isRatio
    ? "text-[20px] xs:text-[22px] sm:text-[26px]"
    : "text-[24px] xs:text-[28px] sm:text-[32px]";

  return (
    <Component
      onClick={!loading ? onClick : undefined}
      className={`bg-white rounded-2xl border shadow-[var(--shadow-xs)] p-3 sm:p-4 text-left flex flex-col justify-between min-h-[80px] sm:min-h-[96px] transition-all ${
        onClick && !loading ? "hover:bg-[var(--hw-neutral-50)] cursor-pointer active:scale-[0.99]" : ""
      } ${
        active
          ? "border-[var(--hw-green-500)] ring-1 ring-[var(--hw-green-500)]"
          : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)]"
      } ${className}`}
    >
      <div className="mb-1.5 sm:mb-2">
        <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wide sm:tracking-wider leading-tight ${labelColor}`}>
          {label}
        </span>
      </div>
      <div className="flex items-end justify-end mt-auto min-w-0">
        {loading ? (
          <div className="h-8 w-14 bg-[var(--hw-neutral-200)] animate-pulse rounded-md ml-auto" />
        ) : (
          <div className="text-right min-w-0 max-w-full">
            <p
              className={`${textSize} font-bold ${valueColor} leading-none text-right truncate`}
              title={typeof displayValue === "string" ? displayValue : undefined}
            >
              {displayValue}
            </p>
            {sub && (
              <p className="text-[11px] font-medium text-[var(--hw-neutral-500)] mt-1.5 leading-tight truncate">
                {sub}
              </p>
            )}
          </div>
        )}
      </div>
    </Component>
  );
}

export default DFTCKpiCard;
