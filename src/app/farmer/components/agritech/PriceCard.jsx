import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../global/components/ui/Card";
const PriceCard = ({
  commodity,
  currentPrice,
  previousPrice,
  unit = "kg",
  currency = "\u20B1",
  dateUpdated
}) => {
  const priceChange = currentPrice - previousPrice;
  const percentChange = (priceChange / previousPrice * 100).toFixed(1);
  const isPositive = priceChange > 0;
  const isNeutral = priceChange === 0;
  const TrendIcon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isNeutral ? "text-[var(--hw-neutral-700)]" : isPositive ? "text-[var(--hw-error)]" : "text-[var(--hw-success)]";
  return <Card variant="elevated" className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="text-base">{commodity}</CardTitle>
        {dateUpdated && <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">
            Updated {dateUpdated}
          </p>}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-[var(--hw-neutral-900)]">
              {currency}{currentPrice.toFixed(2)}
            </p>
            <p className="text-xs md:text-sm text-[var(--hw-neutral-900)] mt-0.5 md:mt-1">per {unit}</p>
          </div>
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-5 h-5" />
            <span className="font-semibold">
              {isPositive && "+"}{percentChange}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export {
  PriceCard
};
