import { Package, TrendingUp, MessageSquare, FileText } from "lucide-react";
import { Button } from "../../../global/components/ui/Button";
const EmptyState = ({
  type = "no-data",
  title,
  message,
  actionText,
  onAction,
  icon
}) => {
  const config = {
    "no-data": {
      icon: <Package className="w-12 h-12" />,
      title: "No Data Available",
      message: "There is no data to display at the moment. Check back later or try a different filter."
    },
    "no-prices": {
      icon: <TrendingUp className="w-12 h-12" />,
      title: "No Price Data",
      message: "Price information is currently unavailable. We're working to update the data."
    },
    "no-messages": {
      icon: <MessageSquare className="w-12 h-12" />,
      title: "No Messages Yet",
      message: "Start a conversation with farmers or stall owners to get recommendations."
    },
    "no-forecast": {
      icon: <FileText className="w-12 h-12" />,
      title: "No Forecast Available",
      message: "Forecast data is not yet available for this commodity. Check back soon."
    }
  };
  const { icon: defaultIcon, title: defaultTitle, message: defaultMessage } = config[type];
  return <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-[var(--hw-neutral-100)] flex items-center justify-center mb-4 text-[var(--hw-neutral-400)]">
        {icon || defaultIcon}
      </div>
      <h3 className="text-lg font-semibold text-[var(--hw-neutral-900)] mb-2">
        {title || defaultTitle}
      </h3>
      <p className="text-sm text-[var(--hw-neutral-500)] max-w-md mb-6">
        {message || defaultMessage}
      </p>
      {actionText && onAction && <Button onClick={onAction}>
          {actionText}
        </Button>}
    </div>;
};
export {
  EmptyState
};
