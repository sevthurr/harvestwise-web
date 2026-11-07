import React from "react";

// Official HarvestWise DFTC Price Monitoring Colors
// Preserves the exact cell colors requested:
const BORDER_COLOR = "#000000";
const LEFT_BG = "#d9ead3"; // Light sage green for No., Commodity, UOM
const BANK_BG = "#fff2cc"; // Light buttery yellow for Bankerohan
const DFTC_BG = "#cfe2f3"; // Light sky blue for DFTC Taboan
const CATEGORY_BG = "#cbd5e1"; // Solid light slate-grey for category header

function FBTableHeaders({ cellHeader, headerPadding, headerFontSize }) {
  return (
    <thead>
      <tr>
        <th rowSpan={2} style={cellHeader(LEFT_BG, { width: "6%" })}>No.</th>
        <th rowSpan={2} style={cellHeader(LEFT_BG, { width: "34%", textAlign: "left" })}>Commodity</th>
        <th rowSpan={2} style={cellHeader(LEFT_BG, { width: "10%" })}>UOM</th>
        <th colSpan={3} style={cellHeader(BANK_BG)}>BANKEROHAN MARKET</th>
        <th colSpan={2} style={cellHeader(DFTC_BG)}>DFTC TABOAN</th>
      </tr>
      <tr>
        <th style={cellHeader(BANK_BG, { width: "10%" })}>Landing</th>
        <th style={cellHeader(BANK_BG, { width: "10%" })}>Wholesale</th>
        <th style={cellHeader(BANK_BG, { width: "10%" })}>Retail</th>
        <th style={cellHeader(DFTC_BG, { width: "10%" })}>Wholesale</th>
        <th style={cellHeader(DFTC_BG, { width: "10%" })}>Retail</th>
      </tr>
    </thead>
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
  const rowCount = categories.reduce(
    (sum, cat) => sum + (cat.commodities || []).reduce((cSum, com) => cSum + (com.variants?.length || 1), 0),
    0
  );

  // Dynamic row sizing tailored so all 4 Facebook cards share the exact 1020px width
  // and fit seamlessly in a fixed card height without crowding or clipping
  const isHeavyPage = rowCount > 22; // Page 4 (Fruits & Others has ~27 rows)
  const isMediumPage = rowCount > 15; // Page 2 & 3 have ~16-17 rows

  const cellPadding = isHeavyPage ? "2.2px 5px" : isMediumPage ? "3.2px 6px" : "4.5px 7px";
  const cellFontSize = isHeavyPage ? 10 : isMediumPage ? 10.8 : 11.5;
  const headerPadding = isHeavyPage ? "2.5px 4px" : isMediumPage ? "3.5px 6px" : "4.5px 6px";
  const headerFontSize = isHeavyPage ? 10 : isMediumPage ? 10.5 : 11;

  const cellBorder = { border: `1px solid ${BORDER_COLOR}` };

  // Retain exact cell background colors as requested:
  const cellL = (extra = {}) => ({
    ...cellBorder,
    background: LEFT_BG,
    padding: cellPadding,
    fontSize: cellFontSize,
    lineHeight: 1.4,
    verticalAlign: "middle",
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });
  const cellB = (extra = {}) => ({
    ...cellBorder,
    background: BANK_BG,
    padding: cellPadding,
    textAlign: "right",
    fontSize: cellFontSize,
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });
  const cellD = (extra = {}) => ({
    ...cellBorder,
    background: DFTC_BG,
    padding: cellPadding,
    textAlign: "right",
    fontSize: cellFontSize,
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });

  const cellHeader = (bg, extra = {}) => ({
    ...cellBorder,
    background: bg,
    padding: headerPadding,
    fontSize: headerFontSize,
    fontWeight: "bold",
    textAlign: "center",
    verticalAlign: "middle",
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });


  return (
    <div
      className="bg-white rounded-2xl overflow-hidden box-border mx-auto shadow-md"
      style={{
        width: "1020px",
        minHeight: "700px",
        border: "3px solid #16a34a",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#ffffff"
      }}
    >
      <div>
        {/* Creative Top Header Banner matching Image 2 */}
        <div
          className="px-5 pt-3 pb-2 relative flex items-center justify-between"
          style={{
            background: "#ffffff",
            borderBottom: "2px solid #16a34a"
          }}
        >

          {/* Center Brand Header */}
          <div className="text-center flex-1 mx-2">
            <h1
              style={{
                fontSize: "19px",
                fontWeight: "bold",
                color: "#000000",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                margin: 0,
                lineHeight: 1.2
              }}
            >
              Davao Food Terminal Complex
            </h1>
            <h2
              style={{
                fontSize: "23px",
                fontWeight: "900",
                color: "#16a34a",
                textTransform: "uppercase",
                letterSpacing: "1px",
                margin: "2px 0 0 0",
                lineHeight: 1.2
              }}
            >
              Price Monitoring
            </h2>

            {/* Date Badge Pill */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 5 }}>
              <span
                style={{
                  background: "#15803d",
                  color: "#ffffff",
                  padding: "3px 18px",
                  borderRadius: "9999px",
                  fontWeight: "bold",
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                Prevailing Market Prices as of {reportDate}
              </span>
            </div>

            {/* Class A Badge */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 4 }}>
              <span
                style={{
                  background: "#ffffff",
                  border: "2px solid #16a34a",
                  color: "#15803d",
                  fontWeight: "bold",
                  fontSize: "12px",
                  padding: "1px 22px",
                  borderRadius: "9999px",
                  textTransform: "uppercase",
                  letterSpacing: "1px"
                }}
              >
                Class A
              </span>
            </div>
          </div>

        </div>

        {/* Card Body Table with retained exact cell color scheme */}
        <div style={{ padding: "8px 10px 4px 10px", background: "#ffffff" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
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

            <FBTableHeaders cellHeader={cellHeader} headerPadding={headerPadding} headerFontSize={headerFontSize} />

            <tbody>
              {categories.map((cat, catIdx) => (
                <React.Fragment key={cat.name}>
                  {/* Full-width slate grey category row matching Image 2 */}
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        background: CATEGORY_BG,
                        border: `1px solid ${BORDER_COLOR}`,
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

                  {/* Category commodities */}
                  {(cat.commodities || []).map((com) =>
                    (com.variants || []).map((v, vi) => (
                      <tr key={`${cat.name}-${com.name}-${vi}`}>
                        <td style={cellL({ textAlign: "center" })}>{vi === 0 ? com.no : ""}</td>
                        <td style={cellL({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                          {vi === 0 ? (
                            <>
                              <strong>{com.name}</strong>{" "}
                              <span style={{ fontWeight: "normal" }}>{v.descriptor}</span>
                            </>
                          ) : (
                            <span style={{ paddingLeft: 14 }}>{v.descriptor}</span>
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

          {/* Official Signature Block on the 4th Facebook card matching Image 5 */}
          {isLast && personnel && (
            <div
              style={{
                marginTop: 8,
                padding: "6px 16px",
                borderRadius: "8px",
                border: "1px solid #d1d5db",
                background: "#f9fafb",
                display: "flex",
                justifyContent: "space-around",
                alignItems: "center"
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>Encoded by:</div>
                <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: "#111827", marginTop: 1 }}>
                  {personnel.encodedBy}
                </div>
                <div style={{ fontSize: 10.5, color: "#374151" }}>{personnel.encodedByRole}</div>
              </div>

              <div style={{ width: 2, height: 32, background: "#16a34a", opacity: 0.6 }} />

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>Reviewed by:</div>
                <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: "#111827", marginTop: 1 }}>
                  {personnel.reviewedBy || personnel.preparedBy}
                </div>
                <div style={{ fontSize: 10.5, color: "#374151" }}>{personnel.reviewedByRole || personnel.preparedByRole}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Wave Footer Decorative Bar matching Image 2 */}
      <div
        style={{
          height: "16px",
          background: "linear-gradient(90deg, #15803d 0%, #22c55e 50%, #16a34a 100%)",
          borderTop: "1.5px solid #16a34a",
          marginTop: 6
        }}
      />
    </div>
  );
}
