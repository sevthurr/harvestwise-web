import { useState, useEffect } from "react";
import { ChevronDown, X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
const inputCls = "w-full h-11 px-3.5 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]";
const SUFFIX_OPTIONS = ["None", "Jr.", "Sr.", "II", "III", "IV"];
const PW_REQS = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "At least 1 uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "At least 1 number", test: (p) => /[0-9]/.test(p) },
  { label: "At least 1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) }
];
const TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" }
];
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] p-5 ${className}`}>
    {children}
  </div>;
const SectionTitle = ({ children }) => <h2 className="text-[15px] font-semibold text-black mb-4">{children}</h2>;
const SectionLabel = ({ children }) => <p className="text-[12px] font-semibold text-black uppercase tracking-wide mb-3">{children}</p>;
const Field = ({ label, value }) => <div className="space-y-0.5">
    <p className="text-[12px] font-semibold text-black uppercase tracking-wide">{label}</p>
    <div className="text-[15px] text-black">{value || <span className="text-[var(--hw-neutral-300)]">—</span>}</div>
  </div>;
const FieldLabel = ({ htmlFor, children, optional }) => <label htmlFor={htmlFor} className="block text-[14px] font-semibold text-black mb-1.5">
    {children}
    {optional && <span className="ml-1 text-[12px] font-normal text-[var(--hw-neutral-400)]">(optional)</span>}
  </label>;
const GreenBtn = ({ onClick, type = "button", disabled, children, className = "" }) => <button
  type={type}
  onClick={onClick}
  disabled={disabled}
  className={`h-11 px-5 flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white text-[14px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors ${className}`}
>
    {children}
  </button>;
const GhostBtn = ({ onClick, children, className = "" }) => <button
  type="button"
  onClick={onClick}
  className={`h-11 px-5 flex items-center justify-center border border-[var(--hw-neutral-200)] text-[14px] font-medium text-black rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors ${className}`}
>
    {children}
  </button>;
const Toggle = ({ on, onChange }) => <button
  type="button"
  onClick={() => onChange(!on)}
  role="switch"
  aria-checked={on}
  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${on ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-200)]"}`}
>
    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
  </button>;
const Toast = ({ message, type = "success", title, onClose, duration = 5000 }) => {
  const [visible, setVisible] = useState(false);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      setActiveToast(null);
      return;
    }

    const payload = typeof message === "object" ? message : { message, type, title };
    setActiveToast(payload);
    const animTimer = setTimeout(() => setVisible(true), 20);

    const closeTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveToast(null);
        onClose?.();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(closeTimer);
    };
  }, [message, type, title, duration, onClose]);

  if (!activeToast) return null;

  const toastType = activeToast.type || type || "success";

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
      border: "border-emerald-200",
      text: "text-emerald-800",
      title: activeToast.title || "Success",
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
      border: "border-red-200",
      text: "text-red-800",
      title: activeToast.title || "Error",
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      border: "border-amber-200",
      text: "text-amber-800",
      title: activeToast.title || "Warning",
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      border: "border-blue-200",
      text: "text-blue-800",
      title: activeToast.title || "Information",
    },
  };

  const cfg = config[toastType] || config.success;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setActiveToast(null);
      onClose?.();
    }, 300);
  };

  return (
    <div className="fixed top-5 right-5 z-[500] max-w-sm w-full pointer-events-none px-3 md:px-0">
      <div
        className={`pointer-events-auto bg-white border ${cfg.border} rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)] p-4 flex items-start gap-3 transition-all duration-300 ease-out transform ${
          visible ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0"
        }`}
      >
        <div className="mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          {activeToast.title && (
            <p className={`text-[13px] font-bold ${cfg.text} leading-snug mb-0.5`}>
              {activeToast.title}
            </p>
          )}
          <p className={`text-[13px] font-semibold ${cfg.text} leading-snug`}>
            {activeToast.message}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors flex-shrink-0 -mr-1 -mt-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
const Modal = ({ title, onClose, children }) => <div
  className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
>
    <div className="w-full max-w-md bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[17px] font-bold text-black">{title}</h3>
        <button onClick={onClose} className="text-[var(--hw-neutral-400)] hover:text-black transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      {children}
    </div>
  </div>;
const Accordion = ({ title, open, onToggle, children }) => <div className="border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
    <button
  type="button"
  onClick={onToggle}
  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[var(--hw-neutral-50)] transition-colors"
>
      <span className="text-[14px] font-semibold text-black">{title}</span>
      <ChevronDown className={`w-4 h-4 text-black flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div className="px-4 pb-4 pt-3 border-t border-[var(--hw-neutral-100)]">
        {children}
      </div>}
  </div>;
export {
  Accordion,
  Card,
  Field,
  FieldLabel,
  GhostBtn,
  GreenBtn,
  Modal,
  PW_REQS,
  SUFFIX_OPTIONS,
  SectionLabel,
  SectionTitle,
  TEXT_SIZE_OPTIONS,
  Toast,
  Toggle,
  inputCls
};
