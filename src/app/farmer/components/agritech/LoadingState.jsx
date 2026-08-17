import { Loader2 } from "lucide-react";
const LoadingState = ({
  message = "Loading...",
  size = "md"
}) => {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16"
  };
  return <div className="flex flex-col items-center justify-center py-12 px-4">
      <Loader2 className={`${sizeClasses[size]} text-[var(--hw-green-700)] animate-spin mb-4`} />
      <p className="text-sm text-[var(--hw-neutral-900)]">{message}</p>
    </div>;
};
const SkeletonCard = () => <div className="bg-white border border-[var(--hw-neutral-200)] rounded-lg p-4 space-y-3 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="h-4 bg-[var(--hw-neutral-200)] rounded w-1/3" />
      <div className="h-4 w-4 bg-[var(--hw-neutral-200)] rounded" />
    </div>
    <div className="space-y-2">
      <div className="h-8 bg-[var(--hw-neutral-200)] rounded w-1/2" />
      <div className="h-3 bg-[var(--hw-neutral-200)] rounded w-2/3" />
    </div>
    <div className="flex items-center gap-2">
      <div className="h-3 bg-[var(--hw-neutral-200)] rounded w-16" />
      <div className="h-3 bg-[var(--hw-neutral-200)] rounded w-20" />
    </div>
  </div>;
export {
  LoadingState,
  SkeletonCard
};
