import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { getClassificationColor, getClassificationTextColor } from "./dftcClassificationColors";
import { useIsMobile } from "../../global/components/ui/use-mobile";
import { SearchableCombobox } from "./DFTCTrends";
import { ProductionSourcePieChart } from "../../global/components/shared/ProductionSourcePieChart";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const QUARTER_NAMES = { Q1: "Jan–Mar", Q2: "Apr–Jun", Q3: "Jul–Sep", Q4: "Oct–Dec" };
const CARD_CLASS = "bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)]";

function currentQuarter() {
  return `Q${Math.floor(new Date().getMonth() / 3) + 1}`;
}

function SeasonalProductionTrends({ commodity, commodityId, categories, onCommodityChange }) {
  const isMobile = useIsMobile();
  const [quarter, setQuarter] = useState(currentQuarter);
  const [selectedLocation, setSelectedLocation] = useState("all");
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
  const summaryProfile = selected || profiles[0];
  const hasData = data?.status === "processed" && (data?.records || []).length > 0;

  const chartQuarters = quarter ? [quarter] : QUARTERS;
  const geoRecords = (data?.geo_records || [])
    .filter((record) => !quarter || record.reference_quarter === quarter)
    .reduce((byYear, record) => {
      const year = String(record.reference_year);
      byYear[year] ||= {};
      byYear[year][record.location] =
        (byYear[year][record.location] || 0) + Number(record.volume_produced);
      return byYear;
    }, {});
  const locations = [...new Set([
    ...(data?.source_areas || []).map((area) => area.name),
    ...(data?.geo_records || []).map((r) => r.location),
    ...Object.values(geoRecords).flatMap((areas) => Object.keys(areas)),
  ])].filter(Boolean).sort((a, b) => a.localeCompare(b));

  const chartData = useMemo(() => {
    const rows = new Map();
    (data?.records || []).forEach((record) => {
      const year = Number(record.reference_year);
      if (Number.isFinite(year) && !rows.has(year)) {
        rows.set(year, { year });
      }
    });

    if (selectedLocation === "all") {
      (data?.records || []).forEach((record) => {
        const year = Number(record.reference_year);
        const recordQuarter = record.reference_quarter;
        const volume = Number(record.volume_produced);
        if (!Number.isFinite(year) || !QUARTERS.includes(recordQuarter) || !Number.isFinite(volume)) return;
        const row = rows.get(year) || { year };
        row[recordQuarter] = (row[recordQuarter] || 0) + volume;
        rows.set(year, row);
      });
    } else {
      (data?.geo_records || []).forEach((record) => {
        if (record.location !== selectedLocation) return;
        const year = Number(record.reference_year);
        const recordQuarter = record.reference_quarter;
        const volume = Number(record.volume_produced);
        if (!Number.isFinite(year) || !QUARTERS.includes(recordQuarter) || !Number.isFinite(volume)) return;
        const row = rows.get(year) || { year };
        row[recordQuarter] = (row[recordQuarter] || 0) + volume;
        rows.set(year, row);
      });
    }
    return [...rows.values()].sort((a, b) => a.year - b.year);
  }, [data?.records, data?.geo_records, selectedLocation]);

  const seasonalStats = useMemo(() => {
    if (selectedLocation === "all") {
      return {
        seasonalAvg: summaryProfile?.average_production_mt,
        grandAvg: data?.grand_average_quarterly_mt,
      };
    }
    const matchingGeo = (data?.geo_records || []).filter(
      (r) => r.location === selectedLocation && Number.isFinite(Number(r.volume_produced))
    );
    const seasonGeo = quarter ? matchingGeo.filter((r) => r.reference_quarter === quarter) : matchingGeo;
    const seasonAvg = seasonGeo.length > 0
      ? seasonGeo.reduce((sum, r) => sum + Number(r.volume_produced), 0) / seasonGeo.length
      : null;

    const qAverages = QUARTERS.map((q) => {
      const qRecords = matchingGeo.filter((r) => r.reference_quarter === q);
      return qRecords.length > 0
        ? qRecords.reduce((sum, r) => sum + Number(r.volume_produced), 0) / qRecords.length
        : 0;
    });
    const grandAvg = qAverages.some((v) => v > 0)
      ? qAverages.reduce((sum, v) => sum + v, 0) / 4
      : null;

    return {
      seasonalAvg: seasonAvg,
      grandAvg,
    };
  }, [selectedLocation, data?.geo_records, quarter, summaryProfile, data?.grand_average_quarterly_mt]);

  const pieData = useMemo(() => {
    return (data?.source_areas || []).map((area) => ({
      name: area.name,
      value: Number(area.value),
      total_production_mt: Number(area.total_production_mt),
    }));
  }, [data?.source_areas]);

  const records = (data?.records || [])
    .filter((record) => (!quarter || record.reference_quarter === quarter) && record.volume_produced != null)
    .map((record) => ({
      year: String(record.reference_year),
      quarter: record.reference_quarter,
      production: Number(record.volume_produced),
      geo: geoRecords[String(record.reference_year)] || {},
    }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className={`${CARD_CLASS} p-3 sm:p-4 md:p-5`}>
        <h2 className="text-[11px] sm:text-[12px] font-bold text-[var(--hw-neutral-800)] uppercase tracking-wider mb-2 sm:mb-2.5">Filters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
          <div>
            <span className="block text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">Commodity</span>
            <SearchableCombobox
              categories={categories}
              value={commodity}
              onChange={onCommodityChange}
            />
          </div>
          <div>
            <span className="block text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-700)] mb-1">Harvest season</span>
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {QUARTERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={quarter === value}
                  onClick={() => setQuarter((current) => current === value ? null : value)}
                  className={`px-2 py-1.5 sm:px-3 sm:py-2 text-[11.5px] sm:text-[12px] font-semibold rounded-lg border text-center transition-colors ${
                    quarter === value
                      ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]"
                      : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)]"
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
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 sm:p-4 text-xs sm:text-sm text-red-700">
          Historical seasonal production could not be loaded. Please try again later.
        </div>
      )}

      {query.isLoading && (
        <div className={`${CARD_CLASS} p-6 sm:p-8 text-center text-xs sm:text-sm text-[var(--hw-neutral-600)]`}>
          Loading historical seasonal production…
        </div>
      )}

      {!query.isLoading && !query.isError && commodityRef && !hasData && (
        <div className={`${CARD_CLASS} p-6 sm:p-8 text-center`}>
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--hw-neutral-800)]">No historical production data available</p>
          <p className="mt-1 text-xs sm:text-sm text-[var(--hw-neutral-600)]">
            {data?.message || `No PSA seasonal records are available for ${commodity} in ${quarter}.`}
          </p>
        </div>
      )}

      {hasData && (
        <>
          <section className={`${CARD_CLASS} p-3.5 sm:p-5 md:p-6 space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
              <div>
                <h2 className="text-[14px] sm:text-[15px] font-bold text-[var(--hw-neutral-900)]">Historical production by season</h2>
                <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                  {selectedLocation === "all"
                    ? `Backend quarterly averages across ${commodity} production records · MT`
                    : `Historical production for ${selectedLocation} · MT`}
                </p>
              </div>
              {locations.length > 0 && (
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <label htmlFor="dftc-source-filter" className="text-[11.5px] sm:text-[12px] font-semibold text-[var(--hw-neutral-600)] whitespace-nowrap">
                    Source:
                  </label>
                  <select
                    id="dftc-source-filter"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className="text-[11.5px] sm:text-[12px] font-medium text-[var(--hw-neutral-800)] bg-white border border-[var(--hw-neutral-200)] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--hw-green-600)] shadow-xs"
                  >
                    <option value="all">All Locations (Overall)</option>
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin]">
              <div style={{ minWidth: isMobile ? Math.max(560, chartData.length * 56) : "100%" }}>
                <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
              <BarChart data={chartData} margin={{ top: 12, right: isMobile ? 8 : 12, bottom: 4, left: isMobile ? -12 : 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--hw-neutral-100)" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 11 }} />
                <YAxis tickFormatter={(value) => Number(value).toLocaleString()} tick={{ fontSize: isMobile ? 10 : 11 }} width={isMobile ? 44 : 60} />
                <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()} MT`, name]} />
                {chartQuarters.map((chartQuarter) => {
                  const profile = profiles.find((item) => item.quarter === chartQuarter);
                  return <Bar key={chartQuarter} dataKey={chartQuarter} name={chartQuarter} fill={getClassificationColor(profile?.classification)} radius={[6, 6, 0, 0]} />;
                })}
              </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 mt-2 justify-center text-[10.5px] sm:text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#16a34a]" />
                <span className="font-medium text-[var(--hw-neutral-700)]">Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#eab308]" />
                <span className="font-medium text-[var(--hw-neutral-700)]">Lower Middle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#ea580c]" />
                <span className="font-medium text-[var(--hw-neutral-700)]">Upper Middle</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#dc2626]" />
                <span className="font-medium text-[var(--hw-neutral-700)]">High</span>
              </div>
            </div>

            {/* In-card seasonal summary stat tiles (Farmer View Basis style) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 pt-3 border-t border-[var(--hw-neutral-100)] mt-3">
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Selected season
                </p>
                <p className="sm:mt-1 text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black leading-tight">
                  {quarter ? `${quarter} · ${QUARTER_NAMES[quarter]}` : "All seasons"}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Historical seasonal average
                </p>
                <p className="sm:mt-1 text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black leading-tight">
                  {seasonalStats.seasonalAvg == null
                    ? "—"
                    : `${Number(seasonalStats.seasonalAvg).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT`}
                </p>
              </div>
              <div className="flex sm:flex-col items-center sm:items-start justify-between rounded-xl bg-[var(--hw-neutral-50)] px-3 py-2.5 sm:p-3 border border-[var(--hw-neutral-100)]">
                <p className="text-[12px] sm:text-[11px] font-semibold uppercase tracking-tight text-black leading-tight">
                  Grand average production
                </p>
                <p className="sm:mt-1 text-[13px] sm:text-[14px] md:text-[15px] font-bold text-black leading-tight">
                  {seasonalStats.grandAvg != null
                    ? `${Number(seasonalStats.grandAvg).toLocaleString(undefined, { maximumFractionDigits: 2 })} MT`
                    : "—"}
                </p>
              </div>
            </div>
            <p className="text-[10.5px] sm:text-[11px] text-[var(--hw-neutral-500)] text-center pt-1">
              {data.source || "PSA OpenSTAT"} · {data.years_covered || "historical records"}
            </p>
          </section>

          {pieData.length > 0 && (
            <section className={`${CARD_CLASS} p-3.5 sm:p-5 md:p-6 space-y-3`}>
              <div>
                <h2 className="text-[14px] sm:text-[15px] font-bold text-[var(--hw-neutral-900)]">
                  Major Production Sources
                </h2>
                <p className="text-[11.5px] sm:text-[12px] text-[var(--hw-neutral-500)] mt-0.5">
                  Share of production volume from regional source areas (Bukidnon, Davao del Sur, City of Davao)
                </p>
              </div>
              <ProductionSourcePieChart data={pieData} height={260} />
            </section>
          )}

          <section className={`${CARD_CLASS} overflow-hidden`}>
            <div className="border-b border-[var(--hw-neutral-100)] px-3.5 sm:px-5 py-3 sm:py-4">
              <h2 className="text-[13px] sm:text-[14px] font-bold text-[var(--hw-neutral-900)]">
                {quarter ? `${quarter} historical records` : "All historical records"} · {commodity}
              </h2>
            </div>
            <div className="overflow-x-auto [scrollbar-width:thin] touch-pan-x">
              <table className="w-full min-w-[540px] text-[12px]">
                <thead className="bg-[var(--hw-neutral-50)] text-left uppercase tracking-wider text-[var(--hw-neutral-600)]">
                  <tr>
                    <th className="px-3.5 sm:px-5 py-2.5 sm:py-3 whitespace-nowrap">Year</th>
                    {locations.map((location) => (
                      <th key={location} className="px-3.5 sm:px-5 py-2.5 sm:py-3 whitespace-nowrap">{location}</th>
                    ))}
                    <th className="px-3.5 sm:px-5 py-2.5 sm:py-3 whitespace-nowrap">Production</th>
                    <th className="px-3.5 sm:px-5 py-2.5 sm:py-3 whitespace-nowrap">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {records.map((record) => (
                    <tr key={`${record.year}-${record.quarter}`}>
                      <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 font-medium text-[var(--hw-neutral-800)] whitespace-nowrap">{record.year}</td>
                      {locations.map((location) => (
                        <td key={location} className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">
                          {record.geo[location] == null
                            ? "—"
                            : `${record.geo[location].toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })} MT`}
                        </td>
                      ))}
                      <td className="px-3.5 sm:px-5 py-2.5 sm:py-3 text-[var(--hw-neutral-800)] whitespace-nowrap">{record.production.toLocaleString()} MT</td>
                      <td className={`px-3.5 sm:px-5 py-2.5 sm:py-3 font-semibold whitespace-nowrap ${getClassificationTextColor(summaryProfile?.classification)}`}>{summaryProfile?.classification || "—"}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={locations.length + 3} className="px-4 py-8 sm:py-10 text-center text-xs sm:text-sm text-[var(--hw-neutral-500)]">
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
