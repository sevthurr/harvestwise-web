import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { getClassificationColor, getClassificationTextColor } from "./dftcClassificationColors";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_NAMES = { Q1: "Jan–Mar", Q2: "Apr–Jun", Q3: "Jul–Sep", Q4: "Oct–Dec" };
const CARD_CLASS = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";

function currentQuarter() {
  return `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
}

function SeasonalProductionTrends({ commodity, commodityId, categories, onCommodityChange }) {
  const [quarter, setQuarter] = useState(currentQuarter);
  const commodityRef = commodityId || commodity;
  const query = useQuery({
    queryKey: ["dftc-trends-seasonal-production", commodityRef, quarter],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(commodityRef, quarter),
    enabled: Boolean(commodityRef),
    staleTime: 30 * 60 * 1000,
  });

  const data = query.data;
  const profiles = data?.quarterly_profiles || [];
  const selected = profiles.find((profile) => profile.quarter === quarter);
  const hasData = data?.status === "processed"
    && selected?.years_available > 0
    && selected?.average_production_mt != null;
  const geoRecords = (data?.geo_records || [])
    .filter((record) => record.reference_quarter === quarter)
    .reduce((byYear, record) => {
      const year = String(record.reference_year);
      byYear[year] ||= {};
      byYear[year][record.location] =
        (byYear[year][record.location] || 0) + Number(record.volume_produced);
      return byYear;
    }, {});
  const locations = [...new Set([
    ...(data?.source_areas || []).map((area) => area.name),
    ...Object.values(geoRecords).flatMap((areas) => Object.keys(areas)),
  ])].sort((a, b) => a.localeCompare(b));
  const records = (data?.records || [])
    .filter((record) => record.reference_quarter === quarter && record.volume_produced != null)
    .map((record) => ({
      year: String(record.reference_year),
      production: Number(record.volume_produced),
      geo: geoRecords[String(record.reference_year)] || {},
    }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  return (
    <div className="space-y-6">
      <section className={`${CARD_CLASS} p-5 md:p-6`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1.5">Commodity</span>
            <select
              value={commodity}
              onChange={(event) => onCommodityChange(event.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] border border-[var(--hw-neutral-200)] rounded-xl bg-white"
            >
              {categories.flatMap((category) => category.commodities).map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </label>
          <div>
            <span className="block text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1.5">Harvest season</span>
            <div className="flex flex-wrap gap-2">
              {QUARTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={quarter === value}
                  onClick={() => setQuarter(value)}
                  className={`px-3 py-2 text-[12px] font-semibold rounded-lg border ${
                    quarter === value
                      ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                      : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {query.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Historical seasonal production could not be loaded. Please try again later.
        </div>
      )}

      {query.isLoading && (
        <div className={`${CARD_CLASS} p-8 text-center text-sm text-[var(--hw-neutral-600)]`}>
          Loading historical seasonal production…
        </div>
      )}

      {!query.isLoading && !query.isError && commodityRef && !hasData && (
        <div className={`${CARD_CLASS} p-8 text-center`}>
          <p className="font-semibold text-[var(--hw-neutral-800)]">No historical production data available</p>
          <p className="mt-1 text-sm text-[var(--hw-neutral-600)]">
            {data?.message || `No PSA seasonal records are available for ${commodity} in ${quarter}.`}
          </p>
        </div>
      )}

      {hasData && (
        <>
          <section className={`${CARD_CLASS} p-5 md:p-6`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Selected season</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--hw-neutral-900)] tracking-tight">{quarter} · {QUARTER_NAMES[quarter]}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Historical seasonal average</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--hw-neutral-900)] tracking-tight">
                  {Number(selected.average_production_mt).toLocaleString()} MT
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Production level</p>
                <p className={`mt-1 text-xl sm:text-2xl font-bold tracking-tight ${getClassificationTextColor(selected.classification)}`}>{selected.classification}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--hw-neutral-500)]">Grand average production</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[var(--hw-neutral-900)] tracking-tight">
                  {data.grand_average_quarterly_mt != null
                    ? `${Number(data.grand_average_quarterly_mt).toLocaleString()} MT`
                    : "—"}
                </p>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--hw-neutral-500)]">
              {data.source || "PSA OpenSTAT"} · {data.years_covered || "historical records"}
            </p>
          </section>

          <section className={`${CARD_CLASS} p-5 md:p-6`}>
            <h2 className="text-[15px] font-bold text-[var(--hw-neutral-900)]">Historical production by season</h2>
            <p className="mb-4 text-[12px] text-[var(--hw-neutral-500)]">
              Backend quarterly averages across {commodity} production records · MT
            </p>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={profiles.filter((profile) => profile.years_available > 0)} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
                <XAxis dataKey="quarter" tickFormatter={(value) => `${value} · ${QUARTER_NAMES[value]}`} />
                <YAxis tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} MT`, "Average production"]} />
                <Bar dataKey="average_production_mt" name="Average production" radius={[6, 6, 0, 0]}>
                  {profiles.filter((profile) => profile.years_available > 0).map((profile) => {
                    const color = getClassificationColor(profile.classification);
                    const isSelected = profile.quarter === quarter;
                    return (
                      <Cell
                        key={profile.quarter}
                        fill={color}
                        opacity={isSelected ? 1 : 0.85}
                        stroke={isSelected ? "#1e293b" : "none"}
                        strokeWidth={isSelected ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center gap-4 mt-3 justify-center">
              <span className="text-[11px] font-semibold text-[var(--hw-neutral-500)]">Classification:</span>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#16a34a]" />
                <span className="text-[11px] font-medium text-[var(--hw-neutral-700)]">Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#eab308]" />
                <span className="text-[11px] font-medium text-[var(--hw-neutral-700)]">Lower Middle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ea580c]" />
                <span className="text-[11px] font-medium text-[var(--hw-neutral-700)]">Upper Middle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />
                <span className="text-[11px] font-medium text-[var(--hw-neutral-700)]">High</span>
              </div>
            </div>
          </section>

          <section className={`${CARD_CLASS} overflow-hidden`}>
            <div className="border-b border-[var(--hw-neutral-100)] px-5 py-4">
              <h2 className="text-[14px] font-bold text-[var(--hw-neutral-900)]">
                {quarter} historical records · {commodity}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--hw-neutral-50)] text-left uppercase tracking-wider text-[var(--hw-neutral-600)]">
                  <tr>
                    <th className="px-5 py-3">Year</th>
                    {locations.map((location) => (
                      <th key={location} className="px-5 py-3">{location}</th>
                    ))}
                    <th className="px-5 py-3">Production</th>
                    <th className="px-5 py-3">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {records.map((record) => (
                    <tr key={record.year}>
                      <td className="px-5 py-3 font-medium text-[var(--hw-neutral-800)]">{record.year}</td>
                      {locations.map((location) => (
                        <td key={location} className="px-5 py-3 text-[var(--hw-neutral-800)]">
                          {record.geo[location] == null
                            ? "—"
                            : `${record.geo[location].toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} MT`}
                        </td>
                      ))}
                      <td className="px-5 py-3 text-[var(--hw-neutral-800)]">{record.production.toLocaleString()} MT</td>
                      <td className={`px-5 py-3 font-semibold ${getClassificationTextColor(selected.classification)}`}>{selected.classification}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={locations.length + 3} className="px-5 py-5 text-center text-[var(--hw-neutral-500)]">
                        No historical records for this season.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default SeasonalProductionTrends;
