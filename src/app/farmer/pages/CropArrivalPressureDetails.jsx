import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package } from "lucide-react";
import * as analyticsApi from "../../../services/api/analyticsApi";
import { useCrops } from "../components/crops/CropsContext";
import { Breadcrumb } from "../components/shared/Breadcrumb";
import { useLanguage } from "../../global/contexts/LanguageContext";

const SUPPLY_LEVEL_CLASS = {
  High: "text-amber-700",
  Moderate: "text-blue-700",
  Low: "text-emerald-700",
};

function normalizeSupplyLevel(value) {
  const level = String(value || "").toLowerCase().replace(/[-_]/g, " ").trim();
  if (level === "high") return "High";
  if (level === "low") return "Low";
  if (level === "normal" || level === "moderate" || level.includes("middle")) return "Moderate";
  return null;
}

function formatKg(value) {
  return value == null ? "—" : `${Number(value).toLocaleString()} kg`;
}

export function ArrivalVolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const record = payload[0]?.payload;
  if (!record) return null;

  return (
    <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 border-b border-[var(--hw-neutral-100)] pb-1.5 font-semibold text-[var(--hw-neutral-800)]">{label}</p>
      <p className="font-semibold text-[var(--hw-neutral-900)]">Arrival volume: {formatKg(record.volume_kg)}</p>
      <div className="mt-1 space-y-0.5 text-[var(--hw-neutral-700)]">
        <p>Farm source: {record.farm_source_volume_kg == null ? "Not reported" : formatKg(record.farm_source_volume_kg)}</p>
        <p>Other sources: {record.other_source_volume_kg == null ? "Not reported" : formatKg(record.other_source_volume_kg)}</p>
      </div>
    </div>
  );
}

function CropArrivalPressureDetailsPage() {
  const { cropId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { crops = [], loading: cropsLoading } = useCrops();
  const crop = crops.find((item) => item.id === cropId);
  const commodityId = crop?.commodityId || crop?.commodity;
  const arrivalQuery = useQuery({
    queryKey: ["farmer", "arrival-pressure", commodityId],
    queryFn: () => analyticsApi.getArrivalPressure(commodityId),
    enabled: Boolean(commodityId),
    staleTime: 1000 * 60 * 5,
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

  const data = arrivalQuery.data;
  const records = [...(data?.records || [])]
    .filter((record) => record.arrival_date && record.volume_kg != null)
    .sort((a, b) => a.arrival_date.localeCompare(b.arrival_date));
  const level = data?.status === "processed" && records.length
    ? normalizeSupplyLevel(data.classification)
    : null;
  const chartData = records.map((record) => ({
    date: record.arrival_date,
    volume_kg: Number(record.volume_kg),
    farm_source_volume_kg: record.farm_source_volume_kg == null ? null : Number(record.farm_source_volume_kg),
    other_source_volume_kg: record.other_source_volume_kg == null ? null : Number(record.other_source_volume_kg),
    average_kg: data.average_arrival_kg == null ? undefined : Number(data.average_arrival_kg),
  }));
  const latestRecord = records.at(-1);
  const isStale = data?.data_is_stale === true;
  const classificationLabel = level
    ? t(`farmer.cropCycle.supply_${level.toLowerCase()}`, {}, level)
    : t("farmer.cropCycle.no_arrival_data", {}, "No Data");
  const interpretation = level === "High"
    ? "Arrivals are above the usual range. Higher supply may place downward pressure on prices."
    : level === "Low"
      ? "Arrivals are below the usual range. Lower supply may ease near-term pressure on prices."
      : level === "Moderate"
        ? "Arrivals are near their usual range, with no strong supply pressure indicated."
        : "No arrival data available for this crop.";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <Breadcrumb items={[
        { label: "My Crops", onClick: () => navigate("/farmer/crops") },
        { label: crop.commodityName, onClick: () => navigate(`/farmer/crops/${crop.id}`) },
        { label: "Arrival pressure" },
      ]} />

      <header className="space-y-1">
        <div className="flex items-center gap-2 text-[var(--hw-green-700)]">
          <Package className="w-5 h-5" />
          <h1 className="text-[22px] md:text-3xl font-bold text-[var(--hw-neutral-900)]">
            {crop.commodityName} arrival pressure
          </h1>
        </div>
        <p className="text-[14px] text-[var(--hw-neutral-600)]">
          {data?.source || "DFTC Arrival Volume"} · Checks the latest {data?.lookback_days ?? 90} days, with older records shown when recent data is unavailable
        </p>
      </header>

      {arrivalQuery.isError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Arrival data could not be loaded. Please try again later.
        </div>
      )}

      <section className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <p className={`text-base font-bold ${level ? SUPPLY_LEVEL_CLASS[level] : "text-[var(--hw-neutral-500)]"}`}>
          {arrivalQuery.isLoading ? "Loading arrival pressure…" : `Arrival pressure: ${classificationLabel}`}
        </p>
        <p className="text-sm text-[var(--hw-neutral-700)] leading-relaxed">
          {arrivalQuery.isLoading ? "Loading actual arrival records." : interpretation}
        </p>
        {data?.status === "unavailable" && data.message && (
          <p className="text-xs text-[var(--hw-neutral-500)]">{data.message}</p>
        )}
        {isStale && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {t("farmer.cropCycle.arrival_stale_notice", {}, "The latest available arrival records are older than 90 days.")}
          </p>
        )}
        {data?.warnings?.map((warning) => (
          <p key={warning} className="text-xs text-[var(--hw-neutral-500)]">{warning}</p>
        ))}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          ["Recent arrival volume (7 days)", data?.recent_arrival_kg != null ? formatKg(data.recent_arrival_kg) : "—"],
          ["Latest recorded arrival", latestRecord ? formatKg(latestRecord.volume_kg) : "—"],
          ["Historical average arrival", data?.average_arrival_kg != null ? formatKg(data.average_arrival_kg) : "—"],
          ["Total observed volume", data?.total_volume_kg != null && records.length ? formatKg(data.total_volume_kg) : "—"],
          ["Arrival records", records.length ? Number(data.record_count).toLocaleString() : "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3.5">
            <p className="text-xs text-[var(--hw-neutral-600)]">{label}</p>
            <p className="mt-1 text-base font-bold text-[var(--hw-neutral-900)]">{value}</p>
            {label === "Latest recorded arrival" && latestRecord && (
              <p className="mt-0.5 text-[11px] text-[var(--hw-neutral-500)]">{latestRecord.arrival_date}</p>
            )}
          </div>
        ))}
      </section>

      <section className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--hw-neutral-900)]">Historical arrival volume</h2>
          <p className="text-xs text-[var(--hw-neutral-600)]">Recorded DFTC arrival volume in kilograms. The dashed line is the historical average.</p>
        </div>
        {arrivalQuery.isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">Loading arrival history…</p>
        ) : chartData.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--hw-neutral-600)]">No arrival data available for this crop.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--hw-neutral-100)" />
                <XAxis dataKey="date" tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: "var(--hw-neutral-500)", fontSize: 10 }} tickLine={false} width={64} tickFormatter={(value) => Number(value).toLocaleString()} />
                <Tooltip content={<ArrivalVolumeTooltip />} />
                {data?.average_arrival_kg != null && (
                  <ReferenceLine
                    y={Number(data.average_arrival_kg)}
                    stroke="#D97706"
                    strokeDasharray="5 4"
                    label={{ value: "Historical average", fill: "#92400E", fontSize: 10 }}
                  />
                )}
                <Line type="monotone" dataKey="volume_kg" name="Arrival volume" stroke="#245501" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="text-[11px] text-[var(--hw-neutral-500)]">
          Source: {data?.source || "DFTC Arrival Volume"} · Commodity: {data?.commodity_name || crop.commodityName}
        </p>
      </section>
    </div>
  );
}

export default CropArrivalPressureDetailsPage;
