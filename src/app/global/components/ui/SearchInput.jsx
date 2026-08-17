import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
const SearchInput = React.forwardRef(
  ({ onClear, onFilterClick, showFilter = false, value, className = "", ...props }, ref) => {
    return <div className={`relative ${className}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)]">
          <Search className="w-5 h-5" />
        </div>
        <input
      ref={ref}
      type="text"
      value={value}
      className={`
            w-full px-3 py-2.5 pl-10 min-h-[44px]
            bg-white border rounded-lg
            text-[var(--hw-neutral-900)] placeholder:text-[var(--hw-neutral-400)]
            transition-colors duration-200
            focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent
            border-[var(--hw-neutral-300)]
            ${showFilter || value ? "pr-20" : "pr-10"}
          `}
      {...props}
    />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && <button
      onClick={onClear}
      className="p-1.5 rounded hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] transition-colors"
    >
              <X className="w-4 h-4" />
            </button>}
          {showFilter && <button
      onClick={onFilterClick}
      className="p-1.5 rounded hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-700)] transition-colors"
    >
              <SlidersHorizontal className="w-4 h-4" />
            </button>}
        </div>
      </div>;
  }
);
SearchInput.displayName = "SearchInput";
export {
  SearchInput
};
