import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useEffect, useState } from "react";

const HistoricalPriceTable = ({
  commodityId,
  commodityName,
  market = "Bangkerohan",
  priceType = "Retail",
  basePrice
}) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';
        
        // Fetch commodity detail which includes recent price records
        const response = await fetch(`${apiUrl}/prices/${commodityId}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Transform API response to match table format
        const transformedRows = (data.recent_records || []).map((record) => ({
          date: record.is_today 
            ? 'Today' 
            : new Date(record.price_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          market: market,
          priceType: priceType,
          price: record.price_avg || 0,
          change: record.change || 0
        }));
        
        setRows(transformedRows);
      } catch (err) {
        console.error('Failed to fetch historical data:', err);
        setError(err.message);
        // Fallback: show empty state
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    if (commodityId) {
      fetchHistoricalData();
    }
  }, [commodityId, market, priceType]);

  if (loading) {
    return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 text-center">
      <p className="text-[13px] text-[var(--hw-neutral-700)]">Loading price history...</p>
    </div>;
  }

  return <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
        <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">
          {commodityName} · {market} · {priceType} price history
        </p>
      </div>

      {
    /* Scrollable table — date + price sticky visible, secondary columns scroll */
  }
      <div
    className="overflow-x-auto"
    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
  >
        <table className="w-full text-[13px] min-w-[420px]">
          <thead>
            <tr className="border-b border-[var(--hw-neutral-100)]">
              <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-700)] w-20">Date</th>
              <th className="text-left px-3 py-2 font-semibold text-[var(--hw-neutral-700)]">Market</th>
              <th className="text-left px-3 py-2 font-semibold text-[var(--hw-neutral-700)]">Type</th>
              <th className="text-right px-3 py-2 font-semibold text-[var(--hw-neutral-700)] w-24">Price/kg</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-700)] w-20">Change</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hw-neutral-100)]">
            {rows.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-6 text-center text-[13px] text-[var(--hw-neutral-700)]">
                  No price history available
                </td>
              </tr>
            ) : (
              rows.map((row, i) => {
    const isPos = row.change > 0;
    const isNeg = row.change < 0;
    return <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : "hover:bg-[var(--hw-neutral-50)]"}>
                  <td className="px-4 py-2.5 text-[var(--hw-neutral-700)] font-medium whitespace-nowrap">
                    {row.date}
                    {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Latest</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{row.market}</td>
                  <td className="px-3 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">{row.priceType}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">
                    {row.price ? `₱${row.price.toFixed(2)}` : '–'}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {row.change === 0 ? <span className="flex items-center justify-end gap-0.5 text-[var(--hw-neutral-700)]">
                        <Minus className="w-3 h-3" />
                        <span className="text-[13px]">—</span>
                      </span> : <span className={`flex items-center justify-end gap-0.5 font-medium ${isPos ? "text-amber-600" : "text-emerald-600"}`}>
                        {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPos ? "+" : ""}₱{row.change.toFixed(2)}
                      </span>}
                  </td>
                </tr>;
  })
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
        <p className="text-[12px] text-[var(--hw-neutral-700)]">
          {rows.length === 0 ? '–' : `${market} · Change shown vs previous record`}
        </p>
      </div>
    </div>;
};

// Fallback function for backward compatibility (used by legacy pages)
function getHistoryRows(commodityId, market, priceType, basePrice) {
  // Simple fallback that generates empty array
  // Pages should use HistoricalPriceTable component instead for real data
  return [];
}

export {
  HistoricalPriceTable,
  getHistoryRows
};
