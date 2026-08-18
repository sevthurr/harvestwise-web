import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { TrendingUp, TrendingDown, Minus, RefreshCw, ChevronRight, BarChart2 } from "lucide-react";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { getHistoryRows } from "../components/market/HistoricalPriceTable";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { getVariants, HW_ID_TO_NAME } from "../../global/data/commodities";
const DETAIL_DATA = {
  kamatis: {
    "bangkerohan": { latest: 85, direction: "Rising", range: "\u20B184\u2013\u20B195/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 72, direction: "Rising", range: "\u20B171\u2013\u20B181/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 80, direction: "Rising", range: "\u20B179\u2013\u20B190/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 78, direction: "Rising", range: "\u20B177\u2013\u20B187/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  talong: {
    "bangkerohan": { latest: 72, direction: "Stable", range: "\u20B168\u2013\u20B176/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 61, direction: "Stable", range: "\u20B158\u2013\u20B165/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 70, direction: "Stable", range: "\u20B167\u2013\u20B175/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 55, direction: "Stable", range: "\u20B152\u2013\u20B160/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  repolyo: {
    "bangkerohan": { latest: 60, direction: "Falling", range: "\u20B154\u2013\u20B162/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 51, direction: "Falling", range: "\u20B146\u2013\u20B153/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 57, direction: "Falling", range: "\u20B151\u2013\u20B159/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 36, direction: "Falling", range: "\u20B132\u2013\u20B138/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  atsal: {
    "bangkerohan": { latest: 120, direction: "Rising", range: "\u20B1117\u2013\u20B1130/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 102, direction: "Rising", range: "\u20B199\u2013\u20B1111/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 115, direction: "Rising", range: "\u20B1112\u2013\u20B1124/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 108, direction: "Rising", range: "\u20B1105\u2013\u20B1116/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  carrots: {
    "bangkerohan": { latest: 90, direction: "Stable", range: "\u20B186\u2013\u20B196/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 77, direction: "Stable", range: "\u20B173\u2013\u20B182/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 85, direction: "Stable", range: "\u20B182\u2013\u20B191/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 78, direction: "Stable", range: "\u20B175\u2013\u20B183/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  pipino: {
    "bangkerohan": { latest: 40, direction: "Stable", range: "\u20B137\u2013\u20B144/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 34, direction: "Stable", range: "\u20B131\u2013\u20B138/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 38, direction: "Stable", range: "\u20B136\u2013\u20B142/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 35, direction: "Stable", range: "\u20B133\u2013\u20B139/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  ampalaya: {
    "bangkerohan": { latest: 75, direction: "Rising", range: "\u20B173\u2013\u20B184/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 64, direction: "Rising", range: "\u20B162\u2013\u20B172/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 70, direction: "Rising", range: "\u20B168\u2013\u20B179/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 65, direction: "Rising", range: "\u20B163\u2013\u20B172/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  kalabasa: {
    "bangkerohan": { latest: 35, direction: "Stable", range: "\u20B132\u2013\u20B139/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 30, direction: "Stable", range: "\u20B127\u2013\u20B133/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 33, direction: "Stable", range: "\u20B131\u2013\u20B137/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 30, direction: "Stable", range: "\u20B128\u2013\u20B134/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  lettuce: {
    "bangkerohan": { latest: 80, direction: "Falling", range: "\u20B170\u2013\u20B180/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 68, direction: "Falling", range: "\u20B159\u2013\u20B169/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 75, direction: "Falling", range: "\u20B165\u2013\u20B175/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 68, direction: "Falling", range: "\u20B160\u2013\u20B170/kg", histSrc: "DFTC", histType: "Wholesale" }
  },
  pechay: {
    "bangkerohan": { latest: 35, direction: "Falling", range: "\u20B130\u2013\u20B137/kg", histSrc: "Bangkerohan Public Market", histType: "Retail" },
    "bangkerohan-wholesale": { latest: 30, direction: "Falling", range: "\u20B125\u2013\u20B132/kg", histSrc: "Bangkerohan Public Market", histType: "Wholesale" },
    "dftc-retail": { latest: 32, direction: "Falling", range: "\u20B127\u2013\u20B134/kg", histSrc: "DFTC", histType: "Retail" },
    "dftc-wholesale": { latest: 28, direction: "Falling", range: "\u20B124\u2013\u20B130/kg", histSrc: "DFTC", histType: "Wholesale" }
  }
};
const MARKET_LABEL = {
  "bangkerohan": "Bangkerohan Retail",
  "bangkerohan-wholesale": "Bangkerohan Wholesale",
  "dftc-retail": "DFTC Retail",
  "dftc-wholesale": "DFTC Wholesale"
};
const OUTLOOK_TEXT = {
  Rising: "Price may rise",
  Falling: "Price may fall",
  Stable: "Price may stay stable"
};
const DIR_CFG = {
  Rising: { color: "text-emerald-600", Icon: TrendingUp },
  Falling: { color: "text-red-500", Icon: TrendingDown },
  Stable: { color: "text-blue-500", Icon: Minus }
};
const PERIOD_LABEL = {
  "7d": "7 days",
  "14d": "14 days",
  "21d": "21 days",
  "28d": "28 days"
};
function getPeriodRange(baseRange, period) {
  const match = baseRange.match(/₱(\d+)–₱(\d+)/);
  if (!match) return baseRange;
  const low = parseInt(match[1]);
  const high = parseInt(match[2]);
  const mid = (low + high) / 2;
  const half = (high - low) / 2;
  const factor = { "7d": 1, "14d": 1.25, "21d": 1.5, "28d": 1.8 }[period];
  const newHalf = Math.round(half * factor);
  return `\u20B1${Math.round(mid - newHalf)}\u2013\u20B1${Math.round(mid + newHalf)}/kg`;
}
const segCls = (active) => `flex-1 py-2 text-[12px] font-medium transition-colors text-center leading-tight px-1 ${active ? "bg-[var(--hw-green-700)] text-white" : "text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
const periodChipCls = (active) => `px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors flex-shrink-0 ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
function CommodityDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const [market, setMarket] = useState("bangkerohan");
  const [period, setPeriod] = useState("7d");
  const [showMore, setShowMore] = useState(false);
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const marketMap = commodityId ? DETAIL_DATA[commodityId] : void 0;
  if (!commodity || !marketMap) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">Commodity not found.</p>
        <button onClick={() => navigate("/farmer/prices")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Prices
        </button>
      </div>;
  }
  const entry = marketMap[market];
  const cfg = DIR_CFG[entry.direction];
  const DirIcon = cfg.Icon;
  const allRows = getHistoryRows(commodity.id, entry.histSrc, entry.histType, entry.latest);
  const tableRows = showMore ? allRows.slice(0, 30) : allRows.slice(0, 5);
  const handleViewPriceTrend = () => {
    const state = {
      commodityName: commodity.name,
      marketLabel: MARKET_LABEL[market],
      histSrc: entry.histSrc,
      histType: entry.histType,
      currentPrice: entry.latest,
      direction: entry.direction,
      range: entry.range
    };
    navigate(`/farmer/prices/${commodity.id}/price-trend`, { state });
  };
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Breadcrumb + commodity switcher */
  }
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb
    items={[
      { label: "Prices", onClick: () => navigate("/farmer/prices") },
      { label: commodity.name }
    ]}
  />
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {COMMODITIES.map((c) => <button
    key={c.id}
    onClick={() => navigate(`/farmer/prices/${c.id}`)}
    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${c.id === commodity.id ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {c.name}
              </button>)}
          </div>
        </div>

        {
    /* Crop header */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-center gap-4">
            <CommodityIllustration commodityId={commodity.id} className="w-14 h-14 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.name}</h1>
              <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">Price Details</p>
              <div className="flex items-center gap-1.5 mt-1 text-[var(--hw-neutral-900)]">
                <RefreshCw className="w-3 h-3" />
                <span className="text-xs">Updated today at 7:30 AM</span>
              </div>
            </div>
          </div>
        </div>

        {
    /* 4-option market selector */
  }
        <div className="flex rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden bg-white shadow-[var(--shadow-xs)]">
          <button onClick={() => setMarket("bangkerohan")} className={segCls(market === "bangkerohan")}>
            Bangkerohan
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("bangkerohan-wholesale")} className={segCls(market === "bangkerohan-wholesale")}>
            Bangkerohan Wholesale
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("dftc-retail")} className={segCls(market === "dftc-retail")}>
            DFTC Retail
          </button>
          <div className="w-px bg-[var(--hw-neutral-200)]" />
          <button onClick={() => setMarket("dftc-wholesale")} className={segCls(market === "dftc-wholesale")}>
            DFTC Wholesale
          </button>
        </div>

        {
    /* Price Outlook — period selector */
  }
        <div className="space-y-2">
          <p className="text-[12px] font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide">
            Price Outlook
          </p>
          <div className="flex gap-2">
            {["7d", "14d", "21d", "28d"].map((p) => <button key={p} onClick={() => setPeriod(p)} className={periodChipCls(period === p)}>
                {PERIOD_LABEL[p]}
              </button>)}
          </div>
        </div>

        {
    /* Two side-by-side price cards */
  }
        {(() => {
    const dName = HW_ID_TO_NAME[commodity.id] ?? commodity.name;
    const vs = getVariants(dName);
    const offsets = [0, -5, 3, -8, 7];
    const rangeMatch = entry.range.match(/₱(\d+)–₱(\d+)/);
    return <div className="grid grid-cols-2 gap-3">

              {
      /* Card 1: Current price */
    }
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
                  Current Price
                </p>
                {vs.length > 0 ? <div className="space-y-1">
                    {vs.map((v, i) => {
      const vPrice = Math.max(10, entry.latest + (offsets[i % offsets.length] ?? 0));
      return <div key={v} className="flex items-baseline justify-between gap-2">
                          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] leading-snug min-w-0 truncate">{v}</p>
                          <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none flex-shrink-0 whitespace-nowrap">
                            ₱{vPrice}<span className="text-[12px] font-medium">/kg</span>
                          </p>
                        </div>;
    })}
                  </div> : <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none">
                    ₱{entry.latest}<span className="text-[12px] font-medium">/kg</span>
                  </p>}
                <p className="text-[12px] text-[var(--hw-neutral-500)]">Today · {MARKET_LABEL[market]}</p>
              </div>

              {
      /* Card 2: Forecasted price */
    }
              <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex flex-col gap-1.5">
                <p className="text-[11px] font-semibold text-[var(--hw-neutral-500)] uppercase tracking-wide">
                  Forecasted Price
                </p>
                {vs.length > 0 ? <div className="space-y-1">
                    {vs.map((v, i) => {
      const lo = rangeMatch ? parseInt(rangeMatch[1]) + (offsets[i % offsets.length] ?? 0) : 0;
      const hi = rangeMatch ? parseInt(rangeMatch[2]) + (offsets[i % offsets.length] ?? 0) : 0;
      return <div key={v} className="flex items-baseline justify-between gap-2">
                          <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)] leading-snug min-w-0 truncate">{v}</p>
                          <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none flex-shrink-0 whitespace-nowrap">
                            ₱{lo}–₱{hi}<span className="text-[12px] font-medium">/kg</span>
                          </p>
                        </div>;
    })}
                  </div> : <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-none">
                    {getPeriodRange(entry.range, period)}
                  </p>}
                <p className="text-[12px] text-[var(--hw-neutral-500)]">Next {PERIOD_LABEL[period]}</p>
                <div className={`flex items-center gap-1 ${cfg.color}`}>
                  <DirIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[12px] font-medium">{OUTLOOK_TEXT[entry.direction]}</span>
                </div>
              </div>

            </div>;
  })()}

        {
    /* View price trend details — navigates to dedicated page */
  }
        <button
    onClick={handleViewPriceTrend}
    className="w-full flex items-center justify-between gap-3 bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--hw-neutral-100)] rounded-xl flex-shrink-0">
              <BarChart2 className="w-4 h-4 text-[var(--hw-neutral-900)]" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">View price trend details</p>
              <p className="text-[12px] text-[var(--hw-neutral-900)]">Historical prices + 7-day forecast chart</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-900)] flex-shrink-0" />
        </button>

        {
    /* Recent price records */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[13px] font-semibold text-[var(--hw-neutral-900)]">Recent price records</p>
            <p className="text-[12px] text-[var(--hw-neutral-900)] mt-0.5">{MARKET_LABEL[market]} · Davao City</p>
          </div>
          {(() => {
    const displayName = HW_ID_TO_NAME[commodity.id] ?? commodity.name;
    const rowVariants = getVariants(displayName);
    const showVariety = rowVariants.length > 0;
    return <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                    <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Date</th>
                    {showVariety && <th className="text-left px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Variety</th>}
                    <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Price</th>
                    <th className="text-right px-4 py-2 font-semibold text-[var(--hw-neutral-900)]">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {tableRows.map((row, i) => <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : ""}>
                      <td className="px-4 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap">
                        {row.date}
                        {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Today</span>}
                      </td>
                      {showVariety && <td className="px-4 py-2.5 text-[var(--hw-neutral-900)] whitespace-nowrap italic text-[12px]">
                          {rowVariants[i % rowVariants.length]}
                        </td>}
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">
                        ₱{row.price.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {row.change === 0 ? <span className="text-[var(--hw-neutral-900)]">—</span> : <span className={row.change > 0 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                              {row.change > 0 ? "+" : ""}₱{row.change.toFixed(2)}
                            </span>}
                      </td>
                    </tr>)}
                </tbody>
              </table>;
  })()}
          <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
            <button
    onClick={() => setShowMore((v) => !v)}
    className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity"
  >
              {showMore ? "Show fewer records" : "View more records"}
            </button>
          </div>
        </div>

        {
    /* Bottom action card */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5 space-y-3">
          <div>
            <p className="text-[15px] font-semibold text-[var(--hw-neutral-900)]">
              Check if this crop is good to plant
            </p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
              See price, weather, and estimated profit before you plant.
            </p>
          </div>
          <button
    onClick={() => navigate(`/assess?commodity=${commodity.id}`)}
    className="w-full flex items-center justify-center gap-2 bg-[var(--hw-green-700)] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--hw-green-800)] transition-colors"
  >
            Check crop
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="text-center">
            <button
    onClick={() => navigate("/farmer/prices")}
    className="text-[13px] font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
              View another crop
            </button>
          </div>
        </div>

      </div>
    </div>;
}
export {
  CommodityDetailPage as default
};
