import React, { useState, useRef, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGet, parseResponse } from "../../global/api";
import { DFTCReportShell, DEFAULT_PERSONNEL } from "./DFTCReportShell";
import { DFTCPreviewZoomContainer } from "./DFTCPreviewZoomContainer";
import { buildReportExportFilename } from "./dftcReportExport";

// Colors exactly matching DFTC-VOLUME-2025-Final.xlsx (OVERALL TOTAL sheet):
// FARM SOURCE: #FF99FF (pink/magenta)
// OTHER SOURCES: #92D050 (lime green)
// OVERALL TOTAL: #FFFF00 (bright yellow)
const FARM_BG = "#ff99ff";
const OTHER_BG = "#92d050";
const TOTAL_BG = "#ffff00";
const TOTAL_CELL_BG = "#ffffea";
const BORDER_COLOR = "#000000";

// For blank cells, do not add "-" or "—", just leave it blank
function numStr(value) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pctStr(vol, total) {
  if (vol === null || vol === undefined || vol === "" || total === null || total === undefined) return "";
  const n = Number(vol);
  const t = Number(total);
  if (!Number.isFinite(n) || !Number.isFinite(t) || t === 0 || n === 0) return "";
  return `${((n / t) * 100).toFixed(2)}%`;
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

function formatDisplayMonthYear(dateStr) {
  if (!dateStr) return "January to December 2025";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const month = d.toLocaleDateString("en-PH", { month: "long" });
      const year = d.getFullYear();
      return `${month} ${year}`;
    }
  } catch {}
  return String(dateStr);
}

function formatDisplayDateShort(dateStr) {
  if (!dateStr) return "";
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

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Arrival-volume report page, styled to match the official DFTC volume
 * workbook (DFTC-VOLUME-2025-Final.xlsx):
 * - Fixed 1020px landscape sheet width across ALL pages (preventing table width inconsistency)
 * - Pink FARM SOURCE (#FF99FF), Green OTHER SOURCES (#92D050), Yellow OVERALL TOTAL (#FFFF00)
 * - Volume (kg) and Percentage (%) sub-columns
 * - Thin black cell borders throughout
 * - Leaves blank cells empty (no "-")
 * - Official Encoded by & Reviewed by signature block on the last sheet
 */
function ArrivalVolumeReportPage({
  pageIndex,
  totalPages,
  rows,
  offset,
  isFirst,
  isLast,
  reportDate,
  monthYearStr,
  personnel,
  totalVolume,
  totalFarmVolume,
  totalOtherVolume
}) {
  const cellBorder = { border: `1px solid ${BORDER_COLOR}` };
  const cellBase = (extra = {}) => ({
    ...cellBorder,
    padding: "4px 8px",
    fontSize: 12,
    fontFamily: "Tahoma, Arial, sans-serif",
    ...extra
  });

  const cellHeader = (bg, extra = {}) => ({
    ...cellBorder,
    background: bg,
    padding: "5px 6px",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
    verticalAlign: "middle",
    fontFamily: "Tahoma, Arial, sans-serif",
    ...extra
  });

  return (
    <div
      className="bg-white px-5 py-4 w-full max-w-[1020px] mx-auto box-border"
      style={{ fontFamily: "Tahoma, Arial, sans-serif", width: "100%", maxWidth: "1020px" }}
    >
      {isFirst && (
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: "bold", textTransform: "uppercase", lineHeight: 1.3 }}>
            VOLUME (KG) OF COMMODITIES DROPPED AT DFTC
          </div>
          <div style={{ fontSize: 12, marginTop: 3 }}>
            For the Month of {monthYearStr || reportDate}
          </div>
        </div>
      )}

      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "14%" }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...cellHeader("#ffffff"), width: "6%" }}>No.</th>
            <th rowSpan={2} style={{ ...cellHeader("#ffffff"), textAlign: "left", width: "30%" }}>Commodity</th>
            <th colSpan={2} style={cellHeader(FARM_BG)}>
              <span>Farm Source</span>
              <span style={{ display: "none" }}>VOLUME BY SOURCE (KG)</span>
            </th>
            <th colSpan={2} style={cellHeader(OTHER_BG)}>
              <span>Other Sources</span>
            </th>
            <th rowSpan={2} style={cellHeader(TOTAL_BG)}>
              <span>Overall Total</span>
              <span style={{ display: "none" }}>OVERALL</span>
            </th>
          </tr>
          <tr>
            <th style={cellHeader(FARM_BG)}>Volume (kg)</th>
            <th style={cellHeader(FARM_BG)}>Percentage (%)</th>
            <th style={cellHeader(OTHER_BG)}>Volume (kg)</th>
            <th style={cellHeader(OTHER_BG)}>Percentage (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const farmVol = r.farm_source_volume_kg;
            const otherVol = r.other_source_volume_kg;
            const hasData = farmVol != null || otherVol != null || r.volume_kg != null;
            const rowTotal = r.volume_kg != null
              ? r.volume_kg
              : hasData
              ? (Number(farmVol) || 0) + (Number(otherVol) || 0)
              : null;

            return (
              <tr key={`${r.commodity_name}-${r.variety}-${offset + i}`}>
                <td style={cellBase({ textAlign: "center" })}>{offset + i + 1}</td>
                <td style={cellBase({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                  <strong>{r.commodity_name || "—"}</strong>
                  {r.variety && r.variety !== "Regular" && (
                    <span style={{ fontWeight: "normal" }}> ({r.variety})</span>
                  )}
                </td>
                <td style={cellBase({ textAlign: "right" })}>{numStr(farmVol)}</td>
                <td style={cellBase({ textAlign: "center" })}>{pctStr(farmVol, rowTotal)}</td>
                <td style={cellBase({ textAlign: "right" })}>{numStr(otherVol)}</td>
                <td style={cellBase({ textAlign: "center" })}>{pctStr(otherVol, rowTotal)}</td>
                <td style={cellBase({ textAlign: "right", fontWeight: "bold", background: rowTotal ? TOTAL_CELL_BG : "transparent" })}>
                  {numStr(rowTotal)}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={cellBase({ textAlign: "center", fontStyle: "italic", padding: "16px" })}>
                No volume records for this submission.
              </td>
            </tr>
          )}
          {isLast && (
            <tr>
              <td style={cellBase({ textAlign: "center" })}></td>
              <td style={cellBase({ textAlign: "left", fontWeight: "bold" })}>TOTAL</td>
              <td style={cellBase({ textAlign: "right", fontWeight: "bold" })}>{numStr(totalFarmVolume)}</td>
              <td style={cellBase({ textAlign: "center", fontWeight: "bold" })}>{pctStr(totalFarmVolume, totalVolume)}</td>
              <td style={cellBase({ textAlign: "right", fontWeight: "bold" })}>{numStr(totalOtherVolume)}</td>
              <td style={cellBase({ textAlign: "center", fontWeight: "bold" })}>{pctStr(totalOtherVolume, totalVolume)}</td>
              <td style={cellBase({ textAlign: "right", fontWeight: "bold", background: TOTAL_BG })}>
                {numStr(totalVolume)}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {isLast && personnel && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, paddingTop: 8, borderTop: "1px solid #000" }}>
          <div>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Encoded by:</div>
            <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline" }}>{personnel.encodedBy}</div>
            <div style={{ fontSize: 11 }}>{personnel.encodedByRole}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, marginBottom: 2 }}>Reviewed by:</div>
            <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline" }}>
              {personnel.reviewedBy || personnel.preparedBy}
            </div>
            <div style={{ fontSize: 11 }}>{personnel.reviewedByRole || personnel.preparedByRole}</div>
          </div>
        </div>
      )}
      <div style={{ textAlign: "right", fontSize: 10, marginTop: 6, color: "#555" }}>
        Page {pageIndex + 1} of {totalPages}
      </div>
    </div>
  );
}

// A row carries data when any of the three volume columns is non-null. `!= null`
// rather than truthiness: the entry screen saves 0 as null but `volume_kg` is written
// as the computed farm+other, so a commodity the encoder reported as zero arrives as 0.0.
function arrivalRowIsPopulated(row) {
  return row.farm_source_volume_kg != null
    || row.other_source_volume_kg != null
    || row.volume_kg != null;
}

function countPopulatedArrivalRows(rows) {
  let n = 0;
  for (const r of rows) if (arrivalRowIsPopulated(r)) n++;
  return n;
}

/**
 * Preview for an arrival-volume submission.
 *
 * Faithfully mirrors `excel_uploads/DFTC-VOLUME-2025-Final.xlsx`:
 * - Strictly landscape mode
 * - Fixed 1020px table width across all pages (zero width distortion or discrepancy on last page)
 * - Pink (#FF99FF) for Farm Source, Green (#92D050) for Other Sources, Yellow (#FFFF00) for Overall Total
 * - Volume (kg) and Percentage (%) columns
 * - Blank cells are left empty (no "-")
 * - Strictly 4 images for IMG format
 * - Multi-page, un-cramped PDF on Philippine Long bond paper (8.5 x 13 in)
 * - Complete Excel workbook export matching the original workbook (including rankings)
 */
function DFTCArrivalPreview({ file, onClose }) {
  const [format, setFormat] = useState("IMG");
  const [orientation, setOrientation] = useState("landscape");
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

  const { data: reportPreviewData, isLoading: previewLoading, isError: previewError } = useQuery({
    queryKey: ["dftc-arrival-report-preview", submissionId],
    queryFn: async () => {
      const res = await apiGet(
        `/dftc/reports/arrival-preview?submission_id=${encodeURIComponent(submissionId)}`
      );
      return parseResponse(res);
    },
    enabled: !!submissionId
  });

  const backendEncodedBy = reportPreviewData?.encoded_by && reportPreviewData.encoded_by !== "DFTC Encoder"
    ? reportPreviewData.encoded_by
    : null;
  const backendPreparedBy = reportPreviewData?.prepared_by && reportPreviewData.prepared_by !== "DFTC Officer"
    ? reportPreviewData.prepared_by
    : null;

  useEffect(() => {
    setPersonnel((prev) => ({
      encodedBy: backendEncodedBy || file?.encodedBy || prev.encodedBy || DEFAULT_PERSONNEL.encodedBy,
      encodedByRole: file?.encodedByRole || prev.encodedByRole || DEFAULT_PERSONNEL.encodedByRole,
      preparedBy: backendPreparedBy || file?.reviewedBy || file?.preparedBy || prev.preparedBy || DEFAULT_PERSONNEL.preparedBy,
      preparedByRole: file?.reviewedByRole || file?.preparedByRole || prev.preparedByRole || DEFAULT_PERSONNEL.preparedByRole,
      reviewedBy: backendPreparedBy || file?.reviewedBy || file?.preparedBy || prev.reviewedBy || DEFAULT_PERSONNEL.reviewedBy,
      reviewedByRole: file?.reviewedByRole || file?.preparedByRole || prev.reviewedByRole || DEFAULT_PERSONNEL.reviewedByRole
    }));
  }, [file, backendEncodedBy, backendPreparedBy]);

  const rows = useMemo(() => reportPreviewData?.rows ?? [], [reportPreviewData]);

  const totalFarmVolume = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.farm_source_volume_kg) || 0), 0),
    [rows]
  );
  const totalOtherVolume = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.other_source_volume_kg) || 0), 0),
    [rows]
  );
  const totalVolume = useMemo(
    () => rows.reduce((sum, r) => {
      const v = r.volume_kg != null
        ? Number(r.volume_kg)
        : (Number(r.farm_source_volume_kg) || 0) + (Number(r.other_source_volume_kg) || 0);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0),
    [rows]
  );

  const reportingDateShort = formatDisplayDateShort(submission?.reporting_date || file.reportingDate);
  const reportingDate = formatDisplayDate(submission?.reporting_date || file.reportingDate);
  const monthYearStr = formatDisplayMonthYear(submission?.reporting_date || file.reportingDate);

  // For image format: strictly 4 images for large catalogue, single image for small dataset
  const imgPages = useMemo(() => {
    const count = rows.length > 22 ? 4 : 1;
    const perPage = Math.max(1, Math.ceil(rows.length / count));
    const out = [];
    for (let i = 0; i < count; i++) {
      out.push({
        rows: rows.slice(i * perPage, (i + 1) * perPage),
        offset: i * perPage
      });
    }
    return out;
  }, [rows]);

  // For PDF format: comfortable un-cramped rows per page (18 rows/page in landscape)
  const pdfRowsPerPage = 18;
  const totalPdfPages = Math.max(1, Math.ceil(rows.length / pdfRowsPerPage));
  const pdfPages = useMemo(() => {
    const out = [];
    for (let i = 0; i < totalPdfPages; i++) {
      out.push({
        rows: rows.slice(i * pdfRowsPerPage, (i + 1) * pdfRowsPerPage),
        offset: i * pdfRowsPerPage
      });
    }
    return out;
  }, [rows, pdfRowsPerPage, totalPdfPages]);

  async function downloadImages() {
    setDlState("generating-img");
    try {
      const html2canvas = (await import("html2canvas")).default;
      const JSZip = (await import("jszip")).default;
      const blobs = [];
      const count = imgPages.length; // strictly 4
      for (let i = 0; i < count; i++) {
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
        triggerDownload(URL.createObjectURL(blobs[0]), `${base}-Page-1.png`);
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

      const isPortrait = orientation === "portrait";
      // Long bond paper: 8.5 x 13 in = 215.9 x 330.2 mm
      const longPaper = [215.9, 330.2];
      const pdf = new jsPDF({
        orientation: isPortrait ? "portrait" : "landscape",
        unit: "mm",
        format: longPaper
      });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = isPortrait ? 8 : 10;
      const maxW = pdfW - margin * 2;
      const maxH = pdfH - margin * 2;

      const canvases = [];
      for (let i = 0; i < totalPdfPages; i++) {
        const el = pageRefs.current[i];
        if (!el) continue;
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
        canvases.push(canvas);
      }

      if (canvases.length > 0) {
        const baseCanvasWidth = canvases[0]?.width || 2040;
        const maxCanvasHeight = Math.max(...canvases.map((c) => c.height));

        const uniformRatio = Math.min(maxW / baseCanvasWidth, maxH / maxCanvasHeight);
        const w = baseCanvasWidth * uniformRatio;
        const x = (pdfW - w) / 2;
        const y = margin;

        for (let i = 0; i < canvases.length; i++) {
          const canvas = canvases[i];
          if (i > 0) pdf.addPage(longPaper, isPortrait ? "portrait" : "landscape");

          const h = canvas.height * uniformRatio;
          pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h);
        }
      }
      const pdfFilename = buildReportExportFilename({
        market: file.sourceName || file.market || "DFTC",
        reportType: "Arrival",
        period: "Daily",
        dateStr: reportingDateShort || file.savedDate,
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

      const ws = wb.addWorksheet("OVERALL TOTAL", {
        pageSetup: {
          orientation: orientation,
          paperSize: 14,
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
          margins: { left: 0.25, right: 0.25, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 }
        }
      });

      ws.columns = [
        { key: "no", width: 8 },
        { key: "commodity", width: 32 },
        { key: "farmVol", width: 22 },
        { key: "farmPct", width: 18 },
        { key: "otherVol", width: 22 },
        { key: "otherPct", width: 18 },
        { key: "totalVol", width: 22 }
      ];

      const borderThin = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" }
      };

      // Row 1: Title
      const r1 = ws.addRow(["VOLUME (KG) OF COMMODITIES DROPPED AT DFTC"]);
      r1.font = { bold: true, size: 12, name: "Tahoma" };
      r1.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(`A${r1.number}:G${r1.number}`);

      // Row 2: Subtitle
      const r2 = ws.addRow([`For the Month of ${monthYearStr || reportingDate}`]);
      r2.font = { size: 12, name: "Tahoma" };
      r2.alignment = { horizontal: "center", vertical: "middle" };
      ws.mergeCells(`A${r2.number}:G${r2.number}`);

      // Row 3: Blank
      ws.addRow([]);

      // Row 4 & 5: Banded Headers
      const hRow1 = ws.addRow(["No.", "Commodity", "FARM SOURCE", "", "OTHER SOURCES", "", "OVERALL TOTAL"]);
      const hRow2 = ws.addRow(["", "", "Volume (kg)", "Percentage (%)", "Volume (kg)", "Percentage (%)", ""]);

      ws.mergeCells(`A${hRow1.number}:A${hRow2.number}`);
      ws.mergeCells(`B${hRow1.number}:B${hRow2.number}`);
      ws.mergeCells(`C${hRow1.number}:D${hRow1.number}`);
      ws.mergeCells(`E${hRow1.number}:F${hRow1.number}`);
      ws.mergeCells(`G${hRow1.number}:G${hRow2.number}`);

      const applyHeaderStyle = (cell, bg, isBold = true) => {
        cell.font = { bold: isBold, size: 11, name: "Tahoma" };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = borderThin;
        if (bg) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${bg.replace("#", "")}` } };
        }
      };

      [hRow1, hRow2].forEach((row) => {
        applyHeaderStyle(row.getCell(1), null);
        applyHeaderStyle(row.getCell(2), null);
        applyHeaderStyle(row.getCell(3), FARM_BG);
        applyHeaderStyle(row.getCell(4), FARM_BG);
        applyHeaderStyle(row.getCell(5), OTHER_BG);
        applyHeaderStyle(row.getCell(6), OTHER_BG);
        applyHeaderStyle(row.getCell(7), TOTAL_BG);
      });

      // Rows 6+: Data rows
      const dataStartRow = 6;
      rows.forEach((r, i) => {
        const rowNum = dataStartRow + i;
        const farmVal = r.farm_source_volume_kg != null ? Number(r.farm_source_volume_kg) : 0;
        const otherVal = r.other_source_volume_kg != null ? Number(r.other_source_volume_kg) : 0;
        const commodityName = r.variety && r.variety !== "Regular"
          ? `${r.commodity_name || ""} (${r.variety})`
          : r.commodity_name || "";

        const dataRow = ws.addRow([
          i + 1,
          commodityName,
          farmVal > 0 ? farmVal : (r.farm_source_volume_kg != null ? 0 : ""),
          { formula: `IF(G${rowNum}>0, C${rowNum}/G${rowNum}, 0)`, result: (farmVal + otherVal) > 0 ? farmVal / (farmVal + otherVal) : 0 },
          otherVal > 0 ? otherVal : (r.other_source_volume_kg != null ? 0 : ""),
          { formula: `IF(G${rowNum}>0, E${rowNum}/G${rowNum}, 0)`, result: (farmVal + otherVal) > 0 ? otherVal / (farmVal + otherVal) : 0 },
          { formula: `C${rowNum}+E${rowNum}`, result: farmVal + otherVal }
        ]);

        dataRow.font = { size: 11, name: "Tahoma" };

        const c1 = dataRow.getCell(1);
        c1.alignment = { horizontal: "center", vertical: "middle" };
        c1.border = borderThin;

        const c2 = dataRow.getCell(2);
        c2.alignment = { horizontal: "left", vertical: "middle" };
        c2.border = borderThin;

        const c3 = dataRow.getCell(3);
        c3.numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        c3.alignment = { horizontal: "right", vertical: "middle" };
        c3.border = borderThin;

        const c4 = dataRow.getCell(4);
        c4.numFmt = "0.00%";
        c4.alignment = { horizontal: "center", vertical: "middle" };
        c4.border = borderThin;

        const c5 = dataRow.getCell(5);
        c5.numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        c5.alignment = { horizontal: "right", vertical: "middle" };
        c5.border = borderThin;

        const c6 = dataRow.getCell(6);
        c6.numFmt = "0.00%";
        c6.alignment = { horizontal: "center", vertical: "middle" };
        c6.border = borderThin;

        const c7 = dataRow.getCell(7);
        c7.numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        c7.alignment = { horizontal: "right", vertical: "middle" };
        c7.border = borderThin;
      });

      // Total Row
      const dataEndRow = dataStartRow + rows.length - 1;
      const totRowNum = dataEndRow + 1;
      const totalRow = ws.addRow([
        "",
        "TOTAL",
        { formula: `SUM(C${dataStartRow}:C${dataEndRow})`, result: totalFarmVolume },
        totalVolume > 0 ? { formula: `C${totRowNum}/G${totRowNum}`, result: totalFarmVolume / totalVolume } : 0,
        { formula: `SUM(E${dataStartRow}:E${dataEndRow})`, result: totalOtherVolume },
        totalVolume > 0 ? { formula: `E${totRowNum}/G${totRowNum}`, result: totalOtherVolume / totalVolume } : 0,
        { formula: `SUM(G${dataStartRow}:G${dataEndRow})`, result: totalVolume }
      ]);

      totalRow.font = { bold: true, size: 11, name: "Tahoma" };
      for (let c = 1; c <= 7; c++) {
        const cell = totalRow.getCell(c);
        cell.border = borderThin;
        if (c === 2) cell.alignment = { horizontal: "left", vertical: "middle" };
        else if (c === 3 || c === 5 || c === 7) {
          cell.alignment = { horizontal: "right", vertical: "middle" };
          cell.numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        } else if (c === 4 || c === 6) {
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.numFmt = "0.00%";
        }
      }
      totalRow.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${TOTAL_BG.replace("#", "")}` } };

      ws.pageSetup.printArea = `A1:G${totRowNum}`;

      // Append Rankings Sections
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);

      const sortedByTotal = [...rows]
        .map((r) => {
          const v = r.volume_kg != null
            ? Number(r.volume_kg)
            : (Number(r.farm_source_volume_kg) || 0) + (Number(r.other_source_volume_kg) || 0);
          return { name: r.commodity_name, variety: r.variety, volume: v };
        })
        .sort((a, b) => b.volume - a.volume);

      const rk1Title = ws.addRow([`Highest to Lowest Commodity Volume (kg) as of ${monthYearStr || reportingDate}`]);
      rk1Title.font = { bold: true, size: 11, name: "Tahoma" };
      ws.addRow([]);

      const rk1Header = ws.addRow(["No.", "Commodity", "Volume (kg)", "Percentage (%)"]);
      rk1Header.font = { bold: true, size: 11, name: "Tahoma" };
      [1, 2, 3, 4].forEach((c) => {
        rk1Header.getCell(c).border = borderThin;
        rk1Header.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      });

      sortedByTotal.forEach((item, idx) => {
        const itemRow = ws.addRow([
          idx + 1,
          item.variety && item.variety !== "Regular" ? `${item.name} (${item.variety})` : item.name,
          item.volume,
          totalVolume > 0 ? item.volume / totalVolume : 0
        ]);
        itemRow.font = { size: 11, name: "Tahoma" };
        itemRow.getCell(1).alignment = { horizontal: "center" };
        itemRow.getCell(2).alignment = { horizontal: "left" };
        itemRow.getCell(3).alignment = { horizontal: "right" };
        itemRow.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        itemRow.getCell(4).alignment = { horizontal: "center" };
        itemRow.getCell(4).numFmt = "0.00%";
        [1, 2, 3, 4].forEach((c) => { itemRow.getCell(c).border = borderThin; });
      });

      const rk1Tot = ws.addRow(["", "TOTAL", totalVolume, totalVolume > 0 ? 1 : 0]);
      rk1Tot.font = { bold: true, size: 11, name: "Tahoma" };
      rk1Tot.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
      rk1Tot.getCell(4).numFmt = "0.00%";
      [1, 2, 3, 4].forEach((c) => { rk1Tot.getCell(c).border = borderThin; });

      // Ranking 2: Farm Source Volume
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);

      const sortedByFarm = [...rows]
        .map((r) => ({
          name: r.commodity_name,
          variety: r.variety,
          volume: Number(r.farm_source_volume_kg) || 0
        }))
        .sort((a, b) => b.volume - a.volume);

      const rk2Title = ws.addRow([`Highest to Lowest Commodity Volume (kg) as of ${monthYearStr || reportingDate}`]);
      rk2Title.font = { bold: true, size: 11, name: "Tahoma" };
      const rk2Sub = ws.addRow(["Sources: Direct from the farm of DFTC Vendor-farmers"]);
      rk2Sub.font = { italic: true, size: 10, name: "Tahoma" };
      ws.addRow([]);

      const rk2Header = ws.addRow(["No.", "Commodity", "Volume", "Percentage (%)"]);
      rk2Header.font = { bold: true, size: 11, name: "Tahoma" };
      [1, 2, 3, 4].forEach((c) => {
        rk2Header.getCell(c).border = borderThin;
        rk2Header.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      });

      sortedByFarm.forEach((item, idx) => {
        const itemRow = ws.addRow([
          idx + 1,
          item.variety && item.variety !== "Regular" ? `${item.name} (${item.variety})` : item.name,
          item.volume,
          totalFarmVolume > 0 ? item.volume / totalFarmVolume : 0
        ]);
        itemRow.font = { size: 11, name: "Tahoma" };
        itemRow.getCell(1).alignment = { horizontal: "center" };
        itemRow.getCell(2).alignment = { horizontal: "left" };
        itemRow.getCell(3).alignment = { horizontal: "right" };
        itemRow.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        itemRow.getCell(4).alignment = { horizontal: "center" };
        itemRow.getCell(4).numFmt = "0.00%";
        [1, 2, 3, 4].forEach((c) => { itemRow.getCell(c).border = borderThin; });
      });

      const rk2Tot = ws.addRow(["", "TOTAL", totalFarmVolume, totalFarmVolume > 0 ? 1 : 0]);
      rk2Tot.font = { bold: true, size: 11, name: "Tahoma" };
      rk2Tot.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
      rk2Tot.getCell(4).numFmt = "0.00%";
      [1, 2, 3, 4].forEach((c) => { rk2Tot.getCell(c).border = borderThin; });

      // Ranking 3: Other Sources Volume
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);
      ws.addRow([]);

      const sortedByOther = [...rows]
        .map((r) => ({
          name: r.commodity_name,
          variety: r.variety,
          volume: Number(r.other_source_volume_kg) || 0
        }))
        .sort((a, b) => b.volume - a.volume);

      const rk3Title = ws.addRow([`Highest to Lowest Commodity Volume (kg) as of ${monthYearStr || reportingDate}`]);
      rk3Title.font = { bold: true, size: 11, name: "Tahoma" };
      const rk3Sub = ws.addRow(["Sources: Other supply sources such as Bankerohan, Kapatagan, and provinces outside Davao City; not directly from the farms of DFTC vendors/farmers."]);
      rk3Sub.font = { italic: true, size: 10, name: "Tahoma" };
      ws.addRow([]);

      const rk3Header = ws.addRow(["No.", "Commodity", "Volume", "Percentage (%)"]);
      rk3Header.font = { bold: true, size: 11, name: "Tahoma" };
      [1, 2, 3, 4].forEach((c) => {
        rk3Header.getCell(c).border = borderThin;
        rk3Header.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      });

      sortedByOther.forEach((item, idx) => {
        const itemRow = ws.addRow([
          idx + 1,
          item.variety && item.variety !== "Regular" ? `${item.name} (${item.variety})` : item.name,
          item.volume,
          totalOtherVolume > 0 ? item.volume / totalOtherVolume : 0
        ]);
        itemRow.font = { size: 11, name: "Tahoma" };
        itemRow.getCell(1).alignment = { horizontal: "center" };
        itemRow.getCell(2).alignment = { horizontal: "left" };
        itemRow.getCell(3).alignment = { horizontal: "right" };
        itemRow.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
        itemRow.getCell(4).alignment = { horizontal: "center" };
        itemRow.getCell(4).numFmt = "0.00%";
        [1, 2, 3, 4].forEach((c) => { itemRow.getCell(c).border = borderThin; });
      });

      const rk3Tot = ws.addRow(["", "TOTAL", totalOtherVolume, totalOtherVolume > 0 ? 1 : 0]);
      rk3Tot.font = { bold: true, size: 11, name: "Tahoma" };
      rk3Tot.getCell(3).numFmt = "_-* #,##0.00_-;-* #,##0.00_-;_-* \"-\"??_-;_-@_-";
      rk3Tot.getCell(4).numFmt = "0.00%";
      [1, 2, 3, 4].forEach((c) => { rk3Tot.getCell(c).border = borderThin; });

      // Signature block in Excel
      ws.addRow([]);
      ws.addRow([]);
      const p1 = ws.addRow(["Encoded by:", "", "", "", "", "Reviewed by:", ""]);
      p1.font = { size: 10, name: "Tahoma" };
      const p2 = ws.addRow([personnel.encodedBy, "", "", "", "", personnel.reviewedBy || personnel.preparedBy, ""]);
      p2.font = { bold: true, underline: true, size: 11, name: "Tahoma" };
      ws.mergeCells(`A${p2.number}:E${p2.number}`);
      ws.mergeCells(`F${p2.number}:G${p2.number}`);
      const p3 = ws.addRow([personnel.encodedByRole, "", "", "", "", personnel.reviewedByRole || personnel.preparedByRole, ""]);
      p3.font = { size: 10, name: "Tahoma" };
      ws.mergeCells(`A${p3.number}:E${p3.number}`);
      ws.mergeCells(`F${p3.number}:G${p3.number}`);

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const excelFilename = buildReportExportFilename({
        market: file.sourceName || file.market || "DFTC",
        reportType: "Arrival",
        period: "Daily",
        dateStr: reportingDateShort || file.savedDate,
        ext: "xlsx"
      });
      triggerDownload(URL.createObjectURL(blob), excelFilename);
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

  function renderPage(page, idx, totalPgs) {
    return (
      <ArrivalVolumeReportPage
        pageIndex={idx}
        totalPages={totalPgs}
        rows={page.rows}
        offset={page.offset}
        isFirst={idx === 0}
        isLast={idx === totalPgs - 1}
        reportDate={reportingDate}
        monthYearStr={monthYearStr}
        personnel={idx === totalPgs - 1 ? personnel : void 0}
        totalVolume={totalVolume}
        totalFarmVolume={totalFarmVolume}
        totalOtherVolume={totalOtherVolume}
      />
    );
  }

  function renderPreviewBody() {
    if (loadError || previewError) {
      return (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-[12px] text-red-700">Could not load this submission&apos;s arrival volumes.</span>
        </div>
      );
    }
    if ((isLoading || previewLoading) && rows.length === 0) {
      return (
        <div className="rounded-xl border border-[var(--hw-neutral-200)] bg-white p-8 text-center">
          <p className="text-[13px] text-[var(--hw-neutral-600)]">Loading arrival volumes…</p>
        </div>
      );
    }
    if (format === "IMG") {
      const totalImgPgs = imgPages.length; // strictly 4
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
              <span className="text-[13px] font-medium text-[var(--hw-neutral-900)]">Image {imgPage + 1} of {totalImgPgs}</span>
              <div className="flex gap-1.5 justify-center mt-1">
                {Array.from({ length: totalImgPgs }, (_, i) => (
                  <button key={i} onClick={() => setImgPage(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === imgPage ? "bg-[var(--hw-neutral-800)]" : "bg-[var(--hw-neutral-300)]"}`} />
                ))}
              </div>
            </div>
            <button
              onClick={() => setImgPage(Math.min(totalImgPgs - 1, imgPage + 1))}
              disabled={imgPage === totalImgPgs - 1}
              className="p-1.5 rounded-lg border border-[var(--hw-neutral-200)] disabled:opacity-40 hover:bg-[var(--hw-neutral-50)] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-800)]" />
            </button>
          </div>

          <DFTCPreviewZoomContainer label={`Image ${imgPage + 1} of ${totalImgPgs}`}>
            {renderPage(imgPages[imgPage], imgPage, totalImgPgs)}
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
    if (format === "PDF") {
      const isPortrait = orientation === "portrait";
      return (
        <DFTCPreviewZoomContainer label={`Arrival Volume PDF (Long ${isPortrait ? "Portrait" : "Landscape"})`}>
          <div className={`space-y-5 w-full ${isPortrait ? "max-w-[760px]" : "max-w-[1020px]"} mx-auto`}>
            {pdfPages.map((page, idx) => (
              <div key={idx} className="bg-white shadow-sm rounded-xl border border-[var(--hw-neutral-300)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--hw-neutral-100)] border-b border-[var(--hw-neutral-200)]">
                  <span className="text-[12px] font-semibold text-[var(--hw-neutral-800)]">Page {idx + 1} of {totalPdfPages}</span>
                  <span className="text-[12px] text-[var(--hw-neutral-800)]">Long {isPortrait ? "Portrait" : "Landscape"}</span>
                </div>
                <div>{renderPage(page, idx, totalPdfPages)}</div>
              </div>
            ))}
          </div>
        </DFTCPreviewZoomContainer>
      );
    }
    return (
      <DFTCPreviewZoomContainer label="Microsoft Excel Workbook">
        <div className="rounded-xl overflow-hidden border border-[var(--hw-neutral-300)] bg-white">
          <div className="bg-[#217346] px-4 py-2 flex items-center gap-2">
            <span className="text-white text-[12px] font-semibold">Microsoft Excel</span>
            <span className="text-green-200 text-[12px] truncate">— DFTC-Arrival-Volume-{reportingDateShort}.xlsx</span>
          </div>
          <div className="bg-[#f3f3f3] border-b border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-2">
            <span className="text-[12px] font-medium text-[var(--hw-neutral-700)]">A1</span>
            <span className="text-[var(--hw-neutral-700)] text-[12px]">fx</span>
            <span className="text-[12px] text-[var(--hw-neutral-800)] truncate">VOLUME (KG) OF COMMODITIES DROPPED AT DFTC</span>
          </div>
          <div className="bg-white">
            {pdfPages.map((page, idx) => renderPage(page, idx, totalPdfPages))}
          </div>
          <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
            <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[12px] font-medium text-[#217346] -mb-1.5">OVERALL TOTAL</div>
          </div>
        </div>
      </DFTCPreviewZoomContainer>
    );
  }

  const recordsIncluded = Math.max(
    countPopulatedArrivalRows(rows),
    Number(file.records) || 0
  );

  const activeHiddenPages = format === "IMG" ? imgPages : pdfPages;
  const activeHiddenTotal = format === "IMG" ? imgPages.length : totalPdfPages;

  return (
    <DFTCReportShell
      title="Preview Arrival Volume"
      subtitle={`${file.market || "DFTC"} Arrival Volume — ${reportingDate}`}
      onClose={onClose}
      metaFields={[
        ["Report ID", submission?.id || file.id || "—"],
        ["Reporting Date", reportingDate],
        ["Records Included", String(recordsIncluded)],
        ["Total Volume", `${numStr(totalVolume)} kg`],
        ["Saved Date", file.savedDate || "—"],
        ["Encoded By", personnel.encodedBy || submission?.submitted_by_name || "—"],
        ["Reviewed By", personnel.reviewedBy || personnel.preparedBy || "—"]
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
        activeHiddenPages.map((page, idx) => (
          <div key={idx} ref={(el) => { pageRefs.current[idx] = el; }}>
            {renderPage(page, idx, activeHiddenTotal)}
          </div>
        ))
      }
    >
      {renderPreviewBody()}
    </DFTCReportShell>
  );
}

// arrivalRowIsPopulated / countPopulatedArrivalRows / numStr are exported for
// the regression test in src/test/dftcArrivalReportRows.test.js.
export { DFTCArrivalPreview, arrivalRowIsPopulated, countPopulatedArrivalRows, numStr, pctStr };
