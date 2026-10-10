import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function LegalModal({
  title,
  effectiveDate = "October 9, 2026",
  version = "1.0",
  onClose,
  children,
}) {
  const { langCode, setLanguage } = useLanguage();
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-[2px] animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={modalRef}
        className="w-full max-w-3xl sm:max-w-4xl max-h-[85vh] bg-white rounded-xl border border-[var(--hw-neutral-200,#e5e7eb)] shadow-[0_12px_36px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden text-[12px]"
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--hw-neutral-100,#f3f4f6)] bg-[var(--hw-neutral-50,#f9fafb)] flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h2 className="text-[14px] font-bold text-black truncate">
              {title}
            </h2>
            <p className="text-[10px] text-[var(--hw-neutral-500,#6b7280)] leading-none mt-0.5">
              Effective: {effectiveDate} · Version {version}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Minimal language toggle */}
            <div className="inline-flex items-center p-0.5 rounded border border-[var(--hw-neutral-200,#e5e7eb)] bg-white text-[10px]">
              {["en", "ceb", "tl"].map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLanguage(code)}
                  className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                    langCode === code
                      ? "bg-[var(--hw-green-700,#15803d)] text-white"
                      : "text-[var(--hw-neutral-600,#4b5563)] hover:text-black"
                  }`}
                >
                  {code.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded text-[var(--hw-neutral-400,#9ca3af)] hover:text-black hover:bg-[var(--hw-neutral-200,#e5e7eb)] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Minimal Full-Text Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 leading-relaxed text-[var(--hw-neutral-800,#1f2937)] text-[12px]">
          {children}
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-end px-4 py-2 border-t border-[var(--hw-neutral-100,#f3f4f6)] bg-[var(--hw-neutral-50,#f9fafb)] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 text-[11px] font-medium text-[var(--hw-neutral-700,#374151)] bg-white border border-[var(--hw-neutral-200,#e5e7eb)] hover:bg-[var(--hw-neutral-100,#f3f4f6)] rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LegalModal;
