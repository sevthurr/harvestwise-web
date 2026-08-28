import { useParams, useNavigate } from "react-router";
import { ChevronLeft, Leaf, AlertCircle } from "lucide-react";
import { TEMP_RECORDS, getExpiryInfo, formatDate } from "./dftc-temp-records-data";
function DFTCTemporaryRecordDetail() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const record = TEMP_RECORDS.find((r) => r.recordId === recordId);
  if (!record) {
    return <div className="px-4 py-8 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-8 h-8 text-[var(--hw-neutral-400)]" />
        <p className="font-semibold text-[var(--hw-neutral-800)]">Record not found</p>
        <button
      onClick={() => navigate("/dftc/temporary-records")}
      className="text-[13px] font-medium text-[var(--hw-green-700)] hover:opacity-70"
    >
          Back to Temporary Market Records
        </button>
      </div>;
  }
  const expiry = getExpiryInfo(record.storageExpiryDate);
  const dlStatusCls = (s) => {
    if (s === "Included") return "text-emerald-700";
    if (s === "Previously Downloaded") return "text-[var(--hw-neutral-800)]";
    return "text-[var(--hw-neutral-700)]";
  };
  const DetailRow = ({ label, value, valueCls = "" }) => <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-2.5 border-b border-[var(--hw-neutral-100)] last:border-0">
      <span className="text-[12px] font-medium text-[var(--hw-neutral-800)] sm:w-56 flex-shrink-0">{label}</span>
      <span className={`text-[13px] text-[var(--hw-neutral-800)] ${valueCls}`}>{value}</span>
    </div>;
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

      {
    /* Back */
  }
      <button
    onClick={() => navigate("/dftc/temporary-records")}
    className="flex items-center gap-1 text-[13px] text-[var(--hw-neutral-800)] hover:text-[var(--hw-neutral-700)] transition-colors"
  >
        <ChevronLeft className="w-4 h-4" />
        Back to Temporary Market Records
      </button>

      {
    /* Header */
  }
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--hw-neutral-100)] flex items-center justify-center flex-shrink-0">
          <Leaf className="w-5 h-5 text-[var(--hw-neutral-800)]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--hw-neutral-900)]">{record.commodity}</h1>
          <p className="text-[12px] text-[var(--hw-neutral-800)]">Temporary market record · {record.recordId}</p>
        </div>
      </div>

      {
    /* Notice */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4">
        <p className="text-[13px] text-[var(--hw-neutral-800)]">
          Reporting only. This record is stored temporarily and is not used for forecasting, analytics processing, or farmer advisories.
        </p>
      </div>

      {
    /* Expiry warning */
  }
      {expiry.label && <p className={`text-[13px] font-medium ${expiry.cls}`}>
          Storage expires: {formatDate(record.storageExpiryDate)} · {expiry.label}
        </p>}

      {
    /* Summary section */
  }
      <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--hw-neutral-100)]">
          <p className="font-semibold text-[var(--hw-neutral-800)]">Summary</p>
        </div>
        <div className="px-5">
          <DetailRow label="Record ID" value={record.recordId} />
          <DetailRow label="Commodity" value={<span className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-[var(--hw-neutral-100)] flex items-center justify-center">
                <Leaf className="w-3 h-3 text-[var(--hw-neutral-800)]" />
              </div>
              {record.commodity}
            </span>} />
          <DetailRow label="Source Category" value={record.sourceCategory} />
          <DetailRow label="Variety / Grade / Descriptor" value={record.variety} />
          <DetailRow label="Full Source Commodity Label" value={record.fullLabel} />
          <DetailRow label="Market" value={record.market} />
          <DetailRow label="Price Type" value={record.priceType} />
          <DetailRow label="Record Date" value={formatDate(record.recordDate)} />
          <DetailRow label="UOM" value={record.uom} />
          <DetailRow label="Price" value={record.price} />
          <DetailRow label="Observation Status" value={record.obsStatus} />
          <DetailRow label="Submitted By" value={record.submittedBy} />
          <DetailRow label="Submission ID" value={record.submissionId} />
          <DetailRow label="Submitted Date" value={formatDate(record.submittedDate)} />
          <DetailRow
    label="Storage Expiry Date"
    value={<span>
                {formatDate(record.storageExpiryDate)}
                {expiry.label && <span className={`ml-2 text-[11px] font-medium ${expiry.cls}`}>{expiry.label}</span>}
              </span>}
  />
          <DetailRow
    label="Download Status"
    value={record.downloadStatus}
    valueCls={dlStatusCls(record.downloadStatus)}
  />
        </div>
      </div>

      {
    /* Read-only notice */
  }
      <p className="text-[12px] text-[var(--hw-neutral-800)]">
        Submitted records are read-only and cannot be edited or deleted.
      </p>

    </div>;
}
export {
  DFTCTemporaryRecordDetail as default
};
