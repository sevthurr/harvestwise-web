import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ChevronLeft,
  AlertTriangle,
  Upload,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";
const ALL_SOURCES = [];
const STATUS_TEXT = {
  Updated: "text-emerald-700",
  "Requires Review": "text-amber-700",
  Failed: "text-red-600"
};
const PAGE_SIZE = 20;
const COMMODITY_VARIANT_MAP = {
  "Kamatis": "Diamante Big",
  "Talong": "Banate King",
  "Repolyo": "Wakamini",
  "Carrots": "Big",
  "Atsal": "Smooth Cayene",
  "Sitaw": "",
  "Ampalaya": "Galaxy"
};
function getMockRecords(sourceId, page) {
  const COMMODITIES = ["Kamatis", "Talong", "Repolyo", "Carrots", "Atsal", "Sitaw", "Ampalaya"];
  const offset = (page - 1) * PAGE_SIZE;
  switch (sourceId) {
    case "bangk-retail": {
      const total = 140;
      return {
        headers: ["Date", "Commodity", "Variety", "Price (\u20B1/kg)"],
        total,
        rows: Array.from({ length: Math.min(PAGE_SIZE, total - offset) }, (_, i) => {
          const comm = COMMODITIES[(offset + i) % COMMODITIES.length];
          return {
            Date: "Jun 24, 2026",
            Commodity: comm,
            Variety: COMMODITY_VARIANT_MAP[comm] || "\u2014",
            "Price (\u20B1/kg)": `\u20B1${(55 + (offset + i) * 7 % 90).toFixed(2)}`
          };
        })
      };
    }
    case "dftc-retail": {
      const total = 57;
      return {
        headers: ["Date", "Commodity", "Variety", "Price (\u20B1/kg)"],
        total,
        rows: Array.from({ length: Math.min(PAGE_SIZE, total - offset) }, (_, i) => {
          const comm = COMMODITIES[(offset + i) % COMMODITIES.length];
          return {
            Date: "Jun 24, 2026",
            Commodity: comm,
            Variety: COMMODITY_VARIANT_MAP[comm] || "\u2014",
            "Price (\u20B1/kg)": `\u20B1${(50 + (offset + i) * 9 % 80).toFixed(2)}`
          };
        })
      };
    }
    case "dftc-wholesale": {
      const total = 88;
      return {
        headers: ["Date", "Commodity", "Variety", "Wholesale Price (\u20B1/kg)"],
        total,
        rows: Array.from({ length: Math.min(PAGE_SIZE, total - offset) }, (_, i) => {
          const comm = COMMODITIES[(offset + i) % COMMODITIES.length];
          return {
            Date: "Jun 24, 2026",
            Commodity: comm,
            Variety: COMMODITY_VARIANT_MAP[comm] || "\u2014",
            "Wholesale Price (\u20B1/kg)": `\u20B1${(40 + (offset + i) * 6 % 60).toFixed(2)}`
          };
        })
      };
    }
    case "dftc-arrivals": {
      const total = 70;
      return {
        headers: ["Week Ending", "Commodity", "Variety", "Volume (MT)"],
        total,
        rows: Array.from({ length: Math.min(PAGE_SIZE, total - offset) }, (_, i) => {
          const comm = COMMODITIES[(offset + i) % COMMODITIES.length];
          return {
            "Week Ending": "Jun 21, 2026",
            Commodity: comm,
            Variety: COMMODITY_VARIANT_MAP[comm] || "\u2014",
            "Volume (MT)": `${(2.5 + (offset + i) * 1.3 % 15).toFixed(1)}`
          };
        })
      };
    }
    case "psa": {
      const total = 3200;
      return {
        headers: ["Quarter", "Commodity", "Region", "Volume (MT)"],
        total,
        rows: Array.from({ length: PAGE_SIZE }, (_, i) => ({
          Quarter: `Q${1 + (offset + i) % 4} 2025`,
          Commodity: COMMODITIES[(offset + i) % COMMODITIES.length],
          Region: "Davao Region",
          "Volume (MT)": `${120 + (offset + i) * 11 % 300}`
        }))
      };
    }
    case "gcal":
    case "local-evt": {
      const total = 22;
      const names = ["Independence Day", "Labor Day", "Ninoy Aquino Day", "National Heroes Day", "Bonifacio Day", "Christmas Day", "Rizal Day", "Araw ng Kagitingan", "Immaculate Conception", "New Year's Day"];
      return {
        headers: ["Event", "Date", "Type"],
        total,
        rows: Array.from({ length: Math.min(PAGE_SIZE, total - offset) }, (_, i) => ({
          Event: names[(offset + i) % names.length],
          Date: `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(offset + i) % 12]} ${1 + (offset + i) * 7 % 28}, 2026`,
          Type: "National Holiday"
        }))
      };
    }
    default: {
      return { headers: ["Date", "Value"], total: 0, rows: [] };
    }
  }
}
function AdminDataSourceDetail() {
  const { sourceId } = useParams();
  const navigate = useNavigate();
  const [showRecords, setShowRecords] = useState(false);
  const [recordPage, setRecordPage] = useState(1);
  const source = ALL_SOURCES.find((s) => s.sourceId === sourceId);
  if (!source) {
    return <div className="px-4 py-16 text-center space-y-3">
        <p className="text-[var(--hw-neutral-800)]">Data source not found.</p>
        <button
      onClick={() => navigate("/admin/data-sources")}
      className="text-[var(--hw-green-700)] text-[13px] font-medium hover:underline"
    >
          ← Back to Data Sources
        </button>
      </div>;
  }
  const statusColor = STATUS_TEXT[source.status];
  const btnPrimary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors";
  const btnSecondary = "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] transition-colors";
  const records = getMockRecords(source.sourceId, recordPage);
  const totalPages = Math.ceil(records.total / PAGE_SIZE);
  return <div className="px-4 md:px-8 lg:px-10 py-5">
      <div className="max-w-[900px] mx-auto space-y-5">

        {
    /* Back + header */
  }
        <div>
          <button
    onClick={() => navigate("/admin/data-sources")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors mb-4"
  >
            <ChevronLeft className="w-4 h-4" />Back to Data Sources
          </button>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-[20px] font-bold text-[var(--hw-neutral-900)]">{source.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[12px] text-[var(--hw-neutral-800)]">{source.sourceType}</span>
                <span className="text-[var(--hw-neutral-300)]">·</span>
                <span className={`text-[13px] font-semibold ${statusColor}`}>{source.status}</span>
              </div>
            </div>
          </div>
        </div>

        {
    /* Issue banner */
  }
        {source.latestIssue && <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-semibold text-amber-700 uppercase tracking-wide mb-0.5">Latest issue</p>
              <p className="text-[13px] text-amber-700 leading-relaxed">{source.latestIssue}</p>
            </div>
          </div>}

        {
    /* Overview */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Overview</p>
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "ID", value: source.id || "-" },
    { label: "Source type", value: source.sourceType || "-" },
    { label: "Used by", value: source.relatedModule || "-" },
    { label: "Update frequency", value: source.updateFrequency || "-" },
    { label: "Last successful update", value: source.lastSuccessfulUpdate || "-", highlight: !!source.lastSuccessfulUpdate }
  ].map((row) => <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="text-[13px] text-[var(--hw-neutral-800)]">{row.label}</p>
                <p className={`text-[13px] font-medium text-right ${"highlight" in row && row.highlight ? "text-[var(--hw-green-700)]" : "text-[var(--hw-neutral-800)]"}`}>
                  {row.value}
                </p>
              </div>)}
          </div>
        </div>

        {
    /* Records summary */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Records</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--hw-neutral-100)]">
            {[
    { label: source.isApi ? "Fetched" : "Uploaded", value: source.recordsFetched != null ? source.recordsFetched : 0 },
    { label: "Imported", value: source.recordsImported != null ? source.recordsImported : 0 },
    { label: "Accepted", value: source.recordsAccepted != null ? source.recordsAccepted : 0, color: "text-emerald-700" },
    { label: "Rejected", value: source.recordsRejected != null ? source.recordsRejected : 0, color: (source.recordsRejected || 0) > 0 ? "text-red-600" : void 0 }
  ].map((s) => <div key={s.label} className="px-4 py-4 text-center">
                <p className="text-[12px] text-[var(--hw-neutral-700)] mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${"color" in s && s.color ? s.color : "text-[var(--hw-neutral-900)]"}`}>
                  {s.value.toLocaleString()}
                </p>
              </div>)}
          </div>

          {
    /* View Records expandable */
  }
          <div className="border-t border-[var(--hw-neutral-100)]">
              <button
    onClick={() => {
      setShowRecords((v) => !v);
      setRecordPage(1);
    }}
    className="w-full flex items-center justify-between px-5 py-3 text-[13px] font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
                <span>View Records</span>
                {showRecords ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showRecords && (records.total === 0 ? <div className="px-5 py-8 text-center text-[13px] text-[var(--hw-neutral-500)] border-t border-[var(--hw-neutral-100)]">
                  No records available.
                </div> : <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-[var(--hw-neutral-50)] border-b border-[var(--hw-neutral-100)]">
                          {records.headers.map((h) => <th key={h} className="px-4 py-2.5 text-left font-semibold text-[var(--hw-neutral-800)] whitespace-nowrap">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                        {records.rows.map((row, i) => <tr key={i} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                            {records.headers.map((h) => <td key={h} className="px-4 py-2.5 text-[var(--hw-neutral-700)] whitespace-nowrap">{row[h]}</td>)}
                          </tr>)}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--hw-neutral-100)]">
                      <p className="text-[12px] text-[var(--hw-neutral-700)]">
                        Showing {Math.min((recordPage - 1) * PAGE_SIZE + 1, records.total)}–{Math.min(recordPage * PAGE_SIZE, records.total)} of {records.total.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
    onClick={() => setRecordPage((p) => Math.max(1, p - 1))}
    disabled={recordPage === 1}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors"
  >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[12px] text-[var(--hw-neutral-800)] px-2 font-medium">
                          {recordPage} / {totalPages}
                        </span>
                        <button
    onClick={() => setRecordPage((p) => Math.min(totalPages, p + 1))}
    disabled={recordPage === totalPages}
    className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] disabled:opacity-40 transition-colors"
  >
                          <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    </div>}
                </div>)}
            </div>
        </div>

        {
    /* Current status */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--hw-neutral-100)]">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Current status</p>
          </div>
          <div className="px-5 py-4">
            <p className={`font-semibold ${statusColor || "text-[var(--hw-neutral-600)]"}`}>{source.status || "Not yet updated"}</p>
            <p className="text-[13px] text-[var(--hw-neutral-800)] mt-1 leading-relaxed">
              {source.status === "Updated" && (source.isApi ? "Connection is active. Data retrieval is running as expected." : "Latest data has been successfully imported and is ready for use.")}
              {source.status === "Requires Review" && "Data was partially imported. Some records failed validation and were not accepted."}
              {source.status === "Failed" && "Last sync attempt failed. No new data was retrieved. Manual retry recommended."}
              {!["Updated", "Requires Review", "Failed"].includes(source.status) && "No processing history is available yet."}
            </p>
          </div>
        </div>

        {
    /* Actions */
  }
        <div className="flex flex-wrap gap-2.5">
          {source.isApi ? <>
              
              <button onClick={() => navigate("/admin/history")} className={btnSecondary}>
                <Clock className="w-4 h-4" />View Sync History
              </button>
            </> : <>
              <button onClick={() => navigate("/admin/data-sources")} className={btnPrimary}>
                <Upload className="w-4 h-4" />Import Data
              </button>
              <button onClick={() => navigate("/admin/history")} className={btnSecondary}>
                <Clock className="w-4 h-4" />View Import History
              </button>
            </>}
          
        </div>

      </div>
    </div>;
}
export {
  AdminDataSourceDetail as default
};
