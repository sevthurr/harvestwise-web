import React from "react";
import { Mail, MapPin } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * Shared canonical About content component.
 * Ensures farmer, dftc, and admin views share
 * the exact same verified institutional and technical copy.
 */
export function CanonicalAboutContent() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6 text-[15px] leading-relaxed text-[var(--hw-neutral-800,#1f2937)]">
      {/* Intro */}
      <div className="space-y-3">
        <p>{t("about.intro_p1")}</p>
        <p>{t("about.intro_p2")}</p>
      </div>

      {/* Purpose */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.purpose.title")}
        </h3>
        <p className="mb-2">{t("about.sections.purpose.p1")}</p>
        <p>{t("about.sections.purpose.p2")}</p>
      </div>

      {/* What HarvestWise Provides */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.provides.title")}
        </h3>
        <p className="mb-3">{t("about.sections.provides.p1")}</p>
        <p className="font-semibold text-xs uppercase tracking-wider text-[var(--hw-neutral-600,#4b5563)] mb-2">
          {t("about.sections.provides.factors_intro")}
        </p>
        <ol className="list-decimal list-inside space-y-1 text-sm bg-[var(--hw-neutral-50,#f9fafb)] p-3.5 rounded-xl border border-[var(--hw-neutral-200,#e5e7eb)] font-medium">
          <li>{t("about.sections.provides.factor_1").replace(/^1\.\s*/, "")}</li>
          <li>{t("about.sections.provides.factor_2").replace(/^2\.\s*/, "")}</li>
          <li>{t("about.sections.provides.factor_3").replace(/^3\.\s*/, "")}</li>
          <li>{t("about.sections.provides.factor_4").replace(/^4\.\s*/, "")}</li>
          <li>{t("about.sections.provides.factor_5").replace(/^5\.\s*/, "")}</li>
        </ol>
        <p className="mt-3 mb-2">{t("about.sections.provides.p2")}</p>
        <p>{t("about.sections.provides.p3")}</p>
      </div>

      {/* Price and Market Information */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.price_market.title")}
        </h3>
        <p className="mb-2">{t("about.sections.price_market.p1")}</p>
        <p className="mb-2">{t("about.sections.price_market.p2")}</p>
        <p>{t("about.sections.price_market.p3")}</p>
      </div>

      {/* Weather Information */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.weather.title")}
        </h3>
        <p className="mb-2">{t("about.sections.weather.p1")}</p>
        <p className="mb-2">{t("about.sections.weather.p2")}</p>
        <p className="mb-2">{t("about.sections.weather.p3")}</p>
        <p>{t("about.sections.weather.p4")}</p>
      </div>

      {/* Current Crop Scope */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.crops.title")}
        </h3>
        <p className="mb-2">{t("about.sections.crops.p1")}</p>
        <p className="font-medium p-3 bg-[var(--hw-neutral-50,#f9fafb)] rounded-xl border border-[var(--hw-neutral-200,#e5e7eb)] text-sm">
          {t("about.sections.crops.list")}
        </p>
        <p className="mt-2">{t("about.sections.crops.p2")}</p>
      </div>

      {/* Technology and Data */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.tech_data.title")}
        </h3>
        <p className="mb-2">{t("about.sections.tech_data.p1")}</p>
        <p className="mb-2 font-medium">{t("about.sections.tech_data.p2")}</p>
        <p>{t("about.sections.tech_data.p3")}</p>
      </div>

      {/* Important Limitations */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.limitations.title")}
        </h3>
        <p className="mb-2">{t("about.sections.limitations.p1")}</p>
        <p className="mb-2">{t("about.sections.limitations.p2")}</p>
        <p className="mb-2 font-medium">{t("about.sections.limitations.p3")}</p>
        <p>{t("about.sections.limitations.p4")}</p>
      </div>

      {/* Academic Project */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.academic.title")}
        </h3>
        <p className="mb-2">{t("about.sections.academic.p1")}</p>
        <p className="mb-2">{t("about.sections.academic.p2")}</p>
        <p className="text-xs text-[var(--hw-neutral-600,#4b5563)]">{t("about.sections.academic.p3")}</p>
      </div>

      {/* Contact info box */}
      <div className="pt-4 border-t border-[var(--hw-neutral-200,#e5e7eb)]">
        <h3 className="text-base font-bold text-[var(--hw-neutral-900,#111827)] mb-2">
          {t("about.sections.contact.title")}
        </h3>
        <p className="mb-3 text-sm">{t("about.sections.contact.intro")}</p>
        <div className="bg-[var(--hw-neutral-50,#f9fafb)] p-4 rounded-xl border border-[var(--hw-neutral-200,#e5e7eb)] space-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[var(--hw-green-700,#15803d)] flex-shrink-0" />
            <a href="mailto:harvestwise.app@gmail.com" className="font-semibold text-[var(--hw-green-800,#166534)] hover:underline">
              harvestwise.app@gmail.com
            </a>
          </div>
          <div className="flex items-start gap-2 pt-1 text-[var(--hw-neutral-700,#374151)]">
            <MapPin className="w-4 h-4 text-[var(--hw-green-700,#15803d)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[var(--hw-neutral-900,#111827)]">University of Mindanao (UM) Matina Campus</p>
              <p>University of Mindanao Drive, Matina Pangi Road, Matina Crossing</p>
              <p>Davao City, 8000 Davao del Sur, Philippines</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
