import React from "react";

// Official DFTC Price Monitoring Colors matching Facebook Social Card
const BORDER_COLOR = "#000000";
const LEFT_HEADER_BG = "#e8f5e9";
const BANK_HEADER_BG = "#fff8e1";
const DFTC_HEADER_BG = "#e0f2fe";
const CATEGORY_BG = "#cbd5e1"; // Slate grey matching official card
const BANK_CELL_BG = "#fffde7";
const DFTC_CELL_BG = "#f0f9ff";

function FBProduceIcon({ type = "veg" }) {
  if (type === "fruit") {
    return (
      <svg className="w-12 h-12 text-amber-500 shrink-0 opacity-90" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="28" r="14" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
        <circle cx="28" cy="22" r="12" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
        <path d="M22 14C22 10 26 6 30 6C30 10 26 14 22 14Z" fill="#16a34a" />
        <path d="M24 12C26 8 32 8 34 10" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="w-12 h-12 text-green-600 shrink-0 opacity-90" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 28C8 24 8 16 16 12C20 10 28 10 32 14C38 12 42 18 40 24C42 30 38 36 32 38C26 40 18 40 14 36C10 34 8 30 12 28Z" fill="#4ade80" stroke="#16a34a" strokeWidth="2" />
      <path d="M18 20C22 24 26 28 30 32" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 18C26 24 22 28 16 30" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="34" cy="30" r="6" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" />
      <path d="M34 24V22" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FBTableHeaders({ cellHeader, headerPadding, headerFontSize }) {
  return (
    <thead>
      <tr>
        <th rowSpan={2} style={cellHeader(LEFT_HEADER_BG, { width: "6%" })}>No.</th>
        <th rowSpan={2} style={cellHeader(LEFT_HEADER_BG, { width: "34%", textAlign: "left" })}>Commodity</th>
        <th rowSpan={2} style={cellHeader(LEFT_HEADER_BG, { width: "10%" })}>UOM</th>
        <th colSpan={3} style={cellHeader(BANK_HEADER_BG)}>BANKEROHAN MARKET</th>
        <th colSpan={2} style={cellHeader(DFTC_HEADER_BG)}>DFTC TABOAN</th>
      </tr>
      <tr>
        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Landing</th>
        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Wholesale</th>
        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Retail</th>
        <th style={cellHeader(DFTC_HEADER_BG, { width: "10%" })}>Wholesale</th>
        <th style={cellHeader(DFTC_HEADER_BG, { width: "10%" })}>Retail</th>
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

  // Dynamic row sizing tailored so all 4 Facebook cards share the exact 1040px width
  // and fit seamlessly in a fixed card height without crowding or clipping
  const isHeavyPage = rowCount > 22; // Page 4 (Fruits & Others has ~27 rows)
  const isMediumPage = rowCount > 15; // Page 2 & 3 have ~16-17 rows

  const cellPadding = isHeavyPage ? "2px 5px" : isMediumPage ? "3px 6px" : "4.5px 7px";
  const cellFontSize = isHeavyPage ? 9.8 : isMediumPage ? 10.8 : 11.5;
  const headerPadding = isHeavyPage ? "2.5px 4px" : isMediumPage ? "3.5px 6px" : "4.5px 6px";
  const headerFontSize = isHeavyPage ? 10 : isMediumPage ? 10.5 : 11;

  const cellBorder = { border: `1px solid ${BORDER_COLOR}` };
  const cellL = (extra = {}) => ({
    ...cellBorder,
    background: "#ffffff",
    padding: cellPadding,
    fontSize: cellFontSize,
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });
  const cellB = (extra = {}) => ({
    ...cellBorder,
    background: BANK_CELL_BG,
    padding: cellPadding,
    textAlign: "right",
    fontSize: cellFontSize,
    fontFamily: "Arial, Helvetica, sans-serif",
    ...extra
  });
  const cellD = (extra = {}) => ({
    ...cellBorder,
    background: DFTC_CELL_BG,
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

  const iconType = categories.some((c) => c.name === "Fruits") ? "fruit" : "veg";

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden box-border mx-auto shadow-md"
      style={{
        width: "1040px",
        minHeight: "710px",
        border: "2.5px solid #16a34a",
        fontFamily: "Arial, Helvetica, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <div>
        {/* Creative Green Top Header Banner matching Facebook Sample */}
        <div
          className="px-6 pt-3.5 pb-2.5 relative flex items-center justify-between"
          style={{
            background: "linear-gradient(180deg, #15803d 0%, #166534 60%, #14532d 100%)",
            borderBottom: "2px solid #15803d"
          }}
        >
          {/* Left Decorative Produce Icon */}
          <div className="flex items-center gap-2">
            <FBProduceIcon type={iconType} />
          </div>

          {/* Center Brand Header */}
          <div className="text-center flex-1 mx-4">
            <h1
              className="text-white font-extrabold uppercase tracking-wide leading-tight drop-shadow-sm"
              style={{ fontSize: "19px", letterSpacing: "0.5px" }}
            >
              Davao Food Terminal Complex
            </h1>
            <h2
              className="font-extrabold uppercase tracking-wider text-green-300 drop-shadow-sm"
              style={{ fontSize: "22px", letterSpacing: "1px" }}
            >
              Price Monitoring
            </h2>

            {/* Date Badge Pill */}
            <div className="flex items-center justify-center gap-2 mt-1.5">
              <span
                className="bg-[#14532d] text-white px-4 py-0.5 rounded-full font-bold uppercase tracking-wide border border-green-400/40"
                style={{ fontSize: "11px" }}
              >
                Prevailing Market Prices as of {reportDate}
              </span>
            </div>

            {/* Class Badge */}
            <div className="flex justify-center mt-1">
              <span
                className="bg-white text-[#15803d] font-black uppercase tracking-wider px-3.5 py-0.5 rounded-full border border-green-600 shadow-xs"
                style={{ fontSize: "11.5px" }}
              >
                Class A
              </span>
            </div>
          </div>

          {/* Right Decorative Produce Icon */}
          <div className="flex items-center gap-2 rotate-y-180">
            <FBProduceIcon type={iconType === "fruit" ? "veg" : "fruit"} />
          </div>
        </div>

        {/* Card Body Table with crisp official grid */}
        <div className="p-3 bg-white">
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
                  {/* Re-render column headers before Rootcrops on Spices & Rootcrops image */}
                  {catIdx > 0 && cat.name === "Rootcrops" && (
                    <>
                      <tr>
                        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Landing</th>
                        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Wholesale</th>
                        <th style={cellHeader(BANK_HEADER_BG, { width: "10%" })}>Retail</th>
                        <th style={cellHeader(DFTC_HEADER_BG, { width: "10%" })}>Wholesale</th>
                        <th style={cellHeader(DFTC_HEADER_BG, { width: "10%" })}>Retail</th>
                      </tr>
                    </>
                  )}

                  {/* Full-width slate grey category divider matching Image 2 */}
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
              className="mt-2.5 px-4 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-[var(--hw-neutral-50)]"
              style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 10, color: "#4b5563", fontWeight: "bold", textTransform: "uppercase" }}>Encoded by:</div>
                <div style={{ fontSize: 12, fontWeight: "bold", textDecoration: "underline", color: "#111827", marginTop: 1 }}>
                  {personnel.encodedBy}
                </div>
                <div style={{ fontSize: 10.5, color: "#374151" }}>{personnel.encodedByRole}</div>
              </div>

              <div style={{ width: 1.5, height: 32, background: "#16a34a", opacity: 0.5 }} />

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

      {/* Modern Wave Footer Decorative Bar matching Facebook Sample */}
      <div
        style={{
          height: "18px",
          background: "linear-gradient(90deg, #15803d 0%, #22c55e 50%, #16a34a 100%)",
          borderTop: "1.5px solid #16a34a"
        }}
      />
    </div>
  );
}
