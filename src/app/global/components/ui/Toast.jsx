import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";
const Toast = ({
  variant,
  title,
  message,
  duration = 5e3,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);
  const config = {
    success: {
      icon: <CheckCircle2 className="w-5 h-5" />,
      bg: "bg-green-50",
      border: "border-green-200",
      iconColor: "text-green-600",
      textColor: "text-green-900"
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      bg: "bg-red-50",
      border: "border-red-200",
      iconColor: "text-red-600",
      textColor: "text-red-900"
    },
    warning: {
      icon: <AlertTriangle className="w-5 h-5" />,
      bg: "bg-amber-50",
      border: "border-amber-200",
      iconColor: "text-amber-600",
      textColor: "text-amber-900"
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bg: "bg-blue-50",
      border: "border-blue-200",
      iconColor: "text-blue-600",
      textColor: "text-blue-900"
    }
  };
  const { icon, bg, border, iconColor, textColor } = config[variant];
  return <div
    className={`
        ${bg} ${border} border rounded-lg shadow-lg p-4 min-w-[320px] max-w-md
        transition-all duration-300 transform
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
  >
      <div className="flex items-start gap-3">
        <div className={iconColor}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold ${textColor} mb-0.5`}>{title}</h4>
          {message && <p className={`text-sm ${textColor} opacity-90`}>{message}</p>}
        </div>
        <button
    onClick={() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }}
    className={`${textColor} opacity-60 hover:opacity-100 transition-opacity`}
  >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>;
};
const ToastContainer = ({ children }) => <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
    {children}
  </div>;
export {
  Toast,
  ToastContainer
};
