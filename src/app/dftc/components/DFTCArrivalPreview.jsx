import React, { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCReportShell, DEFAULT_PERSONNEL } from "./DFTCReportShell";

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const ARRIVAL_COLUMNS = [
  { key: "farm", label: "Farm Source", bg: BANK_BG, width: 100 },
  { key: "other", label: "Other Sources", bg: BANK_BG, width: 100 },
  { key: "total", label: "Overall Total", bg: DFTC_BG, width: 100 }
];

function numStr(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatDisplayDateShort(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Arrival-volume report page, styled to match the price monitoring report so
 * both previews render as the same official document: landscape sheet, banded
 * column headers, bordered cells, personnel block, and page numbering.
 */
function ArrivalVolumeReportPage({
  pageIndex,
  totalPages,
  records,
  offset,
  isFirst,
  isLast,
  reportDate,
  personnel,
  totalVolume
}) {
  const cellL = (extra = {}) => ({ background: LEFT_BG, border: "1px solid #000", padding: "4px 8px", fontSize: 12, ...extra });
  const cell = (bg, extra = {}) => ({ background: bg, border: "1px solid #000", padding: "4px 8px", textAlign: "right", fontSize: 12, ...extra });

  return (
    <div className="bg-white p-4 md:p-6 w-full min-w-[660px]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {isFirst && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>Davao Food Terminal Complex Arrival Volume</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 3 }}>Commodity Arrival Volumes as of {reportDate}</div>
        </div>
      )}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cellL({ width: 40, fontSize: 11 }), textAlign: "center", fontWeight: "bold" }}>No.</th>
            <th rowSpan={2} style={{ ...cellL({ minWidth: 180, fontSize: 11 }), fontWeight: "bold" }}>Commodity</th>
            <th rowSpan={2} style={{ ...cellL({ width: 100, fontSize: 11 }), textAlign: "center", fontWeight: "bold" }}>Variety</th>
            <th rowSpan={2} style={{ ...cellL({ width: 60, fontSize: 11 }), textAlign: "center", fontWeight: "bold" }}>UOM</th>
            <th rowSpan={2} style={{ ...cellL({ width: 90, fontSize: 11 }), textAlign: "center", fontWeight: "bold" }}>Arrival Date</th>
            <th colSpan={2} style={{ background: BANK_BG, border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: 11 }}>VOLUME BY SOURCE (KG)</th>
            <th colSpan={1} style={{ background: DFTC_BG, border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold", fontSize: 11 }}>OVERALL</th>
          </tr>
          <tr>
            {ARRIVAL_COLUMNS.map((c) => (
              <th key={c.key} style={{ background: c.bg, border: "1px solid #000", padding: "5px 8px", textAlign: "center", fontSize: 11, fontWeight: "bold", width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={`${r.commodity_name}-${r.variety}-${offset + i}`}>
              <td style={cellL({ textAlign: "center", width: 40 })}>{offset + i + 1}</td>
              <td style={cellL()}><strong>{r.commodity_name || "—"}</strong></td>
              <td style={cellL({ textAlign: "center" })}>{r.variety || "Base"}</td>
              <td style={cellL({ textAlign: "center", width: 60 })}>{r.unit || "kg"}</td>
              <td style={cellL({ textAlign: "center", width: 90 })}>{r.arrival_date || "—"}</td>
              <td style={cell(BANK_BG)}>{numStr(r.farm_source_volume_kg)}</td>
              <td style={cell(BANK_BG)}>{numStr(r.other_source_volume_kg)}</td>
              <td style={cell(DFTC_BG, { fontWeight: "bold" })}>{numStr(r.volume_kg)}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={8} style={{ ...cellL({ textAlign: "center", fontStyle: "italic" }) }}>No volume records for this submission.</td>
            </tr>
          )}
          {isLast && (
            <tr>
              <td colSpan={7} style={cellL({ textAlign: "right", fontWeight: "bold" })}>TOTAL</td>
              <td style={cell(DFTC_BG, { fontWeight: "bold" })}>{numStr(totalVolume)}</td>
            </tr>
          )}
        </tbody>
      </table>
      {isLast && personnel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 12, borderTop: "1px solid #000" }}>
          <div>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Encoded by:</div>
            <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline" }}>{personnel.encodedBy}</div>
            <div style={{ fontSize: 11 }}>{personnel.encodedByRole}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Prepared by:</div>
            <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline" }}>{personnel.preparedBy}</div>
            <div style={{ fontSize: 11 }}>{personnel.preparedByRole}</div>
          </div>
        </div>
      )}
      <div style={{ textAlign: "right", fontSize: 10, marginTop: 8, color: "#555" }}>Page {pageIndex + 1} of {totalPages}</div>
    </div>
  );
}

const ROWS_PER_PAGE = 22;

/**
 * Preview for an arrival-volume submission.
 *
 * Arrival volumes are a different dataset from prevailing prices, so the
 * report body is built separately from the price report — but it is presented
 * through the same DFTCReportShell, so both previews look and behave
 * identically. Records come from the submission's own record lists, so this
 * shows exactly the volumes that submission holds.
 */
function DFTCArrivalPreview({ file, onClose }) {
  const [format, setFormat] = useState("IMG");
  const [imgPage, setImgPage] = useState(0);
  const [dlState, setDlState] = useState("idle");
  const [personnel, setPersonnel] = useState(DEFAULT_PERSONNEL);
  const pageRefs = useRef([]);

  const submissionId = file.submissionId || file.id;

  const { data: submission, isLoading, isError: loadError } = useQuery({
    queryKey: ["dftc", "submission", submissionId],
    queryFn: async () => {
      const res = await apiGet(`/dftc/submissions/${encodeURIComponent(submissionId)}`);
      return parseResponse(res);
    },
    enabled: !!submissionId
  });

  // Fall back to the list payload if the detail call has not landed yet.
  const records = useMemo(() => {
    const fromDetail = submission
      ? [...(submission.analytics_records || []), ...(submission.other_records || [])]
      : [];
    if (fromDetail.length > 0) return fromDetail;
    return [...(file.analyticsRecords || []), ...(file.otherRecords || [])];
  }, [submission, file]);

  const totalVolume = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.volume_kg) || 0), 0),
    [records]
  );

  const reportingDateShort = formatDisplayDateShort(submission?.reporting_date || file.reportingDate);
  const reportingDate = formatDisplayDate(submission?.reporting_date || file.reportingDate);
  const totalPages = Math.max(1, Math.ceil(records.length / ROWS_PER_PAGE));

  const pages = useMemo(() => {
    const out = [];
    for (let i = 0; i < totalPages; i++) {
      out.push({ records: records.slice(i * ROWS_PER_PAGE, (i + 1) * ROWS_PER_PAGE), offset: i * ROWS_PER_PAGE });
    }
    return out;
  }, [records, totalPages]);

  async function downloadImages() {
    setDlState("generating-img");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const JSZip = (await import("jszip")).default;
      const blobs = [];
      for (let i = 0; i < totalPages; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
        });
        blobs.push(blob);
      }
      const base = `DFTC-Arrival-Volume-${reportingDateShort || "report"}`;
      if (blobs.length === 1) {
        triggerDownload(URL.createObjectURL(blobs[0]), `${base}.png`);
      } else {
        const zip = new JSZip();
        blobs.forEach((blob, i) => zip.file(`${base}-Page-${i + 1}.png`, blob));
        const content = await zip.generateAsync({ type: "blob" });
        triggerDownload(URL.createObjectURL(content), `${base}-Images.zip`);
      }
      setDlState("idle");
    } catch (err) {
      console.error("IMG generation error:", err);
      setDlState("error-img");
    }
  }

  async function downloadPDF() {
    setDlState("generating-pdf");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      for (let i = 0; i < totalPages; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        if (i > 0) pdf.addPage("a4", "landscape");
        const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", (pdfW - w) / 2, (pdfH - h) / 2, w, h);
      }
      pdf.save(`DFTC-Arrival-Volume-${reportingDateShort || "report"}.pdf`);
      setDlState("idle");
    } catch (err) {
      console.error("PDF generation error:", err);
      setDlState("error-pdf");
    }
  }

  async function downloadExcel() {
    setDlState("generating-excel");
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = "HarvestWise DFTC System";
      wb.created = new Date();
      const ws = wb.addWorksheet("Arrival Volume", {
        pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });
      ws.columns = [
        { key: "no", width: 6 },
        { key: "commodity", width: 28 },
        { key: "variety", width: 20 },
        { key: "uom", width: 10 },
        { key: "date", width: 16 },
        { key: "farm", width: 18 },
        { key: "other", width: 18 },
        { key: "total", width: 18 }
      ];

      const borderAll = { top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" } };
      const applyStyle = (row, cols, bg) => {
        cols.forEach((c) => {
          const cell = row.getCell(c);
          cell.font = { bold: true, size: 10, name: "Arial" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg.replace("#", "")}` } };
          cell.border = borderAll;
        });
      };

      const titleRow = ws.addRow(["DAVAO FOOD TERMINAL COMPLEX ARRIVAL VOLUME"]);
      titleRow.font = { bold: true, size: 13, name: "Arial" };
      titleRow.alignment = { horizontal: "center" };
      ws.mergeCells(`A${titleRow.number}:H${titleRow.number}`);

      const dateRow = ws.addRow([`COMMODITY ARRIVAL VOLUMES AS OF ${reportingDate.toUpperCase()}`]);
      dateRow.font = { bold: true, size: 11, name: "Arial" };
      dateRow.alignment = { horizontal: "center" };
      ws.mergeCells(`A${dateRow.number}:H${dateRow.number}`);
      ws.addRow([]);

      const h1 = ws.addRow(["No.", "Commodity", "Variety", "UOM", "Arrival Date", "VOLUME BY SOURCE (KG)", "", "OVERALL"]);
      ws.mergeCells(`F${h1.number}:G${h1.number}`);
      const h2 = ws.addRow(["", "", "", "", "", "Farm Source", "Other Sources", "Overall Total"]);
      applyStyle(h1, [1, 2, 3, 4, 5], LEFT_BG);
      applyStyle(h1, [6, 7], BANK_BG);
      applyStyle(h1, [8], DFTC_BG);
      applyStyle(h2, [1, 2, 3, 4, 5], LEFT_BG);
      applyStyle(h2, [6, 7], BANK_BG);
      applyStyle(h2, [8], DFTC_BG);

      records.forEach((r, i) => {
        const row = ws.addRow([
          i + 1,
          r.commodity_name || "",
          r.variety || "Base",
          r.unit || "kg",
          r.arrival_date || "",
          r.farm_source_volume_kg ?? "",
          r.other_source_volume_kg ?? "",
          r.volume_kg ?? ""
        ]);
        row.font = { size: 10, name: "Arial" };
        [1, 2, 3, 4, 5].forEach((c) => {
          const cell = row.getCell(c);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${LEFT_BG.replace("#", "")}` } };
          cell.border = borderAll;
          if (c === 1 || c === 3 || c === 4 || c === 5) cell.alignment = { horizontal: "center" };
        });
        [6, 7].forEach((c) => {
          const cell = row.getCell(c);
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${BANK_BG.replace("#", "")}` } };
          cell.alignment = { horizontal: "right" };
          cell.border = borderAll;
        });
        const totalCell = row.getCell(8);
        totalCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${DFTC_BG.replace("#", "")}` } };
        totalCell.alignment = { horizontal: "right" };
        totalCell.border = borderAll;
      });

      ws.addRow([]);
      const p1 = ws.addRow(["Encoded by:", "", "", "", "", "Prepared by:", "", ""]);
      const p2 = ws.addRow([personnel.encodedBy, "", "", "", "", personnel.preparedBy, "", ""]);
      p2.getCell(1).font = { bold: true, underline: true };
      p2.getCell(6).font = { bold: true, underline: true };
      ws.mergeCells(`A${p2.number}:E${p2.number}`);
      ws.mergeCells(`F${p2.number}:H${p2.number}`);
      const p3 = ws.addRow([personnel.encodedByRole, "", "", "", "", personnel.preparedByRole, "", ""]);
      ws.mergeCells(`A${p3.number}:E${p3.number}`);
      ws.mergeCells(`F${p3.number}:H${p3.number}`);
      ws.pageSetup.printArea = `A1:H${ws.rowCount}`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      triggerDownload(URL.createObjectURL(blob), `DFTC-Arrival-Volume-${reportingDateShort || "report"}.xlsx`);
      setDlState("idle");
    } catch (err) {
      console.error("Excel generation error:", err);
      setDlState("error-excel");
    }
  }

  async function handleDownload() {
    if (format === "IMG") await downloadImages();
    else if (format === "PDF") await downloadPDF();
    else await downloadExcel();
  }

  const isGenerating = dlState.startsWith("generating");
  const isError = dlState.startsWith("error");
  const errorFormat = isError ? dlState.replace("error-", "").toUpperCase() : null;
  const dlLabel = isGenerating
    ? dlState === "generating-pdf"
      ? "Generating PDF…"
      : dlState === "generating-excel"
      ? "Generating Excel…"
      : "Generating Images…"
    : format === "PDF"
    ? "Download PDF"
    : format === "Excel"
    ? "Download Excel"
    : "Download Images";

  function renderPage(idx) {
    const page = pages[idx];
    return (
      <ArrivalVolumeReportPage
        pageIndex={idx}
        totalPages={totalPages}
        records={page.records}
        offset={page.offset}
        isFirst={idx === 0}
        isLast={idx === totalPages - 1}
        reportDate={reportingDate}
        personnel={idx === totalPages - 1 ? personnel : void 0}
        totalVolume={totalVolume}
      />
    );
  }

  function renderPreviewBody() {
    if (loadError) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-[12px] text-red-700">Could not load this submission&apos;s arrival volumes.</span>
        </div>
      );
    }
    if (isLoading && records.length === 0) {
      return (
        <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-white p-8 text-center">
          <p className="text-[13px] text-[var(--hw-neutral-600)]">Loading arrival volumes…</p>
        </div>
      );
    }
    if (format === "IMG") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setImgPage(Math.max(0, imgPage - 1))}
              disabled={imgPage === 0}
              className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--hw-neutral-800)]" />
            </button>
            <div className="text-center">
              <span className="text-[13px] font-medium text-[var(--hw-neutral-900)]">Image {imgPage + 1} of {totalPages}</span>
              <div className="flex gap-1.5 justify-center mt-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button key={i} onClick={() => setImgPage(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === imgPage ? "bg-[var(--hw-neutral-800)]" : "bg-[var(--hw-neutral-300)]"}`} />
                ))}
              </div>
            </div>
            <button
              onClick={() => setImgPage(Math.min(totalPages - 1, imgPage + 1))}
              disabled={imgPage === totalPages - 1}
              className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" />
            </button>
          </div>
          <div className="border border-[var(--hw-neutral-300)] rounded-xl bg-white overflow-x-auto shadow-sm">
            {renderPage(imgPage)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide mb-1">Encoded by</p>
              <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{personnel.encodedBy}</p>
              <p className="text-[12px] text-[var(--hw-neutral-700)]">{personnel.encodedByRole}</p>
            </div>
            <div className="p-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
              <p className="text-[11px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide mb-1">Prepared by</p>
              <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{personnel.preparedBy}</p>
              <p className="text-[12px] text-[var(--hw-neutral-700)]">{personnel.preparedByRole}</p>
            </div>
          </div>
        </div>
      );
    }
    if (format === "PDF") {
      return (
        <div className="space-y-5">
          {pages.map((_, idx) => (
            <div key={idx} className="bg-white shadow-sm rounded-xl border border-[var(--hw-neutral-300)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-200)]">
                <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Page {idx + 1} of {totalPages}</span>
                <span className="text-[12px] text-[var(--hw-neutral-800)]">A4 Landscape</span>
              </div>
              <div className="overflow-x-auto">{renderPage(idx)}</div>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="rounded-xl overflow-hidden border border-[var(--hw-neutral-300)] bg-white">
        <div className="bg-[#217346] px-4 py-2 flex items-center gap-2">
          <span className="text-white text-[12px] font-semibold">Microsoft Excel</span>
          <span className="text-green-200 text-[12px] truncate">— DFTC-Arrival-Volume-{reportingDateShort}.xlsx</span>
        </div>
        <div className="bg-[#f3f3f3] border-b border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-2">
          <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">A1</span>
          <span className="text-[var(--hw-neutral-700)] text-[12px]">fx</span>
          <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">DAVAO FOOD TERMINAL COMPLEX ARRIVAL VOLUME</span>
        </div>
        <div className="overflow-x-auto bg-white">{pages.map((_, idx) => renderPage(idx))}</div>
        <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
          <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[12px] font-medium text-[#217346] -mb-1.5">Arrival Volume</div>
        </div>
      </div>
    );
  }

  return (
    <DFTCReportShell
      title="Preview Arrival Volume"
      subtitle={`${file.market || "DFTC"} Arrival Volume — ${reportingDate}`}
      onClose={onClose}
      metaFields={[
        ["Report ID", submission?.id || file.id || "—"],
        ["Reporting Date", reportingDate],
        ["Records Included", String(records.length)],
        ["Total Volume", `${numStr(totalVolume)} kg`],
        ["Saved Date", file.savedDate || "—"],
        ["Encoded By", submission?.submitted_by_name || "—"]
      ]}
      format={format}
      onFormatChange={setFormat}
      personnel={personnel}
      onPersonnelChange={setPersonnel}
      downloadLabel={dlLabel}
      onDownload={handleDownload}
      isGenerating={isGenerating}
      isError={isError}
      errorLabel={errorFormat === "PDF" ? "PDF" : errorFormat === "EXCEL" ? "Excel" : "Image"}
      onRetryDownload={() => setDlState("idle")}
      renderHiddenPages={() =>
        pages.map((_, idx) => (
          <div key={idx} ref={(el) => { pageRefs.current[idx] = el; }}>
            {renderPage(idx)}
          </div>
        ))
      }
    >
      {renderPreviewBody()}
    </DFTCReportShell>
  );
}

export { DFTCArrivalPreview };