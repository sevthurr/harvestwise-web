import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { X } from "lucide-react";
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
const Footer = ({ className = "" }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const isDFTC = location.pathname.startsWith("/dftc");
  const isAdmin = location.pathname.startsWith("/admin");
  const isFarmer = !isAdmin && !isDFTC;
  const handlePrivacy = () => {
    if (isFarmer) {
      navigate("about?section=privacy");
    } else if (isDFTC) {
      navigate("/dftc/about?section=privacy");
    } else {
      navigate("/admin/about?section=privacy");
    }
  };
  const handleTerms = () => {
    if (isFarmer) {
      navigate("about?section=terms");
    } else if (isDFTC) {
      navigate("/dftc/about?section=terms");
    } else {
      navigate("/admin/about?section=terms");
    }
  };
  return <>
      <footer className={`flex items-center justify-center gap-2 py-3 ${className}`}>
        <button
    type="button"
    onClick={handlePrivacy}
    className="text-[12px] text-black hover:underline transition-colors"
  >
          Privacy Policy
        </button>
        <span className="text-[12px] text-black">·</span>
        <button
    type="button"
    onClick={handleTerms}
    className="text-[12px] text-black hover:underline transition-colors"
  >
          Terms &amp; Conditions
        </button>
      </footer>

      {modal === "privacy" && <Modal title="Privacy Policy" body={PRIVACY_BODY} onClose={() => setModal(null)} />}
      {modal === "terms" && <Modal title="Terms & Conditions" body={TERMS_BODY} onClose={() => setModal(null)} />}
    </>;
};
export {
  Footer
};
