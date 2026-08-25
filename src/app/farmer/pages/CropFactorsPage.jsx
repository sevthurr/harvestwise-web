import { useParams, useNavigate } from "react-router";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import {
  FactorDetailTabs,
  buildPricePoints,
  getArrivalData,
  getProductionData,
  getWeatherData
} from "../components/shared/FactorDetailTabs";
function CropFactorsPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { crops } = useCrops();
  const crop = crops.find((c) => c.id === cropId);
  if (!crop) {
    return <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Crop not found.</p>
        <button onClick={() => navigate("/farmer/crops")} className="text-sm font-medium text-[var(--hw-green-700)]">
          Go to My Crops
        </button>
      </div>;
  }
  const currentPrice = crop.currentPrice || null;
  const fLo = crop.forecastLower || null;
  const fHi = crop.forecastUpper || null;
  const forecastMid = fLo != null && fHi != null ? (fLo + fHi) / 2 : null;
  const useForecast = ["planning", "on-hold", "growing"].includes(crop.phase);
  const basePrice = useForecast ? (forecastMid || currentPrice) : currentPrice;
  const updatedTotalCost = crop.totalCost || 0;
  const qty = crop.harvestQuantity > 0 ? crop.harvestQuantity : 0;
  const costToRecover = qty > 0 ? Math.ceil(updatedTotalCost / qty) : 0;
  const sellingBasis = basePrice;
  const margin = sellingBasis != null && costToRecover > 0 ? sellingBasis - costToRecover : 0;
  const priceDir = margin > 15 ? "rising" : margin > 0 ? "stable" : "falling";
  const actualPts = Array.from({ length: 7 }, (_, i) => ({
    label: i === 0 ? "7d ago" : i === 6 ? "Today" : `Day ${i + 1}`,
    price: basePrice ? Math.round(basePrice + (priceDir === "rising" ? -0.5 : priceDir === "falling" ? 0.5 : 0.1) * (6 - i) + Math.sin(i * 1.9) * 2) : 0
  }));
  const priceTabData = {
    currentPrice: basePrice,
    previousPrice: actualPts[0].price,
    market: useForecast ? "Forecasted price reference" : "Bangkerohan Retail",
    direction: priceDir,
    directionLabel: priceDir === "rising" ? "Price may rise" : priceDir === "falling" ? "Price may fall" : "Price likely stable",
    forecastRange: fLo != null && fHi != null ? `\u20B1${fLo}\u2013\u20B1${fHi}/kg` : "-/kg",
    points: buildPricePoints(actualPts.map((p) => ({ label: p.label, price: p.price })), basePrice || 0, priceDir, fLo || 0, fHi || 0, 7),
    summary: basePrice ? `Current ${useForecast ? "forecasted" : "market"} price for ${crop.commodityName} is \u20B1${basePrice}/kg. ${priceDir === "rising" ? "Prices are trending upward \u2014 good news if your harvest is near." : priceDir === "falling" ? "Prices are softening. Monitor closely before deciding to sell." : "Prices are stable. Good conditions for planning your sale."}` : "Price data unavailable."
  };
  const arrivalTabData = getArrivalData(crop.commodity);
  const productionTabData = getProductionData(crop.commodity, (/* @__PURE__ */ new Date()).getMonth());
  const weatherTabData = getWeatherData(margin > 10 ? "low" : "moderate", crop.commodityName);
  const profitabilityData = {
    costPerKg: costToRecover,
    sellingPricePerKg: sellingBasis,
    profitPerKg: margin,
    totalCost: updatedTotalCost,
    harvestQty: qty,
    summary: margin >= 0 ? `At \u20B1${sellingBasis}/kg selling price, you may earn about \u20B1${margin}/kg above your cost to recover of \u20B1${costToRecover}/kg. Total estimated profit for ${qty} kg harvest: \u20B1${(margin * qty).toLocaleString("en-PH")}.` : `The current price of \u20B1${sellingBasis}/kg is below your cost to recover of \u20B1${costToRecover}/kg. Selling now would result in a loss. Consider waiting for prices to improve.`
  };
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Breadcrumb */
  }
        <Breadcrumb
    items={[
      { label: "My Crops", onClick: () => navigate("/farmer/crops") },
      { label: crop.commodityName, onClick: () => navigate(`/farmer/crops/${crop.id}`) },
      { label: "Detailed Factors" }
    ]}
  />

        {
    /* Page title */
  }
        <div>
          <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{crop.commodityName || "-"} — Detailed Factors</h1>
          <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">
            Market analysis for your crop plan · {crop.phase ? crop.phase.replace(/-/g, " ") : "-"} phase
          </p>
        </div>

        {
    /* Factor tabs — profitability always available for saved crop plan */
  }
        <FactorDetailTabs
    price={priceTabData}
    arrival={arrivalTabData}
    production={productionTabData}
    weather={weatherTabData}
    profitability={profitabilityData}
    defaultTab="price"
    commodityId={crop.commodity}
    commodityName={crop.commodityName}
  />

        {
    /* Bottom action */
  }
        <button
    onClick={() => navigate(`/farmer/assess?commodity=${crop.commodity}`)}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
  >
          Assess this crop again
        </button>

      </div>
    </div>;
}
export {
  CropFactorsPage as default
};
