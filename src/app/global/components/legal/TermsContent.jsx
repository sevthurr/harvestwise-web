import React from "react";
import { Link } from "react-router";
import { useLanguage } from "../../contexts/LanguageContext";

export function TermsContent() {
  const { t } = useLanguage();

  const s4 = t("legal.terms.sections.s4", {}, {});
  const s14 = t("legal.terms.sections.s14", {}, {});

  return (
    <div className="space-y-4 text-[12px] leading-relaxed text-[var(--hw-neutral-800,#1f2937)]">
      {/* Introduction */}
      <div className="space-y-2">
        <p>{t("legal.terms.intro_p1")}</p>
        <p>{t("legal.terms.intro_p2")}</p>
        <p className="font-bold text-black">{t("legal.terms.intro_p3")}</p>
        <p>{t("legal.terms.intro_p4")}</p>
      </div>

      {/* 1. Purpose */}
      <section id="sec-1" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s1.title")}
        </h2>
        <p>{t("legal.terms.sections.s1.p1")}</p>
        <p>{t("legal.terms.sections.s1.p2")}</p>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s1.p3")}
        </p>
      </section>

      {/* 2. Eligible Users and Accounts */}
      <section id="sec-2" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s2.title")}
        </h2>
        <p>{t("legal.terms.sections.s2.p1")}</p>
        <p>{t("legal.terms.sections.s2.p2")}</p>
        <p>{t("legal.terms.sections.s2.p3")}</p>
        <p>{t("legal.terms.sections.s2.p4")}</p>
      </section>

      {/* 3. Account Security */}
      <section id="sec-3" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s3.title")}
        </h2>
        <p>{t("legal.terms.sections.s3.p1")}</p>
        <p>
          {t("legal.terms.sections.s3.p2")}{" "}
          <a href="mailto:harvestwise.app@gmail.com" className="font-semibold text-[var(--hw-green-800,#166534)] hover:underline">
            {t("legal.terms.sections.s3.email", {}, "harvestwise.app@gmail.com")}
          </a>
        </p>
        <p>{t("legal.terms.sections.s3.p3")}</p>
      </section>

      {/* 4. Acceptable Use */}
      <section id="sec-4" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s4.title")}
        </h2>
        <p>{t("legal.terms.sections.s4.p1")}</p>
        <p className="font-bold text-black">{t("legal.terms.sections.s4.intro")}</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          {(Array.isArray(s4?.prohibited) ? s4.prohibited : []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      </section>

      {/* 5. User-Provided Data */}
      <section id="sec-5" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s5.title")}
        </h2>
        <p>{t("legal.terms.sections.s5.p1")}</p>
        <p>{t("legal.terms.sections.s5.p2")}</p>
        <p>{t("legal.terms.sections.s5.p3")}</p>
      </section>

      {/* 6. Agricultural Decision-Support Disclaimer */}
      <section id="sec-6" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s6.title")}
        </h2>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s6.p1")}
        </p>
        <p>{t("legal.terms.sections.s6.p2")}</p>
        <p>{t("legal.terms.sections.s6.p3")}</p>
        <p>{t("legal.terms.sections.s6.p4")}</p>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s6.p5")}
        </p>
      </section>

      {/* 7. Price Forecast Disclaimer */}
      <section id="sec-7" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s7.title")}
        </h2>
        <p>{t("legal.terms.sections.s7.p1")}</p>
        <p>{t("legal.terms.sections.s7.p2")}</p>
        <p>{t("legal.terms.sections.s7.p3")}</p>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s7.p4")}
        </p>
      </section>

      {/* 8. Weather Disclaimer */}
      <section id="sec-8" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s8.title")}
        </h2>
        <p>{t("legal.terms.sections.s8.p1")}</p>
        <p>{t("legal.terms.sections.s8.p2")}</p>
        <p>{t("legal.terms.sections.s8.p3")}</p>
        <p>{t("legal.terms.sections.s8.p4")}</p>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s8.p5")}
        </p>
      </section>

      {/* 9. Profitability and Break-Even Disclaimer */}
      <section id="sec-9" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s9.title")}
        </h2>
        <p>{t("legal.terms.sections.s9.p1")}</p>
        <p>{t("legal.terms.sections.s9.p2")}</p>
        <p className="font-bold text-black">
          {t("legal.terms.sections.s9.p3")}
        </p>
      </section>

      {/* 10. Market and Production Data */}
      <section id="sec-10" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s10.title")}
        </h2>
        <p>{t("legal.terms.sections.s10.p1")}</p>
        <p>{t("legal.terms.sections.s10.p2")}</p>
      </section>

      {/* 11. External Services */}
      <section id="sec-11" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s11.title")}
        </h2>
        <p>{t("legal.terms.sections.s11.p1")}</p>
        <p>{t("legal.terms.sections.s11.p2")}</p>
        <p>{t("legal.terms.sections.s11.p3")}</p>
      </section>

      {/* 12. Online and Offline Availability */}
      <section id="sec-12" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s12.title")}
        </h2>
        <p>{t("legal.terms.sections.s12.p1")}</p>
        <p>{t("legal.terms.sections.s12.p2")}</p>
        <p>{t("legal.terms.sections.s12.p3")}</p>
        <p>{t("legal.terms.sections.s12.p4")}</p>
      </section>

      {/* 13. Privacy */}
      <section id="sec-13" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s13.title")}
        </h2>
        <p>{t("legal.terms.sections.s13.p1")}</p>
        <p>
          {t("legal.terms.sections.s13.p2")}{" "}
          <Link to="/privacy" className="text-[var(--hw-green-800,#166534)] font-medium underline">
            /privacy
          </Link>
        </p>
        <p>{t("legal.terms.sections.s13.p3")}</p>
      </section>

      {/* 14. Account Restriction or Suspension */}
      <section id="sec-14" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s14.title")}
        </h2>
        <p>{t("legal.terms.sections.s14.intro")}</p>
        <ul className="list-disc list-inside space-y-0.5 pl-2">
          {(Array.isArray(s14?.reasons) ? s14.reasons : []).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
        <p>{t("legal.terms.sections.s14.conclusion")}</p>
      </section>

      {/* 15. Account Deletion */}
      <section id="sec-15" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s15.title")}
        </h2>
        <p>
          {t("legal.terms.sections.s15.p1")}{" "}
          <a href="mailto:harvestwise.app@gmail.com" className="font-semibold text-[var(--hw-green-800,#166534)] hover:underline">
            {t("legal.terms.sections.s15.email", {}, "harvestwise.app@gmail.com")}
          </a>
        </p>
        <p>{t("legal.terms.sections.s15.p2")}</p>
        <p>{t("legal.terms.sections.s15.p3")}</p>
      </section>

      {/* 16. Intellectual Property */}
      <section id="sec-16" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s16.title")}
        </h2>
        <p>{t("legal.terms.sections.s16.p1")}</p>
        <p>{t("legal.terms.sections.s16.p2")}</p>
        <p>{t("legal.terms.sections.s16.p3")}</p>
        <p>{t("legal.terms.sections.s16.p4")}</p>
      </section>

      {/* 17. Service Changes */}
      <section id="sec-17" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s17.title")}
        </h2>
        <p>{t("legal.terms.sections.s17.p1")}</p>
        <p>{t("legal.terms.sections.s17.p2")}</p>
      </section>

      {/* 18. No Warranty of Outcome */}
      <section id="sec-18" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s18.title")}
        </h2>
        <p>{t("legal.terms.sections.s18.p1")}</p>
        <p>{t("legal.terms.sections.s18.p2")}</p>
      </section>

      {/* 19. Governing Law */}
      <section id="sec-19" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s19.title")}
        </h2>
        <p>{t("legal.terms.sections.s19.p1")}</p>
      </section>

      {/* 20. Changes to these Terms */}
      <section id="sec-20" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s20.title")}
        </h2>
        <p>{t("legal.terms.sections.s20.p1")}</p>
        <p>{t("legal.terms.sections.s20.p2")}</p>
        <p>{t("legal.terms.sections.s20.p3")}</p>
      </section>

      {/* 21. Contact */}
      <section id="sec-21" className="space-y-1.5 pt-1">
        <h2 className="text-[12px] font-bold uppercase text-black">
          {t("legal.terms.sections.s21.title")}
        </h2>
        <p>{t("legal.terms.sections.s21.intro")}</p>
        <div className="space-y-1 pl-1">
          <p>
            <strong className="text-black uppercase">{t("legal.terms.sections.s21.email_label", {}, "Email")}:</strong>{" "}
            <a
              href="mailto:harvestwise.app@gmail.com"
              className="text-[var(--hw-green-800,#166534)] font-medium hover:underline"
            >
              {t("legal.terms.sections.s21.email", {}, "harvestwise.app@gmail.com")}
            </a>
          </p>
          <div>
            <strong className="text-black uppercase block">{t("legal.terms.sections.s21.address_label", {}, "Address")}:</strong>
            <p className="text-[var(--hw-neutral-700,#374151)]">
              {t("legal.terms.sections.s21.address_line1", {}, "University of Mindanao (UM) Matina Campus")}, {t("legal.terms.sections.s21.address_line2", {}, "University of Mindanao Drive, Matina Pangi Road, Matina Crossing")}, {t("legal.terms.sections.s21.address_line3", {}, "Davao City, 8000 Davao del Sur, Philippines")}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default TermsContent;
