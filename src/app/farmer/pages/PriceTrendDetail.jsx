import { useParams, useNavigate, useLocation } from "react-router";
import { TrendingUp, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { PriceDetailView } from "../components/shared/PriceDetailView";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { apiGet, parseResponse } from "../../global/api";

function PriceTrendDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;
  
  const [commodity, setCommodity] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCommodityData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await apiGet('/prices?page_size=100');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await parseResponse(response);
        const items = data.items || [];
        
        // Find the commodity by ID - only allow top 10 commodities
        const item = items.find(i => {
          const camelItem = toCamelCase(i);
          return camelItem.commodityId === commodityId && (camelItem.isTop10 === true || i.is_top10 === true);
        });
        
        if (!item) {
          throw new Error('Commodity not found');
        }
        
        const camelItem = toCamelCase(item);
        setCommodity({
          id: camelItem.commodityId,
          name: camelItem.name || '–',
          baseName: camelItem.baseName,
          variety: camelItem.variety,
        });
        
        setPriceData({
          bangkerohanRetail: camelItem.prices?.bangkerohanRetail ?? null,
          bangkerohanWholesale: camelItem.prices?.bangkerohanWholesale ?? null,
          dftcRetail: camelItem.prices?.dftcRetail ?? null,
          dftcWholesale: camelItem.prices?.dftcWholesale ?? null,
          direction: camelItem.forecast?.trend || 'Stable',
          lowerForecast: camelItem.forecast?.lowerForecast ?? null,
          upperForecast: camelItem.forecast?.upperForecast ?? null,
        });
      } catch (err) {
        console.error('Failed to fetch commodity data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (commodityId) {
      fetchCommodityData();
    }
  }, [commodityId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--hw-green-700)]"></div>
          <p className="text-sm text-[var(--hw-neutral-700)]">Loading price details...</p>
        </div>
      </div>
    );
  }

  if (error || !commodity || !priceData) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Price details not available.</p>
        <button
          onClick={() => navigate("/farmer/prices")}
          className="text-sm font-medium text-[var(--hw-green-700)]"
        >
          Back to Prices
        </button>
      </div>
    );
  }

  // Use API data for current price (default to retail)
  const baseCurrentPrice = priceData.bangkerohanRetail || 0;
  const basePreviousPrice = baseCurrentPrice;
  const baseForecastLow = priceData.lowerForecast != null ? priceData.lowerForecast : baseCurrentPrice;
  const baseForecastHigh = priceData.upperForecast != null ? priceData.upperForecast : baseCurrentPrice;
  const dirLower = (priceData.direction || 'stable').toLowerCase();
  const baseActualPts = [
    { label: 'Today', price: baseCurrentPrice }
  ];

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Prices", onClick: () => navigate("/farmer/prices") },
            { label: commodity.name, onClick: () => navigate(`/farmer/prices/${commodity.id}`) },
            { label: "Price Trend Details" }
          ]}
        />

        {/* Price detail — heading with crop icon + two-chart layout */}
        <PriceDetailView
          commodityId={commodity.id}
          commodityName={commodity.name}
          baseCurrentPrice={baseCurrentPrice}
          basePreviousPrice={basePreviousPrice}
          direction={dirLower}
          baseForecastLow={baseForecastLow}
          baseForecastHigh={baseForecastHigh}
          baseActualPoints={baseActualPts}
          showHeading
        />

        {/* CTA */}
        <button
          onClick={() => navigate(`/farmer/assess?commodity=${commodity.id}`)}
          className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-3 rounded-xl text-[14px] font-semibold hover:bg-[var(--hw-green-800)] transition-colors"
        >
          Assess this crop
          <TrendingUp className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}

export {
  PriceTrendDetailPage as default
};
