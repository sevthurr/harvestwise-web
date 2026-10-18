import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Leaf } from "lucide-react";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { useLanguage } from "../../global/contexts/LanguageContext";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];
const LEVEL_CLASS = {
  High: "text-amber-700",
  Moderate: "text-blue-700",
  Low: "text-emerald-700",
};

function quarterForDate(dateValue) {
  const date = dateValue
    ? new Date(`${String(dateValue).slice(0, 10)}T12:00:00`)
    : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return `Q${Math.floor(validDate.getMonth() / 3) + 1}`;
}

function normalizeProductionLevel(value) {
  const level = String(value || "").toLowerCase().replace(/[-_]/g, " ").trim();
  if (level === "high") return "High";
  if (level === "low") return "Low";
  if (level === "moderate" || level === "normal" || level.includes("middle")) return "Moderate";
  return null;
}

function formatMt(value) {
  return value == null ? "—" : `${Number(value).toLocaleString()} MT`;
}

function CropSeasonalProductionDetailsPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { crops = [], loading: cropsLoading } = useCrops();
  const crop = crops.find((item) => item.id === cropId);
  const [selectedQuarter, setSelectedQuarter] = useState(null);
  const quarter = selectedQuarter || quarterForDate(crop?.harvestDate || crop?.plantingDate);
  const commodityId = crop?.commodityId || crop?.commodity;
  const productionQuery = useQuery({
    queryKey: ["farmer", "seasonal-production", commodityId, quarter],
    queryFn: () => analyticsApi.getHistoricalSeasonalProduction(commodityId, quarter),
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 30,
  });

  if (cropsLoading) {
    return <div className="px-4 py-8 text-sm text-[var(--hw-neutral-600)]">Loading crop details…</div>;
  }
  if (!crop) {
    return (
      <div className="px-4 py-8 text-center space-y-3">
        <p className="text-[var(--hw-neutral-900)]">Crop not found.</p>
        <button onClick={() => navigate("/farmer/crops")} className="text-sm font-medium text-[var(--hw-green-700)]">
          My Crops
        </button>
      </div>
    );
  }

  const data = productionQuery.data;
  const selectedProfile = data?.quarterly_profiles?.find((profile) => profile.quarter === quarter);
  const hasData = data?.status === "processed"
    && (selectedProfile?.years_available ?? 0) > 0
    && selectedProfile?.average_production_mt != null;
  const level = hasData ? normalizeProductionLevel(selectedProfile.classification) : null;
  const historicalAverage = hasData ? Number(selectedProfile.average_production_mt) : null;
  const overallAverage = hasData && data.grand_average_quarterly_mt != null
    ? Number(data.grand_average_quarterly_mt)
    : null;
  const difference = historicalAverage != null && overallAverage != null
    ? historicalAverage - overallAverage
    : null;
  const differencePercent = difference != null && overallAverage > 0
    ? (difference / overallAverage) * 100
    : null;
  const quarterRecords = (data?.records || [])
    .filter((record) => record.reference_quarter === quarter && record.volume_produced != null)
    .map((record) => ({
      year: String(record.reference_year),
      production_mt: Number(record.volume_produced),
    }))
    .sort((a, b) => Number(a.year) - Number(b.year));
  const quarterlyComparison = (data?.quarterly_profiles || [])
    .filter((profile) => profile.years_available > 0 && profile.average_production_mt != null)
    .map((profile) => ({
      quarter: profile.quarter,
      average_production_mt: Number(profile.average_production_mt),
      years_available: profile.years_available,
    }));
  const latestQuarterRecord = quarterRecords.at(-1);
  const classificationLabel = level
    ? t(`farmer.cropCycle.supply_${level.toLowerCase()}`, {}, level)
    : t("farmer.cropCycle.no_production_data", {}, "No Data");
  const interpretation = level === "High"
    ? "Production is historically higher during this period. Increased supply may affect market prices."
    : level === "Low"
      ? "Production is historically lower during this period, which may reduce seasonal supply pressure."
      : level === "Moderate"
        ? "Production during this period is near its historical seasonal average."
        : "No historical production data available for this period.";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <Breadcrumb items={[
        { label: "My Crops", onClick: () => navigate("/farmer/crops") },
        { label: crop.commodityName, onClick: () => navigate(`/farmer/crops/${crop.id}`) },
        { label: "Seasonal production" },
      ]} />

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--hw-green-700)]">
          <Leaf className="w-5 h-5" />
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)]">
            {crop.commodityName} seasonal production
          </h1>
        </div>
        <p className="text-[14px] text-[var(--hw-neutral-600)]">
          Historical PSA OpenSTAT records · {data?.years_covered || "seasonal history"}
        </p>
      </header>

      {productionQuery.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Historical production data could not be loaded. Please try again later.
        </div>
      )}

      <section className="flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm font-medium text-[var(--hw-neutral-700)]">Selected harvest season:</p>
        {QUARTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSelectedQuarter(item)}
            aria-pressed={quarter === item}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
              quarter === item
                ? "border-[var(--hw-green-700)] bg-[var(--hw-green-700)] text-white"
                : "border-[var(--hw-neutral-200)] bg-white text-[var(--hw-neutral-700)]"
            }`}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-2">
        <p className={`text-base font-bold ${level ? LEVEL_CLASS[level] : "text-[var(--hw-neutral-500)]"}`}>
          {productionQuery.isLoading ? "Loading seasonal production…" : `Production level: ${classificationLabel}`}
        </p>
        <p className="text-sm text-[var(--hw-neutral-700)] leading-relaxed">
          {productionQuery.isLoading ? "Loading historical production records." : interpretation}
        </p>
        {!productionQuery.isLoading && !hasData && data?.message && (
          <p className="text-xs text-[var(--hw-neutral-500)]">{data.message}</p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Selected-season historical average", formatMt(historicalAverage)],
          ["Overall quarterly average", formatMt(overallAverage)],
          ["Difference from average", difference == null ? "—" : `${difference > 0 ? "+" : ""}${Number(difference).toLocaleString()} MT${differencePercent == null ? "" : ` (${differencePercent > 0 ? "+" : ""}${differencePercent.toFixed(1)}%)`}`],
          ["Latest recorded season", latestQuarterRecord ? `${formatMt(latestQuarterRecord.production_mt)} · ${latestQuarterRecord.year}` : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5">
            <p className="text-xs text-[var(--hw-neutral-600)]">{label}</p>
            <p className="mt-1 text-base font-bold text-[var(--hw-neutral-900)]">{value}</p>
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--hw-neutral-900)]">Historical production by year · {quarter}</h2>
          <p className="text-xs text-[var(--hw-neutral-600)]">Annual records for the selected quarter, compared with its historical average.</p>
        </div>
        {productionQuery.isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">Loading production history…</p>
        ) : quarterRecords.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">No historical production data available for this season.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterRecords} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                <XAxis dataKey="year" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} tickLine={false} />
                <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} tickLine={false} width={64} tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip formatter={(value) => [formatMt(value), "Production"]} labelFormatter={(year) => `Year ${year}`} />
                {historicalAverage != null && (
                  <ReferenceLine y={historicalAverage} stroke="#D97706" strokeDasharray="5 4" label={{ value: "Seasonal average", fill: "#92400E", fontSize: 10 }} />
                )}
                <Bar dataKey="production_mt" name="Production" fill="#78A943" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--hw-neutral-900)]">Seasonal comparison</h2>
          <p className="text-xs text-[var(--hw-neutral-600)]">Multi-year average production by quarter. The selected harvest season is highlighted.</p>
        </div>
        {productionQuery.isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">Loading seasonal comparison…</p>
        ) : quarterlyComparison.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">No historical production data available.</p>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={quarterlyComparison} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                <XAxis dataKey="quarter" tick={{ fill: "var(--hw-neutral-500)", fontSize: 11 }} tickLine={false} />
                <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} tickLine={false} width={64} tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip formatter={(value) => [formatMt(value), "Average production"]} />
                <Bar dataKey="average_production_mt" name="Average production" radius={[4, 4, 0, 0]}>
                  {quarterlyComparison.map((item) => (
                    <Cell key={item.quarter} fill={item.quarter === quarter ? "#245501" : "#AAD576"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[11px] text-[var(--hw-neutral-500)]">
          Source: {data?.source || "PSA OpenSTAT"}{data?.source_commodity_id ? ` · Production series: ${data.source_commodity_id}` : ""}
        </p>
      </section>
    </div>
  );
}

export default CropSeasonalProductionDetailsPage;
