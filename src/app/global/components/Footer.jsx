import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { X } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
const Modal = ({ title, body, onClose }) => <div
  className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
    <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-6 relative">
      <button
  type="button"
  onClick={onClose}
  className="absolute top-4 right-4 text-[var(--hw-neutral-400)] hover:text-black transition-colors"
  aria-label="Close"
>
        <X className="w-5 h-5" />
      </button>
      <h2 className="text-[17px] font-bold text-black pr-6">{title}</h2>
      <p className="mt-4 text-[14px] text-black leading-relaxed">{body}</p>
      <button
  type="button"
  onClick={onClose}
  className="mt-6 w-full h-10 border border-[var(--hw-neutral-200)] text-[14px] font-medium text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors"
>
        Close
      </button>
    </div>
  </div>;
const PRIVACY_BODY = "HarvestWise protects the personal and farm-related information you provide, including your account details, farm location, crop plans, production costs, expected yield, and selling price information. These details are used only to provide crop advisories, price monitoring, weather guidance, and related system features.";
const TERMS_BODY = "HarvestWise provides decision-support information only. Price forecasts, profit estimates, weather guidance, and planting advisories are not guarantees of future prices, harvest results, income, or farm profitability. Farmers should still use their own judgment and local farming knowledge when making decisions.";
import { getStoredPublicAuthLanguage } from "../../auth/usePublicAuthLanguage";

const FOOTER_LABELS = {
  en: {
    privacy: "Privacy Policy",
    terms: "Terms & Conditions",
  },
  ceb: {
    privacy: "Patakaran sa Pribasidad",
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
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);

  const isAuth = location.pathname === "/login" || location.pathname === "/register";
  const isDFTC = location.pathname.startsWith("/dftc");
  const isAdmin = location.pathname.startsWith("/admin");
  const isFarmer = !isAdmin && !isDFTC && !isAuth;

  // Resolve current footer language: explicit prop > auth route default > general langCode
  const activeLang = lang || (isAuth ? getStoredPublicAuthLanguage() : langCode);
  const privacyLabel = isAuth
    ? (FOOTER_LABELS[activeLang]?.privacy || "Privacy Policy")
    : t("farmer.about.privacy_policy", {}, "Privacy Policy");
  const termsLabel = isAuth
    ? (FOOTER_LABELS[activeLang]?.terms || "Terms & Conditions")
    : t("farmer.about.terms_conditions", {}, "Terms & Conditions");

  const handlePrivacy = () => {
    if (isAuth) {
      setModal("privacy");
      return;
    }
    if (isFarmer) {
      navigate("/farmer/about?section=privacy");
    } else if (isDFTC) {
      navigate("/dftc/about?section=privacy");
    } else {
      navigate("/admin/about?section=privacy");
    }
  };

  const handleTerms = () => {
    if (isAuth) {
      setModal("terms");
      return;
    }
    if (isFarmer) {
      navigate("/farmer/about?section=terms");
    } else if (isDFTC) {
      navigate("/dftc/about?section=terms");
    } else {
      navigate("/admin/about?section=terms");
    }
  };

  return (
    <>
      <footer className={`flex items-center justify-center gap-2 py-3 ${className}`}>
        <button
          type="button"
          onClick={handlePrivacy}
          className="text-[12px] text-black hover:underline transition-colors"
        >
          {privacyLabel}
        </button>
        <span className="text-[12px] text-black">·</span>
        <button
          type="button"
          onClick={handleTerms}
          className="text-[12px] text-black hover:underline transition-colors"
        >
          {termsLabel}
        </button>
      </footer>

      {modal === "privacy" && (
        <Modal title={privacyLabel} body={PRIVACY_BODY} onClose={() => setModal(null)} />
      )}
      {modal === "terms" && (
        <Modal title={termsLabel} body={TERMS_BODY} onClose={() => setModal(null)} />
      )}
    </>
  );
};
export {
  Footer
};
