import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../../global/components/ui/Card";
const ForecastCard = ({
  title,
  timeframe,
  predictedValue,
  currentValue,
  confidence,
  unit = "kg",
  currency = "\u20B1"
}) => {
  const change = predictedValue - currentValue;
  const percentChange = (change / currentValue * 100).toFixed(1);
  const isIncrease = change > 0;
  const confidenceColor = confidence >= 80 ? "text-[var(--hw-success)]" : confidence >= 60 ? "text-[var(--hw-warning)]" : "text-[var(--hw-error)]";
  return <Card variant="default" className="border-l-4 border-l-[var(--hw-green-700)]">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{timeframe}</CardDescription>
          </div>
          {confidence < 70 && <AlertTriangle className="w-5 h-5 text-[var(--hw-warning)]" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:space-y-3">
          {
    /* Predicted Value */
  }
          <div>
            <p className="text-xs md:text-sm text-[var(--hw-neutral-900)] mb-0.5">Predicted Price</p>
            <p className="text-xl md:text-2xl font-bold text-[var(--hw-neutral-900)]">
              {currency}{predictedValue.toFixed(2)}
              <span className="text-xs md:text-sm font-normal text-[var(--hw-neutral-900)] ml-1">
                per {unit}
              </span>
            </p>
          </div>

          {
    /* Change Indicator */
  }
          <div className="flex items-center gap-2">
            {isIncrease ? <TrendingUp className="w-4 h-4 text-[var(--hw-error)]" /> : <TrendingDown className="w-4 h-4 text-[var(--hw-success)]" />}
            <span className={isIncrease ? "text-[var(--hw-error)]" : "text-[var(--hw-success)]"}>
              {isIncrease ? "+" : ""}{percentChange}% from current
            </span>
          </div>

          {
    /* Confidence */
  }
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--hw-neutral-700)]">Confidence</span>
              <span className={`text-xs font-semibold ${confidenceColor}`}>
                {confidence}%
              </span>
            </div>
            <div className="w-full h-2 bg-[var(--hw-neutral-200)] rounded-full overflow-hidden">
              <div
    className="h-full bg-[var(--hw-green-700)] transition-all duration-300"
    style={{ width: `${confidence}%` }}
  />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export {
  ForecastCard
};
