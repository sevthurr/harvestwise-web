import React, { useEffect, useRef, useState } from "react";
import { Download, ArrowLeft, AlertCircle, Check } from "lucide-react";

export const DFTC_PERSONNEL_LIST = [
  { name: "CHRISTIAN JOEY PAUL M. HERMOSO", role: "Agricultural Technologist" },
  { name: "IVY JOYCE P. BOLODO", role: "Agri-Service & Related Worker" }
];

export const DEFAULT_PERSONNEL = {
  encodedBy: DFTC_PERSONNEL_LIST[0].name,
  encodedByRole: DFTC_PERSONNEL_LIST[0].role,
  preparedBy: DFTC_PERSONNEL_LIST[1].name,
  preparedByRole: DFTC_PERSONNEL_LIST[1].role
};

/**
 * Shared chrome for every DFTC report preview.
 *
 * Price monitoring and arrival volume are different datasets, but they are
 * presented the same way: same header, metadata grid, format tabs, personnel
 * selectors, error strip, and action bar. Only the preview body and the
 * download builders differ, so those stay in each preview component and are
 * passed in here.
 */
function DFTCReportShell({
  title,
  subtitle,
  onClose,
  metaFields,
  formats = ["PDF", "Excel", "IMG"],
  format,
  onFormatChange,
  children,
  personnelList = DFTC_PERSONNEL_LIST,
  personnel = DEFAULT_PERSONNEL,
  onPersonnelChange,
  downloadLabel,
  onDownload,
  isGenerating = false,
  isError = false,
  errorLabel = "File",
  onRetryDownload,
  renderHiddenPages
}) {
  const [personnelUpdated, setPersonnelUpdated] = useState(false);
  const updatedTimer = useRef(null);

  useEffect(() => () => {
    if (updatedTimer.current) clearTimeout(updatedTimer.current);
  }, []);

  function updatePersonnel(field, name) {
    const user = personnelList.find((p) => p.name === name);
    if (!user) return;
    const roleField = field === "encodedBy" ? "encodedByRole" : "preparedByRole";
    onPersonnelChange({ ...personnel, [field]: user.name, [roleField]: user.role });
    setPersonnelUpdated(true);
    if (updatedTimer.current) clearTimeout(updatedTimer.current);
    updatedTimer.current = setTimeout(() => setPersonnelUpdated(false), 3000);
  }

  return (
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] flex flex-col w-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-4 border-b border-[var(--hw-neutral-100)] bg-white">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">{title}</h2>
      </div>

      {/* Report metadata */}
      <div className="px-4 md:px-6 py-3.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]/50">
        <p className="font-semibold text-[15px] text-[var(--hw-neutral-900)] mb-2">{subtitle}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
          {metaFields.map(([label, val]) => (
            <div key={label} className="min-w-0">
              <span className="text-[11px] font-medium text-[var(--hw-neutral-600)] block">{label}:</span>
              <span className="text-[12px] font-medium text-[var(--hw-neutral-900)] truncate block" title={val}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Format tabs */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--hw-neutral-100)]">
        <div className="flex gap-2">
          {formats.map((f) => (
            <button
              key={f}
              onClick={() => onFormatChange(f)}
              className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${format === f ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Preview body */}
      <div className="p-3 md:p-6 bg-[var(--hw-neutral-50)]">{children}</div>

      {/* Report personnel */}
      <div className="px-4 md:px-6 py-4 border-t border-[var(--hw-neutral-100)] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-1">Encoded By</label>
            <select
              value={personnel.encodedBy}
              onChange={(e) => updatePersonnel("encodedBy", e.target.value)}
              className="text-[12px] border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] w-full"
            >
              {personnelList.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <span className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5">{personnel.encodedByRole}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-1">Prepared By</label>
            <select
              value={personnel.preparedBy}
              onChange={(e) => updatePersonnel("preparedBy", e.target.value)}
              className="text-[12px] border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] w-full"
            >
              {personnelList.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <span className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5">{personnel.preparedByRole}</span>
          </div>
          {personnelUpdated && (
            <div className="flex items-center gap-1.5 self-end pb-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-[12px] text-emerald-700 font-medium">Report personnel updated</span>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {isError && (
        <div className="px-4 md:px-6 py-2.5 bg-red-50 border-t border-red-100 shrink-0 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-[12px] text-red-700">
            {errorLabel} generation failed.{" "}
            <button className="underline font-medium" onClick={onRetryDownload}>Try again</button>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 md:px-6 py-4 border-t border-[var(--hw-neutral-100)] flex items-center justify-between gap-3 bg-white">
        <button
          onClick={onClose}
          className="py-2.5 px-5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors"
        >
          Back
        </button>
        <button
          onClick={onDownload}
          disabled={isGenerating}
          className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-60 cursor-pointer"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span>{downloadLabel}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" />
              <span>{downloadLabel}</span>
            </>
          )}
        </button>
      </div>

      {/* Hidden off-screen pages for html2canvas rendering */}
      {renderHiddenPages && (
        <div style={{ position: "fixed", left: -9999, top: 0, width: 960, pointerEvents: "none" }}>
          {renderHiddenPages()}
        </div>
      )}
    </div>
  );
}

export { DFTCReportShell };