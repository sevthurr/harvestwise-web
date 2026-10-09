import React from "react";
import { LegalPageLayout } from "../components/legal/LegalPageLayout";
import { PrivacyPolicyContent } from "../components/legal/PrivacyPolicyContent";
import { useLanguage } from "../contexts/LanguageContext";

export default function PrivacyPolicyPage() {
  const { t } = useLanguage();

  const toc = [
    { id: "sec-1", title: t("legal.privacy.sections.s1.title", {}, "1. Information We Collect") },
    { id: "sec-2", title: t("legal.privacy.sections.s2.title", {}, "2. How We Use Information") },
    { id: "sec-3", title: t("legal.privacy.sections.s3.title", {}, "3. Farm Location & Coordinates") },
    { id: "sec-4", title: t("legal.privacy.sections.s4.title", {}, "4. External Services") },
    { id: "sec-5", title: t("legal.privacy.sections.s5.title", {}, "5. Automated Decision-Support") },
    { id: "sec-6", title: t("legal.privacy.sections.s6.title", {}, "6. How Information May Be Shared") },
    { id: "sec-7", title: t("legal.privacy.sections.s7.title", {}, "7. Data Retention") },
    { id: "sec-8", title: t("legal.privacy.sections.s8.title", {}, "8. Account Deletion") },
    { id: "sec-9", title: t("legal.privacy.sections.s9.title", {}, "9. Security") },
    { id: "sec-10", title: t("legal.privacy.sections.s10.title", {}, "10. Your Privacy Rights") },
    { id: "sec-11", title: t("legal.privacy.sections.s11.title", {}, "11. Accuracy of Information") },
    { id: "sec-12", title: t("legal.privacy.sections.s12.title", {}, "12. Children and Authorized Users") },
    { id: "sec-13", title: t("legal.privacy.sections.s13.title", {}, "13. Changes to this Policy") },
    { id: "sec-14", title: t("legal.privacy.sections.s14.title", {}, "14. Contact") },
  ];

  return (
    <LegalPageLayout
      title={t("legal.privacy.title", {}, "Privacy Policy")}
      effectiveDate={t("legal.privacy.effective_date", {}, "October 9, 2026")}
      version={t("legal.privacy.version", {}, "1.0")}
      toc={toc}
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
