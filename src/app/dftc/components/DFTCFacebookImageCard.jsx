import React from "react";

// Official HarvestWise DFTC Price Monitoring Colors
// Preserves the exact cell colors requested:
export const BORDER_COLOR = "#000000";
export const LEFT_BG = "#d9ead3"; // Light sage green for No., Commodity, UOM
export const BANK_BG = "#fff2cc"; // Light buttery yellow for Bankerohan
export const DFTC_BG = "#cfe2f3"; // Light sky blue for DFTC Taboan
export const CATEGORY_BG = "#cbd5e1"; // Solid light slate-grey for category header



// ---------------------------------------------------------------------------
// Shared fixed-size layout. The on-screen preview (this component) and the
// downloaded PNGs (dftcFacebookImageCanvas.js, drawn on a native canvas) both
// use these numbers, so the download is pixel-for-pixel the same layout.
// All 4 cards are the same size and rows are stretched so there is no empty
// space under the table.
// ---------------------------------------------------------------------------
export const FB = {
  W: 1020,
  H: 970,
  BORDER: 3,
  HEADER_H: 128,
  HEAD_ROW_H: 26,
  PAD: 10,
  FOOTER_H: 16,
  SIG_H: 72,
  COLS: [0.06, 0.34, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  FONT: "Arial, Helvetica, sans-serif"
};

export function buildFBRows(categories) {
  const rows = [];
  categories.forEach((cat) => {
    rows.push({ type: "cat", name: cat.name });
    (cat.commodities || []).forEach((com) =>
      (com.variants || []).forEach((v, vi) => rows.push({ type: "row", com, v, vi }))
    );
  });
  return rows;
}

export function computeFBLayout(categories, hasSignature) {
  const rows = buildFBRows(categories);
  const tableTop = FB.BORDER + FB.HEADER_H + FB.PAD + FB.HEAD_ROW_H * 2;
  const tableBottom = FB.H - FB.BORDER - FB.FOOTER_H - FB.PAD - (hasSignature ? FB.SIG_H : 0);
  const avail = tableBottom - tableTop - 1;
  const CAT_H = 28;
  const catCount = rows.filter((r) => r.type === "cat").length;
  const dataCount = Math.max(rows.length - catCount, 1);
  const base = Math.floor((avail - catCount * CAT_H) / dataCount);
  let rem = avail - catCount * CAT_H - base * dataCount;
  const heights = rows.map((r) => {
    if (r.type === "cat") return CAT_H;
    const h = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
    return h;
  });
  const fontSize = Math.max(10, Math.min(15, Math.round(base * 0.5)));
  return { rows, heights, fontSize, tableTop };
}

function Cell({ bg, h, children, align = "left", bold = false, italic = false, fontSize, style = {} }) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
        background: bg,
        borderRight: `1px solid ${BORDER_COLOR}`,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        padding: "0 6px",
        fontWeight: bold ? "bold" : "normal",
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        lineHeight: 1,
        fontFamily: FB.FONT,
        color: "#111827",
        whiteSpace: "nowrap",
        overflow: "hidden",
        ...style
      }}
    >
      {children}
    </div>
  );
}

const COLS_CSS = FB.COLS.map((c) => `${c * 100}%`).join(" ");

export function DFTCFacebookImageCard({
  pageIndex,
  totalPages,
  categories,
  reportDate,
  personnel,
  isLast = false
}) {
  const hasSig = !!(isLast && personnel);
  const { rows, heights, fontSize } = computeFBLayout(categories, hasSig);
  const HR = FB.HEAD_ROW_H;
  const headFont = 11;
  const head = (bg, h, children, extra = {}) => (
    <Cell bg={bg} h={h} align="center" bold fontSize={headFont} style={extra}>
      {children}
    </Cell>
  );
  const center = { position: "absolute", left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center" };

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: FB.W,
        height: FB.H,
        border: `${FB.BORDER}px solid #16a34a`,
        borderRadius: 16,
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: FB.FONT,
        position: "relative"
      }}
    >
      {/* Header (absolute positions so lines can never overlap) */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: FB.HEADER_H, borderBottom: "2px solid #16a34a", boxSizing: "border-box" }}>
        <div style={{ ...center, top: 10, height: 26, fontSize: 20, fontWeight: "bold", color: "#000", textTransform: "uppercase", lineHeight: 1 }}>
          Davao Food Terminal Complex
        </div>
        <div style={{ ...center, top: 38, height: 32, fontSize: 28, fontWeight: "bold", color: "#16a34a", textTransform: "uppercase", lineHeight: 1 }}>
          Price Monitoring
        </div>
        <div style={{ ...center, top: 74, height: 24 }}>
          <div style={{ height: 24, padding: "0 22px", borderRadius: 12, background: "#15803d", color: "#fff", fontWeight: "bold", fontSize: 12, textTransform: "uppercase", display: "flex", alignItems: "center", lineHeight: 1 }}>
            Prevailing Market Prices as of {reportDate}
          </div>
        </div>
        <div style={{ ...center, top: 100, height: 22 }}>
          <div style={{ boxSizing: "border-box", height: 22, padding: "0 26px", borderRadius: 11, border: "2px solid #16a34a", color: "#15803d", fontWeight: "bold", fontSize: 12, textTransform: "uppercase", display: "flex", alignItems: "center", lineHeight: 1 }}>
            Class A
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ position: "absolute", left: FB.PAD, right: FB.PAD, top: FB.HEADER_H + FB.PAD }}>
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, borderLeft: `1px solid ${BORDER_COLOR}` }}>
          <div style={{ display: "grid", gridTemplateColumns: COLS_CSS }}>
            {head(LEFT_BG, HR * 2, "No.", { gridRow: "1 / span 2" })}
            {head(LEFT_BG, HR * 2, "Commodity", { gridRow: "1 / span 2", justifyContent: "flex-start" })}
            {head(LEFT_BG, HR * 2, "UOM", { gridRow: "1 / span 2" })}
            {head(BANK_BG, HR, "BANKEROHAN MARKET", { gridColumn: "4 / span 3" })}
            {head(DFTC_BG, HR, "DFTC TABOAN", { gridColumn: "7 / span 2" })}
            {head(BANK_BG, HR, "Landing")}
            {head(BANK_BG, HR, "Wholesale")}
            {head(BANK_BG, HR, "Retail")}
            {head(DFTC_BG, HR, "Wholesale")}
            {head(DFTC_BG, HR, "Retail")}
          </div>

          {rows.map((r, i) => {
            const h = heights[i];
            if (r.type === "cat") {
              return (
                <div
                  key={`cat-${r.name}`}
                  style={{
                    boxSizing: "border-box",
                    height: h,
                    display: "flex",
                    alignItems: "center",
                    background: CATEGORY_BG,
                    borderRight: `1px solid ${BORDER_COLOR}`,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: "0 6px",
                    fontWeight: "bold",
                    fontStyle: "italic",
                    textTransform: "uppercase",
                    fontSize,
                    lineHeight: 1,
                    fontFamily: FB.FONT,
                    color: "#111827"
                  }}
                >
                  {r.name}
                </div>
              );
            }
            const { com, v, vi } = r;
            return (
              <div key={`${com.name}-${i}`} style={{ display: "grid", gridTemplateColumns: COLS_CSS }}>
                <Cell bg={LEFT_BG} h={h} align="center" fontSize={fontSize}>{vi === 0 ? com.no : ""}</Cell>
                <Cell bg={LEFT_BG} h={h} fontSize={fontSize}>
                  {vi === 0 ? (
                    <span><strong>{com.name}</strong> {v.descriptor}</span>
                  ) : (
                    <span style={{ paddingLeft: 14 }}>{v.descriptor}</span>
                  )}
                </Cell>
                <Cell bg={LEFT_BG} h={h} align="center" fontSize={fontSize}>{v.uom}</Cell>
                <Cell bg={BANK_BG} h={h} align="right" fontSize={fontSize}>{v.bankLanding}</Cell>
                <Cell bg={BANK_BG} h={h} align="right" fontSize={fontSize}>{v.bankWholesale}</Cell>
                <Cell bg={BANK_BG} h={h} align="right" fontSize={fontSize}>{v.bankRetail}</Cell>
                <Cell bg={DFTC_BG} h={h} align="right" fontSize={fontSize}>{v.dftcWholesale}</Cell>
                <Cell bg={DFTC_BG} h={h} align="right" fontSize={fontSize}>{v.dftcRetail}</Cell>
              </div>
            );
          })}
        </div>
      </div>

      {hasSig && (
        <div
          style={{
            position: "absolute",
            left: FB.PAD,
            right: FB.PAD,
            bottom: FB.FOOTER_H + 8,
            boxSizing: "border-box",
            height: FB.SIG_H - 12,
            borderRadius: 8,
            border: "1px solid #d1d5db",
            background: "#f9fafb",
            display: "flex",
            justifyContent: "space-around",
            alignItems: "center"
          }}
        >
          {[
            ["Encoded by:", personnel.encodedBy, personnel.encodedByRole],
            ["Reviewed by:", personnel.reviewedBy || personnel.preparedBy, personnel.reviewedByRole || personnel.preparedByRole]
          ].map(([label, name, role], idx) => (
            <React.Fragment key={label}>
              {idx === 1 && <div style={{ width: 2, height: 36, background: "#16a34a", opacity: 0.6 }} />}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, lineHeight: "14px", color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 12, lineHeight: "17px", fontWeight: "bold", textDecoration: "underline", color: "#111827" }}>{name}</div>
                <div style={{ fontSize: 10.5, lineHeight: "15px", color: "#374151" }}>{role}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: FB.FOOTER_H,
          background: "linear-gradient(90deg, #15803d 0%, #22c55e 50%, #16a34a 100%)"
        }}
      />
    </div>
  );
}
