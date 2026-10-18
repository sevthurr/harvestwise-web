import React, { useState } from "react";
import { useLocation } from "react-router";
import { useLanguage } from "../contexts/LanguageContext";
import { getStoredPublicAuthLanguage } from "../../auth/usePublicAuthLanguage";
import { LegalModal } from "./legal/LegalModal";
import { PrivacyPolicyContent } from "./legal/PrivacyPolicyContent";
import { TermsContent } from "./legal/TermsContent";

const FOOTER_LABELS = {
  en: {
    privacy: "Privacy Policy",
    terms: "Terms and Conditions",
  },
  ceb: {
    privacy: "Patakaran sa Privacy",
    terms: "Mga Termino ug Kondisyon",
  },
  tl: {
    privacy: "Patakaran sa Privacy",
    terms: "Mga Tuntunin at Kundisyon",
  },
};

const Footer = ({ className = "", lang }) => {
  const { t, langCode } = useLanguage();
  const location = useLocation();
  const [modal, setModal] = useState(null);

  const isAuth = location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/onboarding";

  // Resolve current footer language: explicit prop > auth route default > general langCode
  const activeLang = lang || (isAuth ? getStoredPublicAuthLanguage() : langCode);

  const privacyLabel = isAuth
    ? (FOOTER_LABELS[activeLang]?.privacy || "Privacy Policy")
    : t("legal.privacy.title", {}, "Privacy Policy");
  const termsLabel = isAuth
    ? (FOOTER_LABELS[activeLang]?.terms || "Terms and Conditions")
    : t("legal.terms.title", {}, "Terms and Conditions");

  return (
    <>
      <footer className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 py-2 text-[11px] text-[var(--hw-neutral-600,#4b5563)] ${className}`}>
        <button
          type="button"
          onClick={() => setModal("privacy")}
          className="hover:underline hover:text-black transition-colors cursor-pointer"
        >
          {privacyLabel}
        </button>
        <span aria-hidden="true" className="text-[var(--hw-neutral-400,#9ca3af)]">·</span>
        <button
          type="button"
          onClick={() => setModal("terms")}
          className="hover:underline hover:text-black transition-colors cursor-pointer"
        >
          {termsLabel}
        </button>
      </footer>

      {modal === "privacy" && (
        <LegalModal
          title={privacyLabel}
          onClose={() => setModal(null)}
        >
          <PrivacyPolicyContent />
        </LegalModal>
      )}

      {modal === "terms" && (
        <LegalModal
          title={termsLabel}
          onClose={() => setModal(null)}
        >
          <TermsContent />
        </LegalModal>
      )}
    </>
  );
};

export { Footer };
export default Footer;
