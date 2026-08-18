import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import { COMMODITIES } from "../components/market/mockData";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { InformationDisclosure } from "../components/market/DetailCards";
import { getHistoryRows } from "../components/market/HistoricalPriceTable";
const WHOLESALE_PRICE_DATA = {
  kamatis: { latest: 78, direction: "Rising" },
  talong: { latest: 55, direction: "Stable" },
  repolyo: { latest: 36, direction: "Falling" },
  atsal: { latest: 108, direction: "Rising" },
  carrots: { latest: 78, direction: "Stable" },
  pipino: { latest: 35, direction: "Stable" },
  ampalaya: { latest: 65, direction: "Rising" },
  kalabasa: { latest: 30, direction: "Stable" },
  lettuce: { latest: 68, direction: "Falling" },
  pechay: { latest: 28, direction: "Falling" }
};
const dirConfig = {
  Rising: { label: "Wholesale price is rising", Icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
  Stable: { label: "Wholesale price is stable", Icon: Minus, color: "text-[var(--hw-neutral-900)]", bg: "bg-[var(--hw-neutral-100)]" },
  Falling: { label: "Wholesale price is falling", Icon: TrendingDown, color: "text-emerald-600", bg: "bg-emerald-50" }
};
const periodBtn = (active) => `px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${active ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`;
const tooltipStyle = { backgroundColor: "white", border: "1px solid var(--hw-neutral-200)", borderRadius: 8, fontSize: 12 };
function DftcWholesaleDetailPage() {
  const { commodityId } = useParams();
  const navigate = useNavigate();
  const [period, setPeriod] = useState("7d");
  const commodity = COMMODITIES.find((c) => c.id === commodityId);
  const record = commodityId ? WHOLESALE_PRICE_DATA[commodityId] : void 0;
  if (!commodity || !record) {
    return <div className="px-4 py-8 text-center">
        <p className="text-[var(--hw-neutral-900)]">Commodity not found.</p>
        <button onClick={() => navigate("/farmer/prices")} className="mt-3 text-sm font-medium text-[var(--hw-green-700)]">
          Back to Price Monitoring
        </button>
      </div>;
  }
  const allRows = getHistoryRows(commodity.id, "DFTC", "Wholesale", record.latest);
  const latestPrice = allRows[0]?.price ?? record.latest;
  const comparisonDate = allRows[1]?.date ?? "Jun 23";
  const rawDiff = allRows.length >= 2 ? Math.round((allRows[0].price - allRows[1].price) * 10) / 10 : 0;
  const changeAmount = record.direction === "Stable" ? 0 : rawDiff;
  const periodCount = period === "7d" ? 7 : period === "14d" ? 14 : period === "28d" ? 28 : 90;
  const tableRows = allRows.slice(0, Math.min(periodCount, allRows.length));
  const chartData = [...tableRows].reverse().map((r) => ({ date: r.date, price: r.price }));
  const dir = dirConfig[record.direction];
  const DirIcon = dir.Icon;
  const changeStr = changeAmount === 0 ? `unchanged from ${comparisonDate}` : changeAmount > 0 ? `up \u20B1${Math.abs(changeAmount).toFixed(0)}/kg since ${comparisonDate}` : `down \u20B1${Math.abs(changeAmount).toFixed(0)}/kg since ${comparisonDate}`;
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-2xl mx-auto md:max-w-3xl space-y-4">

        {
    /* Back + commodity switcher */
  }
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
    onClick={() => navigate(`/farmer/prices/${commodity.id}`)}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-neutral-900)] hover:text-[var(--hw-neutral-900)] transition-colors"
  >
            <ArrowLeft className="w-4 h-4" />
            Price History
          </button>
          <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {COMMODITIES.map((c) => <button
    key={c.id}
    onClick={() => navigate(`/farmer/prices/${c.id}/wholesale`)}
    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${c.id === commodity.id ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)] text-white" : "bg-white border-[var(--hw-neutral-200)] text-[var(--hw-neutral-900)] hover:bg-[var(--hw-neutral-50)]"}`}
  >
                {c.name}
              </button>)}
          </div>
        </div>

        {
    /* Commodity header */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
          <div className="flex items-center gap-4">
            <CommodityIllustration commodityId={commodity.id} className="w-16 h-16 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{commodity.name}</h1>
              <p className="text-[13px] font-medium text-[var(--hw-neutral-900)] mt-0.5">DFTC Wholesale Price</p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[var(--hw-neutral-700)]">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-xs">Updated today at 7:30 AM</span>
              </div>
            </div>
          </div>
        </div>

        {
    /* DFTC Wholesale label pill */
  }
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--hw-neutral-100)] rounded-full">
          <span className="text-xs font-semibold text-[var(--hw-neutral-900)]">DFTC Wholesale</span>
        </div>

        {
    /* Wholesale Insight card */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2">
          <div className={`flex items-center gap-1.5 ${dir.color}`}>
            <DirIcon className="w-5 h-5" />
            <span className="font-semibold">{dir.label}</span>
          </div>
          <p className="text-[var(--hw-neutral-900)] leading-relaxed">
            {commodity.name} is{" "}
            <strong className="text-[var(--hw-neutral-900)]">₱{latestPrice.toFixed(0)}/kg</strong>,{" "}
            {changeStr}.
          </p>
          <p className="text-xs text-[var(--hw-neutral-700)]">DFTC Wholesale · Davao City</p>
        </div>

        {
    /* Analytics — always visible */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">DFTC Wholesale price trend</p>
            <p className="text-[13px] text-[var(--hw-neutral-900)] mt-0.5">DFTC Wholesale · Davao City</p>
          </div>

          {
    /* Period selector */
  }
          <div className="flex gap-1.5 flex-wrap">
            {["7d", "14d", "28d", "90d"].map((p) => <button key={p} onClick={() => setPeriod(p)} className={periodBtn(period === p)}>
                {p}
              </button>)}
          </div>

          {
    /* Chart */
  }
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
                <XAxis key="x-axis" dataKey="date" tick={{ fill: "var(--hw-neutral-400)", fontSize: 10 }} stroke="var(--hw-neutral-200)" tickLine={false} interval="preserveStartEnd" />
                <Tooltip key="tooltip" contentStyle={tooltipStyle} formatter={(v) => [`\u20B1${v.toFixed(2)}/kg`, "DFTC Wholesale"]} />
                <Line key="price" type="monotone" dataKey="price" stroke="#2563eb" strokeWidth={2} dot={{ r: 3, fill: "#2563eb" }} activeDot={{ r: 4, fill: "#2563eb" }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {
    /* Price summary */
  }
          <div className="grid grid-cols-3 gap-2">
            {[
    { label: "Current DFTC Wholesale price", value: `\u20B1${latestPrice.toFixed(0)}/kg`, color: "text-[var(--hw-neutral-900)]" },
    { label: `Change since ${comparisonDate}`, value: changeAmount === 0 ? "\u2014" : `${changeAmount > 0 ? "+" : ""}\u20B1${changeAmount.toFixed(0)}`, color: changeAmount > 0 ? "text-amber-600" : changeAmount < 0 ? "text-emerald-600" : "text-[var(--hw-neutral-700)]" },
    { label: "Direction", value: record.direction, color: dir.color }
  ].map((m) => <div key={m.label} className="bg-[var(--hw-neutral-50)] rounded-xl px-3 py-2">
                <p className="text-xs text-[var(--hw-neutral-700)]">{m.label}</p>
                <p className={`text-sm font-semibold mt-0.5 ${m.color}`}>{m.value}</p>
              </div>)}
          </div>

          {
    /* Wholesale price table — period-filtered, max 10 visible */
  }
          <div className="rounded-xl border border-[var(--hw-neutral-200)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
              <p className="text-xs font-semibold text-[var(--hw-neutral-700)]">
                {commodity.name} · DFTC Wholesale · {tableRows.length} records ({period})
              </p>
            </div>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-[var(--hw-neutral-100)]">
                  <th className="text-left px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Date</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Price/kg</th>
                  <th className="text-right px-3 py-2 font-semibold text-[var(--hw-neutral-900)]">Change</th>
                </tr>
              </thead>
            </table>
            <div className="overflow-y-auto" style={{ maxHeight: "380px", scrollbarWidth: "thin" }}>
              <table className="w-full text-[13px]">
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {tableRows.map((row, i) => <tr key={i} className={i === 0 ? "bg-[var(--hw-neutral-50)]" : ""}>
                      <td className="px-3 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">
                        {row.date}
                        {i === 0 && <span className="ml-1.5 text-[10px] font-semibold text-[var(--hw-green-700)]">Latest</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[var(--hw-neutral-900)] whitespace-nowrap">
                        ₱{row.price.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        {row.change === 0 ? <span className="text-[var(--hw-neutral-700)]">—</span> : <span className={row.change > 0 ? "text-amber-600 font-medium" : "text-emerald-600 font-medium"}>
                              {row.change > 0 ? "+" : ""}₱{row.change.toFixed(2)}
                            </span>}
                      </td>
                    </tr>)}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
              <p className="text-[12px] text-[var(--hw-neutral-700)]">
                Sample DFTC Wholesale price records · Davao City · {tableRows.length} records ({period})
              </p>
            </div>
          </div>
        </div>

        {
    /* View DFTC Wholesale Forecast */
  }
        <div className="bg-[var(--hw-green-50)] border border-[var(--hw-green-400)] rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[var(--hw-green-900)]">See the DFTC Wholesale forecast for {commodity.name}</p>
            <p className="text-xs text-[var(--hw-green-700)] mt-0.5">Short-term DFTC Wholesale price direction</p>
          </div>
          <button
    onClick={() => navigate(`/farmer/forecast/${commodity.id}/wholesale`)}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
            View DFTC Wholesale Forecast
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* Check planting recommendation */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-[var(--hw-neutral-900)]">Check planting recommendation</p>
            <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">Assess market conditions before you plant</p>
          </div>
          <button
    onClick={() => navigate(`/farmer/assess?commodity=${commodity.id}`)}
    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            Assess now
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {
    /* About this information */
  }
        <InformationDisclosure />
      </div>
    </div>;
}
export {
  DftcWholesaleDetailPage as default
};
