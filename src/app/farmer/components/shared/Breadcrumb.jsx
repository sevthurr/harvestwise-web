import React from "react";
import { ChevronRight } from "lucide-react";
const Breadcrumb = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-1 text-[13px]">
    {items.map((item, i) => {
      const isLast = i === items.length - 1;
      return (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" />}
          {isLast ? (
            <span className="font-semibold text-[var(--hw-neutral-900)]">{item.label}</span>
          ) : item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="font-normal text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] hover:underline transition-colors cursor-pointer text-left inline-flex items-center"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-normal text-[var(--hw-neutral-600)]">{item.label}</span>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);
export {
  Breadcrumb
};
