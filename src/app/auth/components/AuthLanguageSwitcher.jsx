import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { usePublicAuthLanguage, AUTH_LANGUAGES } from "../usePublicAuthLanguage";

export function AuthLanguageSwitcher({ className = "" }) {
  const { authLang, setAuthLanguage, currentOption } = usePublicAuthLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] bg-[var(--hw-green-50)]/80 hover:bg-[var(--hw-green-100)] border border-[var(--hw-green-300)] rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent"
      >
        <span>{currentOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[var(--hw-green-700)] transition-transform duration-150 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 mt-1.5 w-36 bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-lg py-1 z-50 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
        >
          {AUTH_LANGUAGES.map((lang) => {
            const isSelected = lang.code === authLang;
            return (
              <li
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => {
                  setAuthLanguage(lang.code);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setAuthLanguage(lang.code);
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center justify-between px-3.5 py-2 text-[13px] cursor-pointer transition-colors focus:outline-none focus:bg-[var(--hw-green-50)] ${
                  isSelected
                    ? "font-semibold text-[var(--hw-green-800)] bg-[var(--hw-green-50)]"
                    : "text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                <span>{lang.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[var(--hw-green-700)]" aria-hidden="true" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
