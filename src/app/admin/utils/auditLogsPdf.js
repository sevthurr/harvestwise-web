/**
 * auditLogsPdf.js
 *
 * Renders the audit log table into a proper, text-based PDF document using
 * jsPDF. Used by AdminAuditLogs for both "Preview" (open in a new tab) and
 * "Download".
 *
 * The table is drawn natively as vector text — selectable text, small file
 * size, repeating header rows on each page, zebra striping and page numbers.
 */

// Landscape A4: 297 × 210 mm
const COLUMNS = [
  { key: "id",         label: "Log ID",     width: 26 },
  { key: "created_at", label: "Timestamp",  width: 36 },
  { key: "actor",      label: "Actor",      width: 34 },
  { key: "action",     label: "Action",     width: 52 },
  { key: "details",    label: "Details",    width: 102 },
  { key: "ip_address", label: "IP Address", width: 27 },
];

const MARGIN = 10;
const HEADER_HEIGHT = 8;
const CELL_PAD = 2.2;
const LINE_HEIGHT = 4.6;
const BRAND_GREEN = [36, 85, 1]; // #245501
const BODY_TEXT = [51, 51, 51];
const MUTED_TEXT = [120, 120, 120];
const BORDER_COLOR = [214, 218, 224];
const ZEBRA_FILL = [243, 244, 246];

function fmtDatetime(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoStr;
  }
}

function cellValue(row, col) {
  if (col.key === "created_at") return fmtDatetime(row.created_at);
  if (col.key === "actor") return row.actor_name || row.user_id || "—";
  if (col.key === "details") return row.details || "—";
  return String(row[col.key] ?? "—");
}

function drawPageFooter(doc, pageNo, totalPages, generatedAt) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_TEXT);
  doc.text(generatedAt, MARGIN, pageH - 6);
  doc.text(
    totalPages ? `Page ${pageNo} of ${totalPages}` : `Page ${pageNo}`,
    pageW - MARGIN,
    pageH - 6,
    { align: "right" }
  );
}

/**
 * Build the audit log PDF.
 *
 * @param {object} options
 * @param {Array<object>} options.logs        All rows matching the current filters
 * @param {number} options.total              Total record count (same as logs.length)
 * @param {string} options.filterLabel        Human-readable filter summary
 * @param {string} options.generatedAt        Timestamp string shown in header/footer
 * @return {Promise<object>} jsPDF document
 */
export async function createAuditLogsPdf({ logs, total, filterLabel, generatedAt }) {
  const module = await import("jspdf");
  const jsPDFCtor = module.jsPDF || module.default;

  const render = (totalPages) => {
    const doc = new jsPDFCtor({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const contentW = pageW - MARGIN * 2;
    const tableTop = 32;

    // ── Header band ──
    doc.setFillColor(...BRAND_GREEN);
    doc.rect(0, 0, pageW, 22, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Audit Logs", MARGIN, 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("System activity and administrative actions", MARGIN, 17);
    doc.text(`Generated: ${generatedAt}`, pageW - MARGIN, 12, { align: "right" });
    doc.text(`${total} record${total === 1 ? "" : "s"}`, pageW - MARGIN, 17, { align: "right" });

    // ── Filter summary ──
    doc.setFontSize(9.5);
    doc.setTextColor(...BODY_TEXT);
    doc.text(`Filters: ${filterLabel}`, MARGIN, tableTop - 4);
    doc.setDrawColor(...BORDER_COLOR);
    doc.line(MARGIN, tableTop - 1, pageW - MARGIN, tableTop - 1);

    let y = tableTop;
    let pageNo = 1;

    const drawHeader = () => {
      doc.setFillColor(...BRAND_GREEN);
      doc.rect(MARGIN, y, contentW, HEADER_HEIGHT, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      let x = MARGIN;
      for (const col of COLUMNS) {
        doc.text(col.label, x + 2, y + HEADER_HEIGHT / 2 + 1.5);
        x += col.width;
      }
    };

    const drawRow = (row, rowIndex) => {
      const cells = COLUMNS.map((col) => {
        const lines = doc.splitTextToSize(cellValue(row, col), col.width - CELL_PAD * 2);
        return Array.isArray(lines) ? lines.map(String) : [String(lines)];
      });
      const rowH = Math.max(...cells.map((c) => c.length)) * LINE_HEIGHT + CELL_PAD * 2 + 1;

      // Page break: leave room for the footer at the bottom.
      if (y + rowH > pageH - 16) {
        if (totalPages) drawPageFooter(doc, pageNo, totalPages, generatedAt);
        doc.addPage("a4", "landscape");
        pageNo += 1;
        y = tableTop;
        drawHeader();
        y += HEADER_HEIGHT + 1;
      }

      // Zebra striping
      if (rowIndex % 2 === 1) {
        doc.setFillColor(...ZEBRA_FILL);
        doc.rect(MARGIN, y, contentW, rowH, "F");
      }

      doc.setDrawColor(...BORDER_COLOR);
      let x = MARGIN;
      cells.forEach((lines, i) => {
        const col = COLUMNS[i];
        doc.rect(x, y, col.width, rowH);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...BODY_TEXT);
        let ty = y + CELL_PAD + 2;
        for (const line of lines) {
          doc.text(line, x + 2, ty);
          ty += LINE_HEIGHT;
        }
        x += col.width;
      });

      y += rowH;
    };

    drawHeader();
    y += HEADER_HEIGHT + 1;

    if (logs.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...MUTED_TEXT);
      doc.text("No audit log entries match the selected filters.", MARGIN, y + 6);
    } else {
      logs.forEach(drawRow);
    }

    drawPageFooter(doc, pageNo, totalPages, generatedAt);
    return doc;
  };

  // Two passes: first learns the page count so footers read "Page X of Y".
  const firstPass = render(null);
  const totalPages = firstPass.getNumberOfPages();
  return render(totalPages);
}