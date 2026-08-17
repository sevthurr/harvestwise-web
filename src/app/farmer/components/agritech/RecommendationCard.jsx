import { Lightbulb, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../global/components/ui/Card";
const RecommendationCard = ({
  type,
  title,
  description,
  reasons,
  actionText,
  onAction
}) => {
  const config = {
    plant: {
      icon: <CheckCircle2 className="w-6 h-6" />,
      iconBg: "bg-green-100",
      iconColor: "text-green-700",
      borderColor: "border-l-green-600"
    },
    wait: {
      icon: <Info className="w-6 h-6" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-700",
      borderColor: "border-l-blue-600"
    },
    harvest: {
      icon: <Lightbulb className="w-6 h-6" />,
      iconBg: "bg-[var(--hw-green-50)]",
      iconColor: "text-[var(--hw-green-700)]",
      borderColor: "border-l-[var(--hw-green-700)]"
    },
    caution: {
      icon: <AlertCircle className="w-6 h-6" />,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-700",
      borderColor: "border-l-amber-600"
    }
  };
  const { icon, iconBg, iconColor, borderColor } = config[type];
  return <Card variant="elevated" className={`border-l-4 ${borderColor}`}>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm md:text-base">{title}</CardTitle>
            <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-[var(--hw-neutral-700)] mb-1.5 uppercase tracking-wide">
              Why this recommendation:
            </p>
            <ul className="space-y-1">
              {reasons.map((reason, index) => <li key={index} className="flex items-start gap-2 text-xs text-[var(--hw-neutral-900)]">
                  <span className="text-[var(--hw-green-700)] mt-0.5">•</span>
                  <span>{reason}</span>
                </li>)}
            </ul>
          </div>
          {actionText && onAction && <button
    onClick={onAction}
    className="w-full mt-3 px-4 py-2.5 bg-[var(--hw-green-700)] text-white rounded-lg font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
              {actionText}
            </button>}
        </div>
      </CardContent>
    </Card>;
};
export {
  RecommendationCard
};
