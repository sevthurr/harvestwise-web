import React from "react";
import { LegalPageLayout } from "../components/legal/LegalPageLayout";
import { TermsContent } from "../components/legal/TermsContent";
import { useLanguage } from "../contexts/LanguageContext";

export default function TermsPage() {
  const { t } = useLanguage();

  const toc = [
    { id: "sec-1", title: t("legal.terms.sections.s1.title", {}, "1. Purpose of HarvestWise") },
    { id: "sec-2", title: t("legal.terms.sections.s2.title", {}, "2. Eligible Users & Accounts") },
    { id: "sec-3", title: t("legal.terms.sections.s3.title", {}, "3. Account Security") },
    { id: "sec-4", title: t("legal.terms.sections.s4.title", {}, "4. Acceptable Use") },
    { id: "sec-5", title: t("legal.terms.sections.s5.title", {}, "5. User-Provided Data") },
    { id: "sec-6", title: t("legal.terms.sections.s6.title", {}, "6. Decision-Support Disclaimer") },
    { id: "sec-7", title: t("legal.terms.sections.s7.title", {}, "7. Price Forecast Disclaimer") },
    { id: "sec-8", title: t("legal.terms.sections.s8.title", {}, "8. Weather Disclaimer") },
    { id: "sec-9", title: t("legal.terms.sections.s9.title", {}, "9. Profitability Disclaimer") },
    { id: "sec-10", title: t("legal.terms.sections.s10.title", {}, "10. Market & Production Data") },
    { id: "sec-11", title: t("legal.terms.sections.s11.title", {}, "11. External Services") },
    { id: "sec-12", title: t("legal.terms.sections.s12.title", {}, "12. Online & Offline Availability") },
    { id: "sec-13", title: t("legal.terms.sections.s13.title", {}, "13. Privacy") },
    { id: "sec-14", title: t("legal.terms.sections.s14.title", {}, "14. Account Restriction") },
    { id: "sec-15", title: t("legal.terms.sections.s15.title", {}, "15. Account Deletion") },
    { id: "sec-16", title: t("legal.terms.sections.s16.title", {}, "16. Intellectual Property") },
    { id: "sec-17", title: t("legal.terms.sections.s17.title", {}, "17. Service Changes") },
    { id: "sec-18", title: t("legal.terms.sections.s18.title", {}, "18. No Warranty of Outcome") },
    { id: "sec-19", title: t("legal.terms.sections.s19.title", {}, "19. Governing Law") },
    { id: "sec-20", title: t("legal.terms.sections.s20.title", {}, "20. Changes to Terms") },
    { id: "sec-21", title: t("legal.terms.sections.s21.title", {}, "21. Contact") },
  ];

  return (
    <LegalPageLayout
      title={t("legal.terms.title", {}, "Terms and Conditions")}
      effectiveDate={t("legal.terms.effective_date", {}, "October 9, 2026")}
      version={t("legal.terms.version", {}, "1.0")}
      toc={toc}
    >
      <TermsContent />
    </LegalPageLayout>
  );
}
