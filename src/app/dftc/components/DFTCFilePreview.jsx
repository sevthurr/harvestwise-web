import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCReportShell, DEFAULT_PERSONNEL } from "./DFTCReportShell";
import { buildReportExportFilename } from "./dftcReportExport";
import {
  PAGE_CATEGORY_GROUPS,
  IMG_PAGE_CATEGORY_GROUPS,
  PDF_PAGE_CATEGORY_GROUPS,
  PDF_PORTRAIT_PAGE_CATEGORY_GROUPS
} from "./dftcReportCategories";
import { DFTCPreviewZoomContainer } from "./DFTCPreviewZoomContainer";
import { DFTCFacebookImageCard } from "./DFTCFacebookImageCard";
import { renderFBCardToCanvas } from "./dftcFacebookImageCanvas";

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const USER_ID_TO_NAME = {
  "USR-0001": "MARIA S. SANTOS"
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const match = String(dateStr).match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  } catch {}
  return String(dateStr);
}

function getEncodedByName(file) {
  if (file.encodedBy) return file.encodedBy;
  if (file.encodedUserId && USER_ID_TO_NAME[file.encodedUserId]) {
    return USER_ID_TO_NAME[file.encodedUserId];
  }
  return file.encodedUserId || "IVY JOYCE P. BOLODO";
}

function normalizeKey(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function resolvePriceRow(commodity, variety, lookup) {
  const rows = lookup.get(normalizeKey(commodity.name));
  if (!rows || rows.length === 0) return null;
  const vKey = normalizeKey(variety);
  if (vKey) {
    const exact = rows.find((r) => vKey === normalizeKey(r.variety));
    if (exact) return exact;
    return null;
  }
  return rows.find((r) => !normalizeKey(r.variety)) ?? null;
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function ColumnHeaderRows({ headerPadding = "5px 8px", headerFontSize = 11 }) {
  const thBase = (bg, extra = {}) => ({
    background: bg,
    border: "1px solid #000",
    padding: headerPadding,
    textAlign: "center",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    fontSize: headerFontSize,
    ...extra
  });
  return (
    <>
      <tr>
        <th rowSpan={2} style={thBase(LEFT_BG)}>No.</th>
        <th rowSpan={2} style={thBase(LEFT_BG)}>Commodity</th>
        <th rowSpan={2} style={thBase(LEFT_BG)}>UOM</th>
        <th colSpan={3} style={thBase(BANK_BG)}>BANKEROHAN MARKET</th>
        <th colSpan={2} style={thBase(DFTC_BG)}>DFTC TABOAN</th>
      </tr>
      <tr>
        {["Landing", "Wholesale", "Retail"].map((h) => (
          <th key={h} style={{ background: BANK_BG, border: "1px solid #000", padding: headerPadding, textAlign: "center", fontSize: headerFontSize, fontWeight: "bold" }}>{h}</th>
        ))}
        {["Wholesale", "Retail"].map((h) => (
          <th key={h} style={{ background: DFTC_BG, border: "1px solid #000", padding: headerPadding, textAlign: "center", fontSize: headerFontSize, fontWeight: "bold" }}>{h}</th>
        ))}
      </tr>
    </>
  );
}

function ReportColumnHeaders({ headerPadding = "5px 8px", headerFontSize = 11 }) {
  return (
    <thead>
      <ColumnHeaderRows headerPadding={headerPadding} headerFontSize={headerFontSize} />
    </thead>
  );
}

function DFTCReportPage({ pageIndex, totalPages, categories, isFirst, isLast, reportDate, personnel, orientation = "landscape" }) {
  const isPortrait = orientation === "portrait";
  const rowCount = categories.reduce((sum, cat) => sum + (cat.commodities || []).reduce((cSum, com) => cSum + (com.variants?.length || 1), 0), 0);
  const cellPadding = isPortrait ? "3.5px 6px" : (rowCount > 20 ? "2.5px 6px" : rowCount > 15 ? "3px 6px" : "4px 8px");
  const cellFontSize = isPortrait ? 11 : (rowCount > 20 ? 10.5 : rowCount > 15 ? 11 : 12);
  const headerPadding = isPortrait ? "4px 6px" : (rowCount > 20 ? "3px 6px" : "5px 8px");
  const headerFontSize = isPortrait ? 10.5 : (rowCount > 20 ? 10 : 11);

  const cellL = (extra = {}) => ({ background: LEFT_BG, border: "1px solid #000", padding: cellPadding, fontSize: cellFontSize, ...extra });
  const cellB = (extra = {}) => ({ background: BANK_BG, border: "1px solid #000", padding: cellPadding, textAlign: "right", fontSize: cellFontSize, ...extra });
  const cellD = (extra = {}) => ({ background: DFTC_BG, border: "1px solid #000", padding: cellPadding, textAlign: "right", fontSize: cellFontSize, ...extra });

  return (
    <div
      className="font-sans bg-white px-5 py-3 w-full mx-auto box-border"
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        width: "100%",
        maxWidth: isPortrait ? "760px" : "1020px"
      }}
    >
      {isFirst && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>Davao Food Terminal Complex Price Monitoring</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 3 }}>Prevailing Market Prices as of {reportDate}</div>
          <div style={{ fontSize: 13, fontWeight: "bold", marginTop: 2 }}>Class A</div>
        </div>
      )}
      <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed", fontSize: cellFontSize }}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "34%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <ReportColumnHeaders headerPadding={headerPadding} headerFontSize={headerFontSize} />
        <tbody>
          {categories.map((cat, catIdx) => (
            <React.Fragment key={cat.name}>
              {catIdx > 0 && cat.name === "Rootcrops" && (
                <ColumnHeaderRows headerPadding={headerPadding} headerFontSize={headerFontSize} />
              )}
              <tr>
                <td
                  colSpan={8}
                  style={{
                    background: "#cbd5e1",
                    border: "1px solid #000",
                    padding: headerPadding,
                    fontWeight: "bold",
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    fontSize: cellFontSize + 0.5,
                    textAlign: "left",
                    letterSpacing: "0.5px"
                  }}
                >
                  {cat.name}
                </td>
              </tr>
              {cat.commodities.map((com) =>
                com.variants.map((v, vi) => (
                  <tr key={`${cat.name}-${com.name}-${vi}`}>
                    <td style={cellL({ textAlign: "center" })}>{vi === 0 ? com.no : ""}</td>
                    <td style={cellL({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                      {vi === 0 ? (
                        <><strong>{com.name}</strong>{" "}<span style={{ fontWeight: "normal" }}>{v.descriptor}</span></>
                      ) : (
                        <span style={{ paddingLeft: 16 }}>{v.descriptor}</span>
                      )}
                    </td>
                    <td style={cellL({ textAlign: "center" })}>{v.uom}</td>
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
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, paddingTop: 10, borderTop: "1px solid #000" }}>
          <div>
            <div style={{ fontSize: 10, marginBottom: 1 }}>Encoded by:</div>
            <div style={{ fontSize: 11, fontWeight: "bold", textDecoration: "underline" }}>{personnel.encodedBy}</div>
            <div style={{ fontSize: 10 }}>{personnel.encodedByRole}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, marginBottom: 1 }}>Reviewed by:</div>
            <div style={{ fontSize: 11, fontWeight: "bold", textDecoration: "underline" }}>{personnel.reviewedBy || personnel.preparedBy}</div>
            <div style={{ fontSize: 10 }}>{personnel.reviewedByRole || personnel.preparedByRole}</div>
          </div>
        </div>
      )}
      <div style={{ textAlign: "right", fontSize: 10, marginTop: 8, color: "#555" }}>Page {pageIndex + 1} of {totalPages}</div>
    </div>
  );
}

function PDFPreviewContent({ personnel, reportDate, categories, orientation = "landscape" }) {
  const isPortrait = orientation === "portrait";
  const groupList = isPortrait ? PDF_PORTRAIT_PAGE_CATEGORY_GROUPS : PDF_PAGE_CATEGORY_GROUPS;
  const pages = groupList.map((group) =>
    group.map((n) => categories.find((c) => c.name === n)).filter(Boolean)
  );
  const total = pages.length;

  return (
    <DFTCPreviewZoomContainer label={`PDF Document (Long ${isPortrait ? "Portrait" : "Landscape"})`}>
      <div className={`space-y-5 w-full ${isPortrait ? "max-w-[760px]" : "max-w-[1020px]"} mx-auto`}>
        {pages.map((cats, idx) => (
          <div key={idx} className="bg-white shadow-sm rounded-xl border border-[var(--hw-neutral-300)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-200)]">
              <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Page {idx + 1} of {total}</span>
              <span className="text-[12px] text-[var(--hw-neutral-800)]">Long {isPortrait ? "Portrait" : "Landscape"}</span>
            </div>
            <div className="w-full">
              <DFTCReportPage
                pageIndex={idx}
                totalPages={total}
                categories={cats}
                isFirst={idx === 0}
                isLast={idx === total - 1}
                reportDate={reportDate}
                personnel={idx === total - 1 ? personnel : void 0}
                orientation={orientation}
              />
            </div>
          </div>
        ))}
      </div>
    </DFTCPreviewZoomContainer>
  );
}

function ExcelPreviewContent({ personnel, reportDate, reportDateShort, categories }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return (
    <DFTCPreviewZoomContainer label="Microsoft Excel Workbook">
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
        <div className="bg-white">
          {PAGE_CATEGORY_GROUPS.map((group, idx) => {
            const cats = group.map((n) => categories.find((c) => c.name === n)).filter(Boolean);
            return <DFTCReportPage key={idx} pageIndex={idx} totalPages={total} categories={cats} isFirst={idx === 0} isLast={idx === total - 1} reportDate={reportDate} personnel={idx === total - 1 ? personnel : void 0} orientation="landscape" />;
          })}
        </div>
        <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
          <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[12px] font-medium text-[#217346] -mb-1.5">Price Monitoring</div>
        </div>
      </div>
    </DFTCPreviewZoomContainer>
  );
}

function IMGPreview({ page, onPageChange, personnel, reportDate, categories }) {
  const total = IMG_PAGE_CATEGORY_GROUPS.length; // strictly 4
  const currentCats = IMG_PAGE_CATEGORY_GROUPS[page].map((name) => categories.find((c) => c.name === name)).filter(Boolean);

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

      <DFTCPreviewZoomContainer label={`Facebook Image ${page + 1} of ${total}`}>
        <DFTCFacebookImageCard
          pageIndex={page}
          totalPages={total}
          categories={currentCats}
          reportDate={reportDate}
          personnel={page === total - 1 ? personnel : void 0}
          isLast={page === total - 1}
        />
      </DFTCPreviewZoomContainer>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide mb-1">Encoded by</p>
          <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{personnel.encodedBy}</p>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">{personnel.encodedByRole}</p>
        </div>
        <div className="p-3.5 bg-white border border-[var(--hw-neutral-200)] rounded-xl">
          <p className="text-[11px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide mb-1">Reviewed by</p>
          <p className="text-[13px] font-bold text-[var(--hw-neutral-900)]">{personnel.reviewedBy || personnel.preparedBy}</p>
          <p className="text-[12px] text-[var(--hw-neutral-700)]">{personnel.reviewedByRole || personnel.preparedByRole}</p>
        </div>
      </div>
    </div>
  );
}

function DFTCFilePreview({ file, onClose }) {
  const [format, setFormat] = useState("IMG");
  const [orientation, setOrientation] = useState("landscape");
  const [imgPage, setImgPage] = useState(0);
  const [dlState, setDlState] = useState("idle");
  const [personnel, setPersonnel] = useState(() => ({
    encodedBy: file.encodedBy || DEFAULT_PERSONNEL.encodedBy,
    encodedByRole: file.encodedByRole || DEFAULT_PERSONNEL.encodedByRole,
    preparedBy: file.reviewedBy || file.preparedBy || DEFAULT_PERSONNEL.preparedBy,
    preparedByRole: file.reviewedByRole || file.preparedByRole || DEFAULT_PERSONNEL.preparedByRole,
    reviewedBy: file.reviewedBy || file.preparedBy || DEFAULT_PERSONNEL.reviewedBy,
    reviewedByRole: file.reviewedByRole || file.preparedByRole || DEFAULT_PERSONNEL.reviewedByRole
  }));

  const pageRefs = useRef([]);

  const reportingDateShort = formatDisplayDateShort(file.reportingDate || file.savedDate);

  const { data: reportPreviewData } = useQuery({
    queryKey: ["dftc-report-preview", reportingDateShort],
    queryFn: async () => {
      const res = await apiGet(`/dftc/reports/preview?date=${reportingDateShort}`);
      return parseResponse(res);
    },
    enabled: !!reportingDateShort
  });

  const backendEncodedBy = reportPreviewData?.encoded_by && reportPreviewData.encoded_by !== "DFTC Encoder"
    ? reportPreviewData.encoded_by
    : null;
  const backendPreparedBy = reportPreviewData?.prepared_by && reportPreviewData.prepared_by !== "DFTC Officer"
    ? reportPreviewData.prepared_by
    : null;

  useEffect(() => {
    setPersonnel((prev) => ({
      encodedBy: file.encodedBy || backendEncodedBy || prev.encodedBy || DEFAULT_PERSONNEL.encodedBy,
      encodedByRole: file.encodedByRole || prev.encodedByRole || DEFAULT_PERSONNEL.encodedByRole,
      preparedBy: file.reviewedBy || file.preparedBy || backendPreparedBy || prev.preparedBy || DEFAULT_PERSONNEL.preparedBy,
      preparedByRole: file.reviewedByRole || file.preparedByRole || prev.preparedByRole || DEFAULT_PERSONNEL.preparedByRole,
      reviewedBy: file.reviewedBy || file.preparedBy || backendPreparedBy || prev.reviewedBy || DEFAULT_PERSONNEL.reviewedBy,
      reviewedByRole: file.reviewedByRole || file.preparedByRole || prev.reviewedByRole || DEFAULT_PERSONNEL.reviewedByRole
    }));
  }, [file, backendEncodedBy, backendPreparedBy]);

  const resolvedCategories = useMemo(() => {
    const lookup = buildRowsLookup(reportPreviewData?.rows);
    return (reportPreviewData?.categories ?? []).map((cat) => ({
      name: cat.name,
      commodities: cat.commodities.map((com) => ({
        no: com.no,
        name: com.name,
        variants: com.variants.map((v) => {
          const row = resolvePriceRow(com, v.variety, lookup);
          return {
            descriptor: v.variety ? `(${v.variety})` : "",
            uom: v.uom || com.uom || "kg",
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
  const encodedByName = file.encodedBy || backendEncodedBy || getEncodedByName(file);
  const reviewedByName = personnel.reviewedBy || personnel.preparedBy || backendPreparedBy || file.reviewedBy || file.preparedBy || "—";

  async function downloadImages() {
    setDlState("generating-img");
    try {
      const JSZip = (await import("jszip")).default;
      const blobs = [];
      const total = IMG_PAGE_CATEGORY_GROUPS.length; // strictly 4
      for (let i = 0; i < total; i++) {
        // Drawn on a native canvas from the same layout numbers as the preview card
        const cats = IMG_PAGE_CATEGORY_GROUPS[i]
          .map((n) => resolvedCategories.find((c) => c.name === n))
          .filter(Boolean);
        const canvas = renderFBCardToCanvas(
          {
            categories: cats,
            reportDate: reportingDate,
            personnel: i === total - 1 ? personnel : undefined,
            isLast: i === total - 1
          },
          2
        );
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

      const isPortrait = orientation === "portrait";
      // Philippine Long bond paper: 8.5 x 13 in = 215.9 x 330.2 mm
      const longPaper = [215.9, 330.2];
      const pdf = new jsPDF({
        orientation: isPortrait ? "portrait" : "landscape",
        unit: "mm",
        format: longPaper
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const marginX = isPortrait ? 10 : 14;
      const marginY = 12;
      const targetW = pdfW - marginX * 2;

      const total = activeCategoryGroups.length;
      const canvases = [];
      for (let i = 0; i < total; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        canvases.push(canvas);
      }

      if (canvases.length > 0) {
        // Uniform scale based on targetW and maxH so every single page renders at the exact same table width
        // and is guaranteed to fit within the printable height without cropping.
        const baseCanvasWidth = canvases[0]?.width || (isPortrait ? 1520 : 2040);
        const pdfH = pdf.internal.pageSize.getHeight();
        const maxH = pdfH - marginY * 2;
        const maxCanvasHeight = Math.max(...canvases.map((c) => c.height));
        const uniformRatio = Math.min(targetW / baseCanvasWidth, maxH / maxCanvasHeight);
        const w = baseCanvasWidth * uniformRatio;
        const x = (pdfW - w) / 2;

        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i];
          if (i > 0) pdf.addPage(longPaper, isPortrait ? "portrait" : "landscape");

          const h = canvas.height * uniformRatio;
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, marginY, w, h);
        }
      }
      const pdfFilename = buildReportExportFilename({
        market: "DFTC Taboan",
        reportType: "Price",
        period: "Daily",
        dateStr: reportingDateShort,
        ext: "pdf"
      });
      pdf.save(pdfFilename);
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
        pageSetup: { orientation: orientation, paperSize: 14, fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
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
        if (cat.name === "Rootcrops") {
          ws.addRow([]);
          const hR1 = ws.addRow(["No.", "Commodity", "UOM", "BANKEROHAN MARKET", "", "", "DFTC TABOAN", ""]);
          ws.mergeCells(`A${hR1.number}:A${hR1.number + 1}`);
          ws.mergeCells(`B${hR1.number}:B${hR1.number + 1}`);
          ws.mergeCells(`C${hR1.number}:C${hR1.number + 1}`);
          ws.mergeCells(`D${hR1.number}:F${hR1.number}`);
          ws.mergeCells(`G${hR1.number}:H${hR1.number}`);
          const hR2 = ws.addRow(["", "", "", "Landing", "Wholesale", "Retail", "Wholesale", "Retail"]);
          applyHStyle(hR1, [1, 2, 3], LEFT_BG);
          applyHStyle(hR1, [4, 5, 6], BANK_BG);
          applyHStyle(hR1, [7, 8], DFTC_BG);
          applyHStyle(hR2, [1, 2, 3], LEFT_BG);
          applyHStyle(hR2, [4, 5, 6], BANK_BG);
          applyHStyle(hR2, [7, 8], DFTC_BG);
        }
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
      const pRow1 = ws.addRow(["Encoded by:", "", "", "", "", "Reviewed by:", "", ""]);
      pRow1.getCell(1).font = { bold: false };
      pRow1.getCell(6).font = { bold: false };
      const pRow2 = ws.addRow([personnel.encodedBy, "", "", "", "", personnel.reviewedBy || personnel.preparedBy, "", ""]);
      pRow2.getCell(1).font = { bold: true, underline: true };
      pRow2.getCell(6).font = { bold: true, underline: true };
      ws.mergeCells(`A${pRow2.number}:E${pRow2.number}`);
      ws.mergeCells(`F${pRow2.number}:H${pRow2.number}`);
      const pRow3 = ws.addRow([personnel.encodedByRole, "", "", "", "", personnel.reviewedByRole || personnel.preparedByRole, "", ""]);
      ws.mergeCells(`A${pRow3.number}:E${pRow3.number}`);
      ws.mergeCells(`F${pRow3.number}:H${pRow3.number}`);
      ws.pageSetup.printArea = `A1:H${ws.rowCount}`;

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const excelFilename = buildReportExportFilename({
        market: "DFTC Taboan",
        reportType: "Price",
        period: "Daily",
        dateStr: reportingDateShort,
        ext: "xlsx"
      });
      triggerDownload(url, excelFilename);
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

  const countPopulatedPriceRows = useMemo(() => {
    let count = 0;
    for (const cat of resolvedCategories) {
      for (const com of cat.commodities) {
        for (const v of com.variants) {
          if (v.bankLanding || v.bankWholesale || v.bankRetail || v.dftcWholesale || v.dftcRetail) {
            count++;
          }
        }
      }
    }
    return count;
  }, [resolvedCategories]);

  const recordsIncluded = Math.max(
    countPopulatedPriceRows,
    Number(file.records) || 0
  );

  const isPortrait = orientation === "portrait";
  const activeCategoryGroups = format === "PDF"
    ? (isPortrait ? PDF_PORTRAIT_PAGE_CATEGORY_GROUPS : PDF_PAGE_CATEGORY_GROUPS)
    : IMG_PAGE_CATEGORY_GROUPS;

  return (
    <DFTCReportShell
      title="Preview Daily Report"
      subtitle={`DFTC Price Monitoring — ${reportingDate}`}
      onClose={onClose}
      metaFields={[
        ["Report ID", reportReference],
        ["Reporting Date", reportingDate],
        ["Class", "A"],
        ["Records Included", String(recordsIncluded || 1)],
        ["Saved Date", file.savedDate || "—"],
        ["Encoded By", encodedByName],
        ["Prepared By", reviewedByName]
      ]}
      format={format}
      onFormatChange={setFormat}
      orientation={orientation}
      onOrientationChange={setOrientation}
      showOrientation={true}
      personnel={personnel}
      onPersonnelChange={setPersonnel}
      downloadLabel={dlLabel}
      onDownload={handleDownload}
      isGenerating={isGenerating}
      isError={isError}
      errorLabel={errorFormat === "PDF" ? "PDF" : errorFormat === "EXCEL" ? "Excel" : "Image"}
      onRetryDownload={() => setDlState("idle")}
      renderHiddenPages={() =>
        activeCategoryGroups.map((group, idx) => {
          const cats = group.map((n) => resolvedCategories.find((c) => c.name === n)).filter(Boolean);
          if (format === "IMG") {
            return (
              <div
                key={idx}
                ref={(el) => { pageRefs.current[idx] = el; }}
                style={{ width: 1040 }}
              >
                <DFTCFacebookImageCard
                  pageIndex={idx}
                  totalPages={activeCategoryGroups.length}
                  categories={cats}
                  reportDate={reportingDate}
                  personnel={idx === activeCategoryGroups.length - 1 ? personnel : void 0}
                  isLast={idx === activeCategoryGroups.length - 1}
                />
              </div>
            );
          }
          return (
            <div
              key={idx}
              ref={(el) => { pageRefs.current[idx] = el; }}
              style={{ width: isPortrait ? 760 : 1020 }}
            >
              <DFTCReportPage
                pageIndex={idx}
                totalPages={activeCategoryGroups.length}
                categories={cats}
                isFirst={idx === 0}
                isLast={idx === activeCategoryGroups.length - 1}
                reportDate={reportingDate}
                personnel={idx === activeCategoryGroups.length - 1 ? personnel : void 0}
                orientation={orientation}
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
      {format === "PDF" && (
        <PDFPreviewContent
          personnel={personnel}
          reportDate={reportingDate}
          categories={resolvedCategories}
          orientation={orientation}
        />
      )}
      {format === "Excel" && (
        <ExcelPreviewContent
          personnel={personnel}
          reportDate={reportingDate}
          reportDateShort={reportingDateShort}
          categories={resolvedCategories}
        />
      )}
    </DFTCReportShell>
  );
}

export { DFTCFilePreview, buildRowsLookup, normalizeKey, resolvePriceRow, DEFAULT_PERSONNEL };
