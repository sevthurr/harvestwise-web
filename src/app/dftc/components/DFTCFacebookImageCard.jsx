import React from "react";

// Official HarvestWise DFTC Price Monitoring Colors
// Preserves the exact cell colors requested:
const BORDER_COLOR = "#000000";
const LEFT_BG = "#d9ead3"; // Light sage green for No., Commodity, UOM
const BANK_BG = "#fff2cc"; // Light buttery yellow for Bankerohan
const DFTC_BG = "#cfe2f3"; // Light sky blue for DFTC Taboan
const CATEGORY_BG = "#cbd5e1"; // Solid light slate-grey for category header


// All four Facebook cards share one fixed size. Rows use integer pixel heights with
// matching line-heights (no table / fractional padding), which html2canvas renders
// identically to the on-screen preview (no clipped text or overlapping borders).
const CARD_W = 1020;
const CARD_H = 1000;
const HEADER_H = 128;
const TABLE_HEAD_ROW_H = 24;
const SIGNATURE_H = 72;
const FOOTER_H = 16;
const BODY_PAD = 10;
const COLS = "6% 34% 10% 10% 10% 10% 10% 10%";
const FONT = "Arial, Helvetica, sans-serif";

function Cell({ bg, h, children, align = "left", bold = false, italic = false, fontSize, style = {} }) {
  return (
    <div
      style={{
        boxSizing: "border-box",
        height: h,
        lineHeight: `${h - 1}px`,
        background: bg,
        borderRight: `1px solid ${BORDER_COLOR}`,
        borderBottom: `1px solid ${BORDER_COLOR}`,
        padding: "0 6px",
        textAlign: align,
        fontWeight: bold ? "bold" : "normal",
        fontStyle: italic ? "italic" : "normal",
        fontSize,
        fontFamily: FONT,
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

export function DFTCFacebookImageCard({
  pageIndex,
  totalPages,
  categories,
  reportDate,
  personnel,
  isLast = false
}) {
  const units = categories.reduce(
    (sum, cat) =>
      sum + 1 + (cat.commodities || []).reduce((cSum, com) => cSum + (com.variants?.length || 1), 0),
    0
  );
  const sigH = isLast && personnel ? SIGNATURE_H : 0;
  const avail = CARD_H - 6 - HEADER_H - BODY_PAD * 2 - TABLE_HEAD_ROW_H * 2 - FOOTER_H - sigH - 2;
  const rowH = Math.max(18, Math.min(30, Math.floor(avail / Math.max(units, 1))));
  const fontSize = Math.max(10, Math.min(13, rowH - 9));
  const headFont = Math.max(10, Math.min(12, fontSize));

  const head = (bg, h, children, extra = {}) => (
    <Cell bg={bg} h={h} align="center" bold fontSize={headFont} style={extra}>
      {children}
    </Cell>
  );

  return (
    <div
      style={{
        boxSizing: "border-box",
        width: CARD_W,
        height: CARD_H,
        border: "3px solid #16a34a",
        borderRadius: 16,
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: FONT,
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Header */}
      <div
        style={{
          boxSizing: "border-box",
          height: HEADER_H,
          borderBottom: "2px solid #16a34a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff"
        }}
      >
        <div style={{ fontSize: 20, lineHeight: "26px", fontWeight: "bold", color: "#000000", textTransform: "uppercase" }}>
          Davao Food Terminal Complex
        </div>
        <div style={{ fontSize: 26, lineHeight: "32px", fontWeight: "bold", color: "#16a34a", textTransform: "uppercase" }}>
          Price Monitoring
        </div>
        <div
          style={{
            marginTop: 6,
            height: 24,
            lineHeight: "24px",
            padding: "0 20px",
            borderRadius: 12,
            background: "#15803d",
            color: "#ffffff",
            fontWeight: "bold",
            fontSize: 12,
            textTransform: "uppercase"
          }}
        >
          Prevailing Market Prices as of {reportDate}
        </div>
        <div
          style={{
            boxSizing: "border-box",
            marginTop: 6,
            height: 24,
            lineHeight: "20px",
            padding: "0 24px",
            borderRadius: 12,
            border: "2px solid #16a34a",
            background: "#ffffff",
            color: "#15803d",
            fontWeight: "bold",
            fontSize: 13,
            textTransform: "uppercase"
          }}
        >
          Class A
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: BODY_PAD, background: "#ffffff" }}>
        <div style={{ borderTop: `1px solid ${BORDER_COLOR}`, borderLeft: `1px solid ${BORDER_COLOR}` }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: COLS }}>
            {head(LEFT_BG, TABLE_HEAD_ROW_H * 2, "No.", { gridRow: "1 / span 2", lineHeight: `${TABLE_HEAD_ROW_H * 2 - 1}px` })}
            {head(LEFT_BG, TABLE_HEAD_ROW_H * 2, "Commodity", { gridRow: "1 / span 2", textAlign: "left", lineHeight: `${TABLE_HEAD_ROW_H * 2 - 1}px` })}
            {head(LEFT_BG, TABLE_HEAD_ROW_H * 2, "UOM", { gridRow: "1 / span 2", lineHeight: `${TABLE_HEAD_ROW_H * 2 - 1}px` })}
            {head(BANK_BG, TABLE_HEAD_ROW_H, "BANKEROHAN MARKET", { gridColumn: "4 / span 3" })}
            {head(DFTC_BG, TABLE_HEAD_ROW_H, "DFTC TABOAN", { gridColumn: "7 / span 2" })}
            {head(BANK_BG, TABLE_HEAD_ROW_H, "Landing")}
            {head(BANK_BG, TABLE_HEAD_ROW_H, "Wholesale")}
            {head(BANK_BG, TABLE_HEAD_ROW_H, "Retail")}
            {head(DFTC_BG, TABLE_HEAD_ROW_H, "Wholesale")}
            {head(DFTC_BG, TABLE_HEAD_ROW_H, "Retail")}
          </div>

          {categories.map((cat) => (
            <React.Fragment key={cat.name}>
              <div
                style={{
                  boxSizing: "border-box",
                  height: rowH,
                  lineHeight: `${rowH - 1}px`,
                  background: CATEGORY_BG,
                  borderRight: `1px solid ${BORDER_COLOR}`,
                  borderBottom: `1px solid ${BORDER_COLOR}`,
                  padding: "0 6px",
                  fontWeight: "bold",
                  fontStyle: "italic",
                  textTransform: "uppercase",
                  fontSize: fontSize,
                  fontFamily: FONT,
                  color: "#111827",
                  whiteSpace: "nowrap"
                }}
              >
                {cat.name}
              </div>
              {(cat.commodities || []).map((com) =>
                (com.variants || []).map((v, vi) => (
                  <div key={`${cat.name}-${com.name}-${vi}`} style={{ display: "grid", gridTemplateColumns: COLS }}>
                    <Cell bg={LEFT_BG} h={rowH} align="center" fontSize={fontSize}>{vi === 0 ? com.no : ""}</Cell>
                    <Cell bg={LEFT_BG} h={rowH} fontSize={fontSize}>
                      {vi === 0 ? (
                        <>
                          <strong>{com.name}</strong> {v.descriptor}
                        </>
                      ) : (
                        <span style={{ paddingLeft: 14 }}>{v.descriptor}</span>
                      )}
                    </Cell>
                    <Cell bg={LEFT_BG} h={rowH} align="center" fontSize={fontSize}>{v.uom}</Cell>
                    <Cell bg={BANK_BG} h={rowH} align="right" fontSize={fontSize}>{v.bankLanding}</Cell>
                    <Cell bg={BANK_BG} h={rowH} align="right" fontSize={fontSize}>{v.bankWholesale}</Cell>
                    <Cell bg={BANK_BG} h={rowH} align="right" fontSize={fontSize}>{v.bankRetail}</Cell>
                    <Cell bg={DFTC_BG} h={rowH} align="right" fontSize={fontSize}>{v.dftcWholesale}</Cell>
                    <Cell bg={DFTC_BG} h={rowH} align="right" fontSize={fontSize}>{v.dftcRetail}</Cell>
                  </div>
                ))
              )}
            </React.Fragment>
          ))}
        </div>

        {isLast && personnel && (
          <div
            style={{
              boxSizing: "border-box",
              marginTop: 8,
              height: SIGNATURE_H - 8,
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "#f9fafb",
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center"
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, lineHeight: "14px", color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>Encoded by:</div>
              <div style={{ fontSize: 12, lineHeight: "17px", fontWeight: "bold", textDecoration: "underline", color: "#111827" }}>
                {personnel.encodedBy}
              </div>
              <div style={{ fontSize: 10.5, lineHeight: "15px", color: "#374151" }}>{personnel.encodedByRole}</div>
            </div>
            <div style={{ width: 2, height: 36, background: "#16a34a", opacity: 0.6 }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, lineHeight: "14px", color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>Reviewed by:</div>
              <div style={{ fontSize: 12, lineHeight: "17px", fontWeight: "bold", textDecoration: "underline", color: "#111827" }}>
                {personnel.reviewedBy || personnel.preparedBy}
              </div>
              <div style={{ fontSize: 10.5, lineHeight: "15px", color: "#374151" }}>
                {personnel.reviewedByRole || personnel.preparedByRole}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          height: FOOTER_H,
          flexShrink: 0,
          background: "linear-gradient(90deg, #15803d 0%, #22c55e 50%, #16a34a 100%)"
        }}
      />
    </div>
  );
}
