import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export function PrivacyPolicyContent() {
  const { t } = useLanguage();

  const s1 = t("legal.privacy.sections.s1", {}, {});
  const s2 = t("legal.privacy.sections.s2", {}, {});
  const s4 = t("legal.privacy.sections.s4", {}, {});
  const s10 = t("legal.privacy.sections.s10", {}, {});

  return (
    <div className="space-y-4 text-[12px] leading-relaxed text-[var(--hw-neutral-800,#1f2937)]">
      {/* Introduction */}
      <div className="space-y-2">
        <p>{t("legal.privacy.intro_p1")}</p>
        <p>{t("legal.privacy.intro_p2")}</p>
        <p className="font-bold text-black">{t("legal.privacy.intro_p3")}</p>
      </div>

      {/* 1. Information We Collect */}
      <section id="sec-1" className="space-y-2 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s1.title")}
        </h2>
        <p>{t("legal.privacy.sections.s1.intro")}</p>

        <div className="space-y-2 pl-1">
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group1_title")}
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-[var(--hw-neutral-700,#374151)]">
              {(Array.isArray(s1?.group1_items) ? s1.group1_items : [
                "email address", "phone number", "password in hashed form", "name and profile details",
                "profile picture", "preferred language", "text-size preference", "account and authentication-security information"
              ]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group2_title")}
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-[var(--hw-neutral-700,#374151)]">
              {(Array.isArray(s1?.group2_items) ? s1.group2_items : [
                "first, middle, and last name and suffix, when provided", "farm size", "city", "district",
                "barangay", "purok or sitio", "street", "saved farm latitude and longitude", "usual selling area or buyer"
              ]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group3_title")}
            </p>
            <ul className="list-disc list-inside space-y-0.5 pl-2 text-[var(--hw-neutral-700,#374151)]">
              {(Array.isArray(s1?.group3_items) ? s1.group3_items : [
                "crop plans", "planned and actual planting dates", "expected harvest dates", "farm area used for a crop",
                "expected harvest quantity", "expected farmgate price", "production costs", "break-even information",
                "actual harvest date", "actual harvest quantity", "actual selling price"
              ]).map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group4_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s1.group4_desc")}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group5_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s1.group5_desc")}
            </p>
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s1.group6_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s1.group6_desc")}
            </p>
          </div>
        </div>
      </section>

      {/* 2. How We Use Information */}
      <section id="sec-2" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s2.title")}
        </h2>
        <p>{t("legal.privacy.sections.s2.intro")}</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          {(Array.isArray(s2?.items) ? s2.items : []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p className="font-bold text-black">
          {t("legal.privacy.sections.s2.conclusion")}
        </p>
      </section>

      {/* 3. Farm Location and Precise Coordinates */}
      <section id="sec-3" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s3.title")}
        </h2>
        <p>{t("legal.privacy.sections.s3.p1")}</p>
        <p>{t("legal.privacy.sections.s3.p2")}</p>
        <p>{t("legal.privacy.sections.s3.p3")}</p>
        <p>{t("legal.privacy.sections.s3.p4")}</p>
        <p>{t("legal.privacy.sections.s3.p5")}</p>
        <p className="font-bold text-black">{t("legal.privacy.sections.s3.p6")}</p>
      </section>

      {/* 4. External Services */}
      <section id="sec-4" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s4.title")}
        </h2>
        <p>{t("legal.privacy.sections.s4.intro")}</p>
        <div className="space-y-1.5 pl-1">
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s4.open_meteo_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s4.open_meteo_desc")}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s4.osm_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s4.osm_desc")}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s4.psgc_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s4.psgc_desc")}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s4.supabase_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s4.supabase_desc")}
            </p>
          </div>
          <div>
            <p className="text-[12px] font-bold uppercase text-black">
              {t("legal.privacy.sections.s4.cloudinary_title")}
            </p>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s4.cloudinary_desc")}
            </p>
          </div>
          <p className="italic text-[var(--hw-neutral-600,#4b5563)]">
            {t("legal.privacy.sections.s4.conclusion")}
          </p>
        </div>
      </section>

      {/* 5. Automated Decision-Support Processing */}
      <section id="sec-5" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s5.title")}
        </h2>
        <p>{t("legal.privacy.sections.s5.p1")}</p>
        <p>{t("legal.privacy.sections.s5.p2")}</p>
        <p>{t("legal.privacy.sections.s5.p3")}</p>
        <p>{t("legal.privacy.sections.s5.p4")}</p>
        <p className="font-bold text-black">{t("legal.privacy.sections.s5.p5")}</p>
        <p>{t("legal.privacy.sections.s5.p6")}</p>
      </section>

      {/* 6. How Information May Be Shared */}
      <section id="sec-6" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s6.title")}
        </h2>
        <p>{t("legal.privacy.sections.s6.p1")}</p>
        <p>{t("legal.privacy.sections.s6.p2")}</p>
        <p>{t("legal.privacy.sections.s6.p3")}</p>
      </section>

      {/* 7. Data Retention */}
      <section id="sec-7" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s7.title")}
        </h2>
        <p>{t("legal.privacy.sections.s7.p1")}</p>
        <p>{t("legal.privacy.sections.s7.p2")}</p>
        <p>{t("legal.privacy.sections.s7.p3")}</p>
        <p>{t("legal.privacy.sections.s7.p4")}</p>
        <p>{t("legal.privacy.sections.s7.p5")}</p>
        <p>{t("legal.privacy.sections.s7.p6")}</p>
      </section>

      {/* 8. Account Deletion */}
      <section id="sec-8" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s8.title")}
        </h2>
        <p>{t("legal.privacy.sections.s8.p1")}</p>
        <p>
          <a href="mailto:harvestwise.app@gmail.com" className="font-semibold text-[var(--hw-green-800,#166534)] hover:underline">
            {t("legal.privacy.sections.s8.email", {}, "harvestwise.app@gmail.com")}
          </a>
        </p>
        <p>{t("legal.privacy.sections.s8.p2")}</p>
        <p>{t("legal.privacy.sections.s8.p3")}</p>
        <p>{t("legal.privacy.sections.s8.p4")}</p>
        <p className="font-bold text-black">{t("legal.privacy.sections.s8.p5")}</p>
      </section>

      {/* 9. Security */}
      <section id="sec-9" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s9.title")}
        </h2>
        <p>{t("legal.privacy.sections.s9.p1")}</p>
        <p>{t("legal.privacy.sections.s9.p2")}</p>
        <p>{t("legal.privacy.sections.s9.p3")}</p>
      </section>

      {/* 10. Your Privacy Rights */}
      <section id="sec-10" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s10.title")}
        </h2>
        <p>{t("legal.privacy.sections.s10.intro")}</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          {(Array.isArray(s10?.items) ? s10.items : []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p>{t("legal.privacy.sections.s10.p1")}</p>
        <p>
          <a href="mailto:harvestwise.app@gmail.com" className="font-semibold text-[var(--hw-green-800,#166534)] hover:underline">
            {t("legal.privacy.sections.s10.email", {}, "harvestwise.app@gmail.com")}
          </a>
        </p>
      </section>

      {/* 11. Accuracy of Information */}
      <section id="sec-11" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s11.title")}
        </h2>
        <p>{t("legal.privacy.sections.s11.p1")}</p>
        <p>{t("legal.privacy.sections.s11.p2")}</p>
      </section>

      {/* 12. Children and Authorized Users */}
      <section id="sec-12" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s12.title")}
        </h2>
        <p>{t("legal.privacy.sections.s12.p1")}</p>
        <p>{t("legal.privacy.sections.s12.p2")}</p>
      </section>

      {/* 13. Changes to this Privacy Policy */}
      <section id="sec-13" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s13.title")}
        </h2>
        <p>{t("legal.privacy.sections.s13.p1")}</p>
        <p>{t("legal.privacy.sections.s13.p2")}</p>
        <p>{t("legal.privacy.sections.s13.p3")}</p>
      </section>

      {/* 14. Contact */}
      <section id="sec-14" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.privacy.sections.s14.title")}
        </h2>
        <div className="space-y-1 pl-1">
          <p>
            <strong className="text-black uppercase">{t("legal.privacy.sections.s14.contact_title", {}, "Privacy and Support Contact:")}</strong>{" "}
            <a
              href="mailto:harvestwise.app@gmail.com"
              className="text-[var(--hw-green-800,#166534)] font-medium hover:underline"
            >
              {t("legal.privacy.sections.s14.email", {}, "harvestwise.app@gmail.com")}
            </a>
          </p>
          <div>
            <strong className="text-black uppercase block">{t("legal.privacy.sections.s14.address_title", {}, "Address:")}</strong>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.privacy.sections.s14.address_line1", {}, "University of Mindanao (UM) Matina Campus")}, {t("legal.privacy.sections.s14.address_line2", {}, "University of Mindanao Drive, Matina Pangi Road, Matina Crossing")}, {t("legal.privacy.sections.s14.address_line3", {}, "Davao City, 8000 Davao del Sur, Philippines")}
            </p>
          </div>
          <p className="text-[11px] text-[var(--hw-neutral-500,#6b7280)] pt-1">
            {t("legal.privacy.sections.s14.footer_note")}
          </p>
        </div>
      </section>
    </div>
  );
}

export default PrivacyPolicyContent;
