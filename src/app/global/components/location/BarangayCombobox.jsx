import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function BarangayCombobox({
  barangays = [],
  selectedBarangay = "",
  onSelect,
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  id = "barangay-combobox"
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

  const filteredBarangays = useMemo(() => {
    if (!searchQuery.trim()) return barangays;
    const q = searchQuery.toLowerCase().trim();
    return barangays.filter((b) => b.name.toLowerCase().includes(q));
  }, [barangays, searchQuery]);

  const handleSelect = (name) => {
    onSelect(name);
    setSearchQuery("");
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled || loading) return;
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      return next;
    });
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button / Display */}
      <button
        id={id}
        type="button"
        disabled={disabled || loading}
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-11 px-3.5 flex items-center justify-between text-[15px] bg-[var(--hw-neutral-50)] border rounded-xl transition-all text-left ${
          isOpen
            ? "border-[var(--hw-green-700)] ring-2 ring-[var(--hw-green-700)]/20 bg-white"
            : error
            ? "border-red-400 bg-red-50/20"
            : "border-[var(--hw-neutral-200)] hover:border-[var(--hw-neutral-300)]"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`truncate ${selectedBarangay ? "text-[var(--hw-neutral-900)] font-medium" : "text-[var(--hw-neutral-400)]"}`}>
          {loading
            ? t("onboarding.barangays_loading", {}, "Loading Barangays...")
            : selectedBarangay || t("onboarding.barangay_select_placeholder", {}, "Search or select a Barangay")}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
          {loading ? (
            <Loader2 className="w-4 h-4 text-[var(--hw-neutral-400)] animate-spin" />
          ) : (
            <ChevronDown className={`w-4 h-4 text-[var(--hw-neutral-400)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          )}
        </div>
      </button>

      {/* Error state below trigger */}
      {error && !isOpen && (
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-red-600">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[var(--hw-green-700)] font-semibold hover:underline flex-shrink-0"
            >
              <RefreshCw className="w-3 h-3" />
              {t("common.try_again", {}, "Try again")}
            </button>
          )}
        </div>
      )}

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
                placeholder={t("onboarding.barangay_select_placeholder", {}, "Search or select a Barangay")}
                className="w-full h-9 pl-8 pr-3 text-[14px] bg-white border border-[var(--hw-neutral-200)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)]"
              />
            </div>
          </div>

          {/* Barangay Options List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-[var(--hw-neutral-50)]">
            {filteredBarangays.length === 0 ? (
              <div className="py-6 px-4 text-center text-[13px] text-[var(--hw-neutral-500)]">
                {searchQuery
                  ? t("common.no_results", {}, "No matching barangays found")
                  : t("common.no_items", {}, "No barangays available")}
              </div>
            ) : (
              filteredBarangays.map((b) => {
                const isSelected = selectedBarangay.toLowerCase() === b.name.toLowerCase();
                return (
                  <button
                    key={b.code || b.name}
                    type="button"
                    onClick={() => handleSelect(b.name)}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left text-[14px] rounded-lg transition-colors ${
                      isSelected
                        ? "bg-[var(--hw-green-50)] text-[var(--hw-green-900)] font-semibold"
                        : "text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-100)]"
                    }`}
                  >
                    <span>{b.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-[var(--hw-green-700)] flex-shrink-0" />}
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
