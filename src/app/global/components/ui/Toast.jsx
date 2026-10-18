import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

const Toast = ({
  variant = "success",
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const animTimer = setTimeout(() => setIsVisible(true), 20);
    let closeTimer;
    if (duration > 0) {
      closeTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
    }
    return () => {
      clearTimeout(animTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const activeVariant = type || variant || "success";

  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
      border: "border-emerald-200",
      textColor: "text-emerald-800",
      titleColor: "text-emerald-900"
    },
    error: {
      icon: <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />,
      border: "border-red-200",
      textColor: "text-red-800",
      titleColor: "text-red-900"
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      border: "border-amber-200",
      textColor: "text-amber-800",
      titleColor: "text-amber-900"
    },
    info: {
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      border: "border-blue-200",
      textColor: "text-blue-800",
      titleColor: "text-blue-900"
    }
  };

  const { icon, border, textColor, titleColor } = config[activeVariant] || config.success;

  return (
    <div
      className={`
        bg-white ${border} border rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.12)] p-4 min-w-[300px] max-w-sm
        transition-all duration-300 ease-out transform
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          {title && <h4 className={`text-[13px] font-bold ${titleColor} leading-snug mb-0.5`}>{title}</h4>}
          {message && <p className={`text-[13px] font-semibold ${textColor} leading-snug`}>{message}</p>}
        </div>
        <button
          type="button"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] p-1 rounded-lg hover:bg-[var(--hw-neutral-100)] transition-colors flex-shrink-0 -mr-1 -mt-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const ToastContainer = ({ children }) => (
  <div className="fixed top-5 right-5 z-[500] flex flex-col gap-2 pointer-events-none [&>*]:pointer-events-auto">
    {children}
  </div>
);

export { Toast, ToastContainer };
