import React, { useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCReportShell, DEFAULT_PERSONNEL } from "./DFTCReportShell";
import { DFTC_REPORT_CATEGORIES, PAGE_CATEGORY_GROUPS } from "./dftcReportCategories";

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const USER_ID_TO_NAME = {
  "USR-HERMOSO-001": "CHRISTIAN JOEY PAUL M. HERMOSO",
  "USR-BOLODO-002": "IVY JOYCE P. BOLODO"
};

function formatDisplayDate(dateStr) {
  if (!dateStr) {
    return new Date().toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

function formatDisplayDateShort(dateStr) {
  if (!dateStr) {
    const d = new Date();
    return d.toISOString().split("T")[0];
  }
  try {
    const d = new Date(dateStr);
    return d.toISOString().split("T")[0];
  } catch {
    return dateStr;
  }
}

function getEncodedByName(file) {
  if (file.encodedBy) return file.encodedBy;
  if (file.encodedUserId && USER_ID_TO_NAME[file.encodedUserId]) {
    return USER_ID_TO_NAME[file.encodedUserId];
  }
  return file.encodedUserId || "CHRISTIAN JOEY PAUL M. HERMOSO";
}

// ── Real-data lookup helpers (preview prices come from the API, not mock rows) ──

function normalizeKey(str) {
  return (str || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function priceStr(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function buildRowsLookup(rows) {
  const lookup = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeKey(row.commodity_name || row.name);
    if (!key) return;
    if (!lookup.has(key)) lookup.set(key, []);
    lookup.get(key).push(row);
  });
  return lookup;
}

function resolvePriceRow(commodity, variant, lookup) {
  const rows = lookup.get(normalizeKey(commodity.name));
  if (!rows || rows.length === 0) return null;
  const vKey = normalizeKey(variant.descriptor);
  if (vKey) {
    const exact = rows.find((r) => vKey === normalizeKey(r.variety));
    if (exact) return exact;
  }
  const withVariety = rows.filter((r) => normalizeKey(r.variety));
  const base = rows.find((r) => !normalizeKey(r.variety));
  return withVariety[0] || base || rows[0];
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function ReportColumnHeaders() {
  const thBase = (bg, extra = {}) => ({
    background: bg,
    border: "1px solid #000",
    padding: "6px 8px",
    textAlign: "center",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    ...extra
  });
  return (
    <thead>
      <tr>
        <th rowSpan={2} style={thBase(LEFT_BG, { width: 36, fontSize: 11 })}>No.</th>
        <th rowSpan={2} style={thBase(LEFT_BG, { minWidth: 160, fontSize: 11 })}>Commodity</th>
        <th rowSpan={2} style={thBase(LEFT_BG, { width: 72, fontSize: 11 })}>UOM</th>
        <th colSpan={3} style={thBase(BANK_BG, { fontSize: 11 })}>BANKEROHAN MARKET</th>
        <th colSpan={2} style={thBase(DFTC_BG, { fontSize: 11 })}>DFTC TABOAN</th>
      </tr>
      <tr>
        {["Landing", "Wholesale", "Retail"].map((h) => (
          <th key={h} style={{ background: BANK_BG, border: "1px solid #000", padding: "5px 8px", textAlign: "center", fontSize: 11, width: 85 }}>{h}</th>
        ))}
        {["Wholesale", "Retail"].map((h) => (
          <th key={h} style={{ background: DFTC_BG, border: "1px solid #000", padding: "5px 8px", textAlign: "center", fontSize: 11, width: 85 }}>{h}</th>
        ))}
      </tr>
    </thead>
  );
}

function DFTCReportPage({ pageIndex, totalPages, categories, isFirst, isLast, reportDate, personnel }) {
  const cellL = (extra = {}) => ({ background: LEFT_BG, border: "1px solid #000", padding: "4px 8px", fontSize: 12, ...extra });
  const cellB = (extra = {}) => ({ background: BANK_BG, border: "1px solid #000", padding: "4px 8px", textAlign: "right", fontSize: 12, ...extra });
  const cellD = (extra = {}) => ({ background: DFTC_BG, border: "1px solid #000", padding: "4px 8px", textAlign: "right", fontSize: 12, ...extra });

  return (
    <div className="font-sans bg-white p-4 md:p-6 w-full min-w-[660px]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
      {isFirst && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>Davao Food Terminal Complex Price Monitoring</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 3 }}>Prevailing Market Prices as of {reportDate}</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 2 }}>Class A</div>
        </div>
      )}
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <ReportColumnHeaders />
        <tbody>
          {categories.map((cat) => (
            <React.Fragment key={cat.name}>
              <tr>
                <td colSpan={3} style={{ ...cellL(), fontWeight: "bold", fontStyle: "italic", textDecoration: "underline", textAlign: "left" }}>{cat.name}</td>
                <td style={cellB()} /><td style={cellB()} /><td style={cellB()} />
                <td style={cellD()} /><td style={cellD()} />
              </tr>
              {cat.commodities.map((com) =>
                com.variants.map((v, vi) => (
                  <tr key={`${com.no}-${vi}`}>
                    <td style={cellL({ textAlign: "center", width: 36 })}>{vi === 0 ? com.no : ""}</td>
                    <td style={cellL()}>
                      {vi === 0 ? (
                        <><strong>{com.name}</strong>{" "}<span style={{ fontWeight: "normal" }}>{v.descriptor}</span></>
                      ) : (
                        <span style={{ paddingLeft: 16 }}>{v.descriptor}</span>
                      )}
                    </td>
                    <td style={cellL({ textAlign: "center", width: 72 })}>{v.uom}</td>
                    <td style={cellB()}>{v.bankLanding}</td>
                    <td style={cellB()}>{v.bankWholesale}</td>
                    <td style={cellB()}>{v.bankRetail}</td>
                    <td style={cellD()}>{v.dftcWholesale}</td>
                    <td style={cellD()}>{v.dftcRetail}</td>
                  </tr>
                ))
              )}
            </React.Fragment>
          ))}
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

function PDFPreviewContent({ personnel, reportDate, categories }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return (
    <div className="space-y-5">
      {PAGE_CATEGORY_GROUPS.map((group, idx) => {
        const cats = group.map((n) => categories.find((c) => c.name === n)).filter(Boolean);
        return (
          <div key={idx} className="bg-white shadow-sm rounded-xl border border-[var(--hw-neutral-300)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-200)]">
              <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Page {idx + 1} of {total}</span>
              <span className="text-[12px] text-[var(--hw-neutral-800)]">A4 Landscape</span>
            </div>
            <div className="overflow-x-auto">
              <DFTCReportPage pageIndex={idx} totalPages={total} categories={cats} isFirst={idx === 0} isLast={idx === total - 1} reportDate={reportDate} personnel={idx === total - 1 ? personnel : void 0} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExcelPreviewContent({ personnel, reportDate, reportDateShort, categories }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return (
    <div className="rounded-xl overflow-hidden border border-[var(--hw-neutral-300)] bg-white">
      <div className="bg-[#217346] px-4 py-2 flex items-center gap-2">
        <span className="text-white text-[12px] font-semibold">Microsoft Excel</span>
        <span className="text-green-200 text-[12px] truncate">— DFTC-Price-Monitoring-{reportDateShort}.xlsx</span>
      </div>
      <div className="bg-[#f3f3f3] border-b border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-2">
        <span className="text-[12px] text-[var(--hw-neutral-700)] font-medium">A1</span>
        <span className="text-[var(--hw-neutral-700)] text-[12px]">fx</span>
        <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">DAVAO FOOD TERMINAL COMPLEX PRICE MONITORING</span>
      </div>
      <div className="overflow-x-auto bg-white">
        {PAGE_CATEGORY_GROUPS.map((group, idx) => {
          const cats = group.map((n) => categories.find((c) => c.name === n)).filter(Boolean);
          return <DFTCReportPage key={idx} pageIndex={idx} totalPages={total} categories={cats} isFirst={idx === 0} isLast={idx === total - 1} reportDate={reportDate} personnel={idx === total - 1 ? personnel : void 0} />;
        })}
      </div>
      <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
        <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[12px] font-medium text-[#217346] -mb-1.5">Price Monitoring</div>
      </div>
    </div>
  );
}

function IMGPreview({ page, onPageChange, personnel, reportDate, categories }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  const currentCats = PAGE_CATEGORY_GROUPS[page].map((name) => categories.find((c) => c.name === name)).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-[var(--hw-neutral-800)]" />
        </button>
        <div className="text-center">
          <span className="text-[13px] font-medium text-[var(--hw-neutral-900)]">Image {page + 1} of {total}</span>
          <div className="flex gap-1.5 justify-center mt-1">
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => onPageChange(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === page ? "bg-[var(--hw-neutral-800)]" : "bg-[var(--hw-neutral-300)]"}`} />
            ))}
          </div>
        </div>
        <button
          onClick={() => onPageChange(Math.min(total - 1, page + 1))}
          disabled={page === total - 1}
          className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" />
        </button>
      </div>

      <div className="border border-[var(--hw-neutral-300)] rounded-xl bg-white overflow-x-auto shadow-sm">
        <DFTCReportPage pageIndex={page} totalPages={total} categories={currentCats} isFirst={page === 0} isLast={page === total - 1} reportDate={reportDate} personnel={page === total - 1 ? personnel : void 0} />
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

function DFTCFilePreview({ file, onClose }) {
  const [format, setFormat] = useState("IMG");
  const [imgPage, setImgPage] = useState(0);
  const [dlState, setDlState] = useState("idle");
  const [personnel, setPersonnel] = useState(DEFAULT_PERSONNEL);
  const pageRefs = useRef([]);
  const total = PAGE_CATEGORY_GROUPS.length;

  const reportingDateShort = formatDisplayDateShort(file.reportingDate || file.savedDate);

  const { data: reportPreviewData } = useQuery({
    queryKey: ["dftc-report-preview", reportingDateShort],
    queryFn: async () => {
      const res = await apiGet(`/dftc/reports/preview?date=${reportingDateShort}`);
      return parseResponse(res);
    },
    enabled: !!reportingDateShort
  });

  // Build price cells from the real API rows; missing data renders as "—"
  // (never falls back to the static mock rows in DFTC_REPORT_CATEGORIES).
  const resolvedCategories = useMemo(() => {
    const lookup = buildRowsLookup(reportPreviewData?.rows);
    return DFTC_REPORT_CATEGORIES.map((cat) => ({
      ...cat,
      commodities: cat.commodities.map((com) => ({
        ...com,
        variants: com.variants.map((v) => {
          const row = resolvePriceRow(com, v, lookup);
          return {
            ...v,
            bankLanding: row ? priceStr(row.bangkerohan_landing) : "",
            bankWholesale: row ? priceStr(row.bangkerohan_wholesale) : "",
            bankRetail: row ? priceStr(row.bangkerohan_retail) : "",
            dftcWholesale: row ? priceStr(row.dftc_taboan_wholesale) : "",
            dftcRetail: row ? priceStr(row.dftc_taboan_retail) : ""
          };
        })
      }))
    }));
  }, [reportPreviewData]);

  const reportingDate = reportPreviewData?.subtitle
    ? reportPreviewData.subtitle.replace("Prevailing Market Prices as of ", "")
    : formatDisplayDate(file.reportingDate || file.savedDate);
  const reportReference = reportPreviewData?.report_reference_no || file.reportId || file.reportReferenceNo || file.fileId || "—";
  const encodedByName = reportPreviewData?.encoded_by || getEncodedByName(file);

  async function downloadImages() {
    setDlState("generating-img");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const JSZip = (await import("jszip")).default;
      const blobs = [];
      for (let i = 0; i < total; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((b) => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
        });
        blobs.push(blob);
      }
      if (blobs.length === 1) {
        const url = URL.createObjectURL(blobs[0]);
        triggerDownload(url, `DFTC-Price-Monitoring-${reportingDateShort}-Page-1.png`);
        URL.revokeObjectURL(url);
      } else {
        const zip = new JSZip();
        blobs.forEach((blob, i) => zip.file(`DFTC-Price-Monitoring-${reportingDateShort}-Page-${i + 1}.png`, blob));
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        triggerDownload(url, `DFTC-Price-Monitoring-${reportingDateShort}-Images.zip`);
        URL.revokeObjectURL(url);
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
      for (let i = 0; i < total; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage("a4", "landscape");
        const ratio = Math.min(pdfW / canvas.width, pdfH / canvas.height);
        const w = canvas.width * ratio;
        const h = canvas.height * ratio;
        pdf.addImage(imgData, "PNG", (pdfW - w) / 2, (pdfH - h) / 2, w, h);
      }
      pdf.save(`DFTC-Price-Monitoring-${reportingDateShort}.pdf`);
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
      const ws = wb.addWorksheet("Price Monitoring", {
        pageSetup: { orientation: "landscape", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
      });
      ws.columns = [
        { key: "no", width: 6 },
        { key: "commodity", width: 26 },
        { key: "uom", width: 12 },
        { key: "bLanding", width: 14 },
        { key: "bWholesale", width: 14 },
        { key: "bRetail", width: 14 },
        { key: "dWholesale", width: 14 },
        { key: "dRetail", width: 14 }
      ];

      const r1 = ws.addRow(["DAVAO FOOD TERMINAL COMPLEX PRICE MONITORING"]);
      r1.font = { bold: true, size: 13, name: "Arial" };
      r1.alignment = { horizontal: "center" };
      ws.mergeCells(`A${r1.number}:H${r1.number}`);

      const r2 = ws.addRow([`PREVAILING MARKET PRICES AS OF ${reportingDate.toUpperCase()}`]);
      r2.font = { bold: true, size: 11, name: "Arial" };
      r2.alignment = { horizontal: "center" };
      ws.mergeCells(`A${r2.number}:H${r2.number}`);

      const r3 = ws.addRow(["CLASS A"]);
      r3.font = { bold: true, size: 11, name: "Arial" };
      r3.alignment = { horizontal: "center" };
      ws.mergeCells(`A${r3.number}:H${r3.number}`);
      ws.addRow([]);

      const borderAll = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };

      const hRow1 = ws.addRow(["No.", "Commodity", "UOM", "BANKEROHAN MARKET", "", "", "DFTC TABOAN", ""]);
      ws.mergeCells(`A${hRow1.number}:A${hRow1.number + 1}`);
      ws.mergeCells(`B${hRow1.number}:B${hRow1.number + 1}`);
      ws.mergeCells(`C${hRow1.number}:C${hRow1.number + 1}`);
      ws.mergeCells(`D${hRow1.number}:F${hRow1.number}`);
      ws.mergeCells(`G${hRow1.number}:H${hRow1.number}`);
      const hRow2 = ws.addRow(["", "", "", "Landing", "Wholesale", "Retail", "Wholesale", "Retail"]);

      const applyHStyle = (row, cols, bg) => {
        cols.forEach((c) => {
          const cell = row.getCell(c);
          cell.font = { bold: true, size: 10, name: "Arial" };
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg.replace("#", "FF") } };
          cell.border = borderAll;
        });
      };
      applyHStyle(hRow1, [1, 2, 3], LEFT_BG);
      applyHStyle(hRow1, [4, 5, 6], BANK_BG);
      applyHStyle(hRow1, [7, 8], DFTC_BG);
      applyHStyle(hRow2, [1, 2, 3], LEFT_BG);
      applyHStyle(hRow2, [4, 5, 6], BANK_BG);
      applyHStyle(hRow2, [7, 8], DFTC_BG);

      resolvedCategories.forEach((cat) => {
        const catRow = ws.addRow([cat.name, "", "", "", "", "", "", ""]);
        ws.mergeCells(`A${catRow.number}:H${catRow.number}`);
        const cCell = catRow.getCell(1);
        cCell.font = { bold: true, italic: true, underline: true, size: 10, name: "Arial" };
        cCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LEFT_BG.replace("#", "FF") } };
        cCell.border = borderAll;

        cat.commodities.forEach((com) => {
          com.variants.forEach((v, vi) => {
            const dataRow = ws.addRow([
              vi === 0 ? com.no : "",
              vi === 0 ? `${com.name} ${v.descriptor}` : `   ${v.descriptor}`,
              v.uom,
              v.bankLanding,
              v.bankWholesale,
              v.bankRetail,
              v.dftcWholesale,
              v.dftcRetail
            ]);
            dataRow.font = { size: 10, name: "Arial" };
            [1, 2, 3].forEach((c) => {
              const cell = dataRow.getCell(c);
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: LEFT_BG.replace("#", "FF") } };
              cell.border = borderAll;
              if (c === 1 || c === 3) cell.alignment = { horizontal: "center" };
            });
            [4, 5, 6].forEach((c) => {
              const cell = dataRow.getCell(c);
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BANK_BG.replace("#", "FF") } };
              cell.alignment = { horizontal: "right" };
              cell.border = borderAll;
            });
            [7, 8].forEach((c) => {
              const cell = dataRow.getCell(c);
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: DFTC_BG.replace("#", "FF") } };
              cell.alignment = { horizontal: "right" };
              cell.border = borderAll;
            });
          });
        });
      });

      ws.addRow([]);
      const pRow1 = ws.addRow(["Encoded by:", "", "", "", "", "Prepared by:", "", ""]);
      pRow1.getCell(1).font = { bold: false };
      pRow1.getCell(6).font = { bold: false };
      const pRow2 = ws.addRow([personnel.encodedBy, "", "", "", "", personnel.preparedBy, "", ""]);
      pRow2.getCell(1).font = { bold: true, underline: true };
      pRow2.getCell(6).font = { bold: true, underline: true };
      ws.mergeCells(`A${pRow2.number}:E${pRow2.number}`);
      ws.mergeCells(`F${pRow2.number}:H${pRow2.number}`);
      const pRow3 = ws.addRow([personnel.encodedByRole, "", "", "", "", personnel.preparedByRole, "", ""]);
      ws.mergeCells(`A${pRow3.number}:E${pRow3.number}`);
      ws.mergeCells(`F${pRow3.number}:H${pRow3.number}`);
      ws.pageSetup.printArea = `A1:H${ws.rowCount}`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `DFTC-Price-Monitoring-${reportingDateShort}.xlsx`);
      URL.revokeObjectURL(url);
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

  return (
    <DFTCReportShell
      title="Preview Daily Report"
      subtitle={`DFTC Price Monitoring — ${reportingDate}`}
      onClose={onClose}
      metaFields={[
        ["Report ID", reportReference],
        ["Reporting Date", reportingDate],
        ["Class", "A"],
        ["Records Included", String(file.records ?? 0)],
        ["Saved Date", file.savedDate || "—"],
        ["Encoded By", encodedByName]
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
        PAGE_CATEGORY_GROUPS.map((group, idx) => {
          const cats = group.map((n) => resolvedCategories.find((c) => c.name === n)).filter(Boolean);
          return (
            <div key={idx} ref={(el) => { pageRefs.current[idx] = el; }}>
              <DFTCReportPage
                pageIndex={idx}
                totalPages={total}
                categories={cats}
                isFirst={idx === 0}
                isLast={idx === total - 1}
                reportDate={reportingDate}
                personnel={idx === total - 1 ? personnel : void 0}
              />
            </div>
          );
        })
      }
    >
      {format === "IMG" && (
        <IMGPreview
          page={imgPage}
          onPageChange={setImgPage}
          personnel={personnel}
          reportDate={reportingDate}
          categories={resolvedCategories}
        />
      )}
      {format === "PDF" && <PDFPreviewContent personnel={personnel} reportDate={reportingDate} categories={resolvedCategories} />}
      {format === "Excel" && <ExcelPreviewContent personnel={personnel} reportDate={reportingDate} reportDateShort={reportingDateShort} categories={resolvedCategories} />}
    </DFTCReportShell>
  );
}

export { DFTCFilePreview };
