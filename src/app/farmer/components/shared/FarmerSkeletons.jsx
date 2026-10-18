import React from "react";
import { cn } from "../../../global/components/ui/utils";

/**
 * Base skeleton element with pulse animation.
 */
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("bg-[var(--hw-neutral-200)] animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

/**
 * Skeleton for standard card containers.
 */
export function SkeletonCard({ className, children }) {
  return (
    <div className={cn("bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 animate-pulse", className)}>
      {children || (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/4 rounded" />
            </div>
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for list item rows (e.g. Dashboard Today's prices, crop reminders).
 */
export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <Skeleton className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-2.5 w-16 rounded" />
        <Skeleton className="h-2.5 w-20 rounded" />
      </div>
      <Skeleton className="h-4 w-16 rounded-full" />
    </div>
  );
}

/**
 * Grid of commodity price cards loading skeleton (for Prices & Forecast pages).
 */
export function SkeletonPriceGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-3 animate-pulse"
        >
          {/* Header */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
            <Skeleton className="h-4 w-28 flex-1 rounded" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
          {/* Price primary block */}
          <div className="space-y-1 my-1">
            <Skeleton className="h-2.5 w-24 rounded" />
            <Skeleton className="h-5 w-20 rounded" />
          </div>
          {/* Outlook card */}
          <div className="rounded-xl bg-[var(--hw-neutral-50)] p-3 space-y-1.5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-3 w-44 rounded" />
          </div>
          {/* Action button */}
          <div className="flex justify-end pt-1">
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for detailed factor cards / single detail page.
 */
export function SkeletonDetailHeader() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-1/3 rounded" />
          <Skeleton className="h-3.5 w-1/4 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Profile & Settings forms.
 */
export function SkeletonFormCard() {
  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-4 animate-pulse">
      <Skeleton className="h-4 w-36 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-24 rounded" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}
