import React, { useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { ArrowLeft, Globe, FileText, Shield, Info } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Clean, distraction-free document layout for legal and institutional pages.
 * Supports desktop anchor navigation, mobile single-column reading,
 * language switching, and backward navigation.
 */
export function LegalPageLayout({
  title,
  subtitle,
  version,
  effectiveDate,
  toc = [],
  children,
}) {
  const navigate = useNavigate();
  const { langCode, setLanguage, t } = useLanguage();

  // Scroll to top on route change unless hash is present
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !window.location.hash && typeof window.scrollTo === "function") {
        window.scrollTo(0, 0);
      }
    } catch {
      // Ignore in environments where scrollTo is not implemented
    }
  }, []);


  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--hw-neutral-50,#f9fafb)] text-[var(--hw-neutral-900,#111827)] flex flex-col">
      {/* Top utility bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[var(--hw-neutral-200,#e5e7eb)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-[var(--hw-neutral-700,#374151)] hover:text-black hover:bg-[var(--hw-neutral-100,#f3f4f6)] transition-colors cursor-pointer"
              aria-label={t("common.back", {}, "Back")}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t("common.back", {}, "Back")}</span>
            </button>
            <div className="h-4 w-px bg-[var(--hw-neutral-200,#e5e7eb)] hidden sm:block" />
            <Link
              to="/"
              className="font-bold text-[15px] tracking-tight text-[var(--hw-green-800,#166534)] hover:text-[var(--hw-green-900,#14532d)] transition-colors"
            >
              HarvestWise
            </Link>
          </div>

          {/* Quick links & Language Switcher */}
          <div className="flex items-center gap-2 sm:gap-4">
            <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-[var(--hw-neutral-600,#4b5563)]">
              <Link to="/privacy" className="hover:text-[var(--hw-green-700,#15803d)] transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-[var(--hw-green-700,#15803d)] transition-colors">
                Terms
              </Link>
            </nav>

            <div className="flex items-center gap-1 bg-[var(--hw-neutral-100,#f3f4f6)] p-0.5 rounded-lg border border-[var(--hw-neutral-200,#e5e7eb)]">
              <Globe className="w-3.5 h-3.5 text-[var(--hw-neutral-500,#6b7280)] ml-1.5 hidden sm:block" />
              {[
                { code: "en", label: "EN" },
                { code: "ceb", label: "CEB" },
                { code: "tl", label: "TL" },
              ].map(({ code, label }) => {
                const active = langCode === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLanguage(code)}
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      active
                        ? "bg-white text-[var(--hw-green-800,#166534)] shadow-xs"
                        : "text-[var(--hw-neutral-600,#4b5563)] hover:text-black"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Main Reading Container */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 lg:py-12 flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Table of contents sidebar on Desktop */}
        {toc && toc.length > 0 && (
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-20 bg-white p-5 rounded-2xl border border-[var(--hw-neutral-200,#e5e7eb)] shadow-xs">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--hw-neutral-500,#6b7280)] mb-3">
                Contents
              </p>
              <nav className="space-y-1.5 max-h-[calc(100vh-10rem)] overflow-y-auto text-xs">
                {toc.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block py-1 px-2 rounded text-[var(--hw-neutral-700,#374151)] hover:text-[var(--hw-green-800,#166534)] hover:bg-[var(--hw-neutral-50,#f9fafb)] transition-colors truncate"
                    title={item.title}
                  >
                    {item.title}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Content Document */}
        <article className="flex-1 min-w-0 max-w-3xl bg-white p-6 sm:p-10 lg:p-12 rounded-2xl sm:rounded-3xl border border-[var(--hw-neutral-200,#e5e7eb)] shadow-xs">
          {/* Document Header */}
          <header className="border-b border-[var(--hw-neutral-200,#e5e7eb)] pb-6 mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--hw-neutral-900,#111827)] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-base text-[var(--hw-neutral-600,#4b5563)]">
                {subtitle}
              </p>
            )}

            {(effectiveDate || version) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--hw-neutral-500,#6b7280)] font-medium">
                {effectiveDate && <span>Effective Date: {effectiveDate}</span>}
                {effectiveDate && version && <span>•</span>}
                {version && <span>Version {version}</span>}
              </div>
            )}
          </header>

          {/* Body Content */}
          <div className="space-y-8 text-[15px] sm:text-[16px] text-[var(--hw-neutral-800,#1f2937)] leading-relaxed">
            {children}
          </div>
        </article>
      </div>

      {/* Institutional Legal Footer */}
      <footer className="mt-auto border-t border-[var(--hw-neutral-200,#e5e7eb)] bg-white py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--hw-neutral-500,#6b7280)]">
          <div>
            <p className="font-semibold text-[var(--hw-neutral-700,#374151)]">
              HarvestWise
            </p>
            <p className="mt-0.5">
              Bachelor of Science in Information Technology Capstone Project · University of Mindanao
            </p>
          </div>
          <div className="flex items-center gap-3 font-medium text-[var(--hw-neutral-600,#4b5563)] text-[11px]">
            <Link to="/privacy" className="hover:text-[var(--hw-green-700,#15803d)] transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-[var(--hw-green-700,#15803d)] transition-colors">
              Terms & Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
