import React from "react";
import { ChevronRight, Home } from "lucide-react";
const Breadcrumb = ({
  items,
  showHome = true
}) => {
  return <nav className="hidden md:flex items-center gap-2 text-sm">
      {showHome && <>
          <button
    className="flex items-center gap-1 text-[var(--hw-neutral-500)] hover:text-[var(--hw-green-700)] transition-colors"
  >
            <Home className="w-4 h-4" />
          </button>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)]" />
        </>}
      
      {items.map((item, index) => {
    const isLast = index === items.length - 1;
    return <React.Fragment key={index}>
            {item.onClick ? <button
      onClick={item.onClick}
      className={`
                  transition-colors
                  ${isLast ? "text-[var(--hw-neutral-900)] font-medium" : "text-[var(--hw-neutral-500)] hover:text-[var(--hw-green-700)]"}
                `}
    >
                {item.label}
              </button> : <span
      className={`
                  ${isLast ? "text-[var(--hw-neutral-900)] font-medium" : "text-[var(--hw-neutral-500)]"}
                `}
    >
                {item.label}
              </span>}
            
            {!isLast && <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)]" />}
          </React.Fragment>;
  })}
    </nav>;
};
export {
  Breadcrumb
};
