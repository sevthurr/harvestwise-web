import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Plus } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function SearchableCombobox({
  id = "searchable-combobox",
  options = [],
  value = "",
  onChange,
  placeholder = "Search or select...",
  searchPlaceholder,
  allowCustom = true,
  disabled = false,
  emptyMessage,
  onKeyDown,
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [normalizedOptions, searchQuery]);

  const hasExactMatch = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.some((opt) => opt.label.toLowerCase() === q);
  }, [normalizedOptions, searchQuery]);

  const handleSelect = (val) => {
    onChange(val);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setSearchQuery("");
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchQuery.trim()) {
        if (filteredOptions.length > 0 && hasExactMatch) {
          handleSelect(filteredOptions[0].value);
        } else if (allowCustom) {
          handleSelect(searchQuery.trim());
        } else if (filteredOptions.length > 0) {
          handleSelect(filteredOptions[0].value);
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-11 px-3.5 flex items-center justify-between text-[15px] bg-[var(--hw-neutral-50)] border rounded-xl transition-all text-left ${
          isOpen
            ? "border-[var(--hw-green-700)] ring-2 ring-[var(--hw-green-700)]/20 bg-white"
            : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`truncate ${
            value ? "text-[var(--hw-neutral-900)] font-medium" : "text-[var(--hw-neutral-400)]"
          }`}
        >
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClear(e);
                }
              }}
              title={t("common.clear", {}, "Clear")}
              className="p-0.5 rounded-full hover:bg-[var(--hw-neutral-200)] text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-[var(--hw-neutral-400)] transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-[var(--hw-neutral-200)] shadow-[0_10px_25px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Input Box */}
          <div className="p-2 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={searchPlaceholder || placeholder}
                className="w-full h-9 pl-8 pr-3 text-[14px] bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)]"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-[var(--hw-neutral-50)]">
            {/* Custom option when typed text doesn't exactly match */}
            {allowCustom && searchQuery.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(searchQuery.trim())}
                className="w-full px-3 py-2.5 flex items-center gap-2 text-left text-[14px] rounded-lg transition-colors bg-[var(--hw-green-50)]/60 text-[var(--hw-green-800)] hover:bg-[var(--hw-green-50)] font-medium"
              >
                <Plus className="w-4 h-4 text-[var(--hw-green-700)] flex-shrink-0" />
                <span className="truncate">
                  {t("common.use_custom", {}, "Use")} &ldquo;
                  <span className="font-semibold">{searchQuery.trim()}</span>
                  &rdquo;
                </span>
              </button>
            )}

            {filteredOptions.length === 0 && (!allowCustom || !searchQuery.trim()) ? (
              <div className="py-6 px-4 text-center text-[13px] text-[var(--hw-neutral-500)]">
                {emptyMessage ||
                  (searchQuery
                    ? t("common.no_results", {}, "No matching options found")
                    : t("common.no_items", {}, "No options available"))}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = value.toLowerCase() === opt.value.toLowerCase();
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left text-[14px] rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[var(--hw-green-50)] text-[var(--hw-green-900)] font-semibold"
                        : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-100)]"
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[var(--hw-green-700)] flex-shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
