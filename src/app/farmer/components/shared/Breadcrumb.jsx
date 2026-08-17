import React from "react";
import { ChevronRight } from "lucide-react";
const Breadcrumb = ({ items }) => <nav className="flex items-center flex-wrap gap-1 text-[13px]">
    {items.map((item, i) => {
  const isLast = i === items.length - 1;
  return <React.Fragment key={i}>
          {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-[var(--hw-neutral-400)] flex-shrink-0" />}
          {isLast ? <span className="font-semibold text-[var(--hw-neutral-900)]">{item.label}</span> : <button
    onClick={item.onClick}
    className="font-normal text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
              {item.label}
            </button>}
        </React.Fragment>;
})}
  </nav>;
export {
  Breadcrumb
};
