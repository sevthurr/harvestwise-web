import React from "react";
import { Info, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

/**
 * DFTCNotificationBanner
 * Unified, clean notification container following the design rule:
 * - White background (bg-white)
 * - Subtle neutral border (border border-[var(--hw-neutral-200)])
 * - Soft elevation (shadow-[var(--shadow-xs)])
 * - The ONLY element with color coding is the icon
 */
export default function DFTCNotificationBanner({
  icon: CustomIcon,
  variant = "info", // "info" | "warning" | "success" | "danger" | "neutral"
  title,
  description,
  children,
  actions,
  className = ""
}) {
  const iconConfig = {
    info: { Icon: Info, color: "text-emerald-600" },
    warning: { Icon: AlertCircle, color: "text-amber-500" },
    success: { Icon: CheckCircle2, color: "text-emerald-600" },
    danger: { Icon: XCircle, color: "text-red-500" },
    neutral: { Icon: Info, color: "text-[var(--hw-neutral-500)]" }
  };

  const currentConfig = iconConfig[variant] || iconConfig.info;
  const ResolvedIcon = CustomIcon || currentConfig.Icon;
  const iconColor = currentConfig.color;

  return (
    <div
      className={`bg-white border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] rounded-xl px-4 py-3 flex items-start sm:items-center justify-between gap-3.5 ${className}`}
      role="status"
    >
      <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
        <ResolvedIcon className={`w-4 h-4 shrink-0 mt-0.5 sm:mt-0 ${iconColor}`} />
        <div className="min-w-0 text-[12px] leading-relaxed">
          {title && (
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)] leading-snug">
              {title}
            </p>
          )}
          {description && (
            <p className={`${title ? "text-[var(--hw-neutral-600)] mt-0.5" : "text-[var(--hw-neutral-800)]"}`}>
              {description}
            </p>
          )}
          {children && (
            <div className={`${title ? "text-[var(--hw-neutral-600)] mt-0.5" : "text-[var(--hw-neutral-800)]"}`}>
              {children}
            </div>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 self-center">
          {actions}
        </div>
      )}
    </div>
  );
}
