import { useParams, useNavigate, useLocation } from "react-router";
import { TrendingUp } from "lucide-react";
import { COMMODITIES } from "../components/market/mockData";
import { getHistoryRows } from "../components/market/HistoricalPriceTable";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { PriceDetailView } from "../components/shared/PriceDetailView";
function PriceTrendDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  if (!commodity || !state) {
    return <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Price details not available.</p>
        <button
      onClick={() => navigate(commodityId ? `/prices/${commodityId}` : "/prices")}
      className="text-sm font-medium text-[var(--hw-green-700)]"
    >
          Back to Prices
        </button>
      </div>;
  }
  const { commodityName, currentPrice, direction, range } = state;
  const initialAdj = (state.histType === "Wholesale" ? 0.82 : 1) * (state.histSrc.toLowerCase().includes("dftc") ? 0.97 : 1);
  const baseRetailPrice = Math.round(currentPrice / initialAdj);
  const match = range.match(/₱(\d+)–₱(\d+)/);
  const rawFLo = match ? parseInt(match[1]) : Math.round(currentPrice * 0.95);
  const rawFHi = match ? parseInt(match[2]) : Math.round(currentPrice * 1.07);
  const baseFLo = Math.round(rawFLo / initialAdj);
  const baseFHi = Math.round(rawFHi / initialAdj);
  const baseRows = getHistoryRows(commodity.id, "bangkerohan", "Retail", baseRetailPrice);
  const baseActualPts = baseRows.slice(0, 10).reverse().map((r) => ({ label: r.date, price: r.price }));
  const basePrevPrice = baseRows[1]?.price ?? baseRetailPrice;
  const dirLower = direction.toLowerCase();
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Breadcrumb */
  }
        <Breadcrumb
    items={[
      { label: "Prices", onClick: () => navigate("/farmer/prices") },
      { label: commodityName, onClick: () => navigate(`/farmer/prices/${commodity.id}`) },
      { label: "Price Trend Details" }
    ]}
  />

        {
    /* Price detail — heading with crop icon + two-chart layout */
  }
        <PriceDetailView
    commodityId={commodity.id}
    commodityName={commodityName}
    baseCurrentPrice={baseRetailPrice}
    basePreviousPrice={basePrevPrice}
    direction={dirLower}
    baseForecastLow={baseFLo}
    baseForecastHigh={baseFHi}
    baseActualPoints={baseActualPts}
    showHeading
  />

        {
    /* CTA */
  }
        <button
    onClick={() => navigate(`/farmer/assess?commodity=${commodity.id}`)}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
  >
          Assess this crop
          <TrendingUp className="w-4 h-4" />
        </button>

      </div>
    </div>;
}
export {
  PriceTrendDetailPage as default
};
