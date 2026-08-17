import { TrendingUp, TrendingDown, Minus } from "lucide-react";
const HISTORY_DATA = {
  // Bangkerohan Retail
  "kamatis-bangkerohan-retail": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Retail", price: 85, change: 3 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Retail", price: 82, change: 2 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Retail", price: 80, change: -1 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Retail", price: 81, change: 4 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Retail", price: 77, change: -2.5 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Retail", price: 79.5, change: 1.5 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Retail", price: 78, change: -3 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Retail", price: 81, change: 0 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Retail", price: 81, change: 2 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Retail", price: 79, change: -1 },
    { date: "Jun 14", market: "Bangkerohan", priceType: "Retail", price: 80, change: 3 },
    { date: "Jun 13", market: "Bangkerohan", priceType: "Retail", price: 77, change: 2 }
  ],
  "talong-bangkerohan-retail": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Retail", price: 60, change: -1 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Retail", price: 61, change: 0 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Retail", price: 61, change: 2 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Retail", price: 59, change: -1 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Retail", price: 60, change: 0 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Retail", price: 60, change: 1 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Retail", price: 59, change: -2 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Retail", price: 61, change: 1 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Retail", price: 60, change: 0 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Retail", price: 60, change: -1 }
  ],
  "repolyo-bangkerohan-retail": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Retail", price: 42, change: -3 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Retail", price: 45, change: -2 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Retail", price: 47, change: -1 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Retail", price: 48, change: -3 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Retail", price: 51, change: 1 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Retail", price: 50, change: -2 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Retail", price: 52, change: -1 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Retail", price: 53, change: 0 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Retail", price: 53, change: -2 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Retail", price: 55, change: -1 }
  ],
  // Bangkerohan Wholesale
  "kamatis-bangkerohan-wholesale": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Wholesale", price: 74, change: 2.5 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Wholesale", price: 71.5, change: 1.5 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Wholesale", price: 70, change: -1.5 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Wholesale", price: 71.5, change: 2.5 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Wholesale", price: 69, change: -2 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Wholesale", price: 71, change: 1 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Wholesale", price: 70, change: -2.5 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Wholesale", price: 72.5, change: 0 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Wholesale", price: 72.5, change: 1.5 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Wholesale", price: 71, change: -1 }
  ],
  "talong-bangkerohan-wholesale": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Wholesale", price: 50, change: -1 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Wholesale", price: 51, change: 0 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Wholesale", price: 51, change: 1.5 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Wholesale", price: 49.5, change: -1 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Wholesale", price: 50.5, change: 0 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Wholesale", price: 50.5, change: 1 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Wholesale", price: 49.5, change: -1.5 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Wholesale", price: 51, change: 1 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Wholesale", price: 50, change: 0 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Wholesale", price: 50, change: -1 }
  ],
  "repolyo-bangkerohan-wholesale": [
    { date: "Jun 24", market: "Bangkerohan", priceType: "Wholesale", price: 34, change: -2.5 },
    { date: "Jun 23", market: "Bangkerohan", priceType: "Wholesale", price: 36.5, change: -1.5 },
    { date: "Jun 22", market: "Bangkerohan", priceType: "Wholesale", price: 38, change: -2 },
    { date: "Jun 21", market: "Bangkerohan", priceType: "Wholesale", price: 40, change: -1 },
    { date: "Jun 20", market: "Bangkerohan", priceType: "Wholesale", price: 41, change: 0 },
    { date: "Jun 19", market: "Bangkerohan", priceType: "Wholesale", price: 41, change: -2 },
    { date: "Jun 18", market: "Bangkerohan", priceType: "Wholesale", price: 43, change: -1 },
    { date: "Jun 17", market: "Bangkerohan", priceType: "Wholesale", price: 44, change: 0 },
    { date: "Jun 16", market: "Bangkerohan", priceType: "Wholesale", price: 44, change: -1 },
    { date: "Jun 15", market: "Bangkerohan", priceType: "Wholesale", price: 45, change: -2 }
  ],
  // DFTC Retail
  "kamatis-dftc-retail": [
    { date: "Jun 24", market: "DFTC", priceType: "Retail", price: 82, change: 2.5 },
    { date: "Jun 23", market: "DFTC", priceType: "Retail", price: 79.5, change: 1.5 },
    { date: "Jun 22", market: "DFTC", priceType: "Retail", price: 78, change: -1 },
    { date: "Jun 21", market: "DFTC", priceType: "Retail", price: 79, change: 3 },
    { date: "Jun 20", market: "DFTC", priceType: "Retail", price: 76, change: -2 },
    { date: "Jun 19", market: "DFTC", priceType: "Retail", price: 78, change: 1 },
    { date: "Jun 18", market: "DFTC", priceType: "Retail", price: 77, change: -2.5 },
    { date: "Jun 17", market: "DFTC", priceType: "Retail", price: 79.5, change: 0 },
    { date: "Jun 16", market: "DFTC", priceType: "Retail", price: 79.5, change: 1.5 },
    { date: "Jun 15", market: "DFTC", priceType: "Retail", price: 78, change: -1 }
  ],
  // DFTC Wholesale
  "kamatis-dftc-wholesale": [
    { date: "Jun 24", market: "DFTC", priceType: "Wholesale", price: 78, change: 2 },
    { date: "Jun 23", market: "DFTC", priceType: "Wholesale", price: 76, change: 1 },
    { date: "Jun 22", market: "DFTC", priceType: "Wholesale", price: 75, change: -1.5 },
    { date: "Jun 21", market: "DFTC", priceType: "Wholesale", price: 76.5, change: 2.5 },
    { date: "Jun 20", market: "DFTC", priceType: "Wholesale", price: 74, change: -2 },
    { date: "Jun 19", market: "DFTC", priceType: "Wholesale", price: 76, change: 1 },
    { date: "Jun 18", market: "DFTC", priceType: "Wholesale", price: 75, change: -2 },
    { date: "Jun 17", market: "DFTC", priceType: "Wholesale", price: 77, change: 0 },
    { date: "Jun 16", market: "DFTC", priceType: "Wholesale", price: 77, change: 1 },
    { date: "Jun 15", market: "DFTC", priceType: "Wholesale", price: 76, change: -1.5 }
  ],
  "repolyo-dftc-wholesale": [
    { date: "Jun 24", market: "DFTC", priceType: "Wholesale", price: 36, change: -2.5 },
    { date: "Jun 23", market: "DFTC", priceType: "Wholesale", price: 38.5, change: -1.5 },
    { date: "Jun 22", market: "DFTC", priceType: "Wholesale", price: 40, change: -2 },
    { date: "Jun 21", market: "DFTC", priceType: "Wholesale", price: 42, change: -1 },
    { date: "Jun 20", market: "DFTC", priceType: "Wholesale", price: 43, change: 0 },
    { date: "Jun 19", market: "DFTC", priceType: "Wholesale", price: 43, change: -2 },
    { date: "Jun 18", market: "DFTC", priceType: "Wholesale", price: 45, change: -1 },
    { date: "Jun 17", market: "DFTC", priceType: "Wholesale", price: 46, change: 0 },
    { date: "Jun 16", market: "DFTC", priceType: "Wholesale", price: 46, change: -1 },
    { date: "Jun 15", market: "DFTC", priceType: "Wholesale", price: 47, change: -2 }
  ]
};
function buildFallbackRows(commodityId, basePrice, market, priceType) {
  const offsets = [0, -2, -4, -1.5, -3, -0.5, -2.5, -1, 1, -3, -1.5, -2];
  let price = basePrice;
  const dates = ["Jun 24", "Jun 23", "Jun 22", "Jun 21", "Jun 20", "Jun 19", "Jun 18", "Jun 17", "Jun 16", "Jun 15", "Jun 14", "Jun 13"];
  return dates.map((date, i) => {
    const change = i === 0 ? offsets[0] : price - (basePrice + offsets[i]);
    const newPrice = Math.max(1, Math.round((basePrice + offsets[i]) * 10) / 10);
    const actualChange = i === 0 ? offsets[0] : newPrice - Math.round((basePrice + offsets[i - 1]) * 10) / 10;
    price = newPrice;
    return { date, market, priceType, price: newPrice, change: Math.round(actualChange * 10) / 10 };
  });
}
function getHistoryRows(commodityId, market, priceType, basePrice) {
  const mKey = market.toLowerCase().includes("dftc") ? "dftc" : "bangkerohan";
  const key = `${commodityId}-${mKey}-${priceType.toLowerCase()}`;
  return HISTORY_DATA[key] ?? buildFallbackRows(commodityId, basePrice, market, priceType);
}
const HistoricalPriceTable = ({
  commodityId,
  commodityName,
  market,
  priceType,
  basePrice
}) => {
  const rows = getHistoryRows(commodityId, market, priceType, basePrice);
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
            {rows.map((row, i) => {
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
                    ₱{row.price.toFixed(2)}
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
  })}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
        <p className="text-[12px] text-[var(--hw-neutral-700)]">
          Sample price records · {market}, Davao City · Change shown vs previous record
        </p>
      </div>
    </div>;
};
export {
  HistoricalPriceTable,
  getHistoryRows
};
