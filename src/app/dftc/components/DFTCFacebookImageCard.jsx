import React from "react";

// Official HarvestWise DFTC Price Monitoring Colors
// Preserves the exact cell colors requested:
const BORDER_COLOR = "#000000";
const LEFT_BG = "#d9ead3"; // Light sage green for No., Commodity, UOM
const BANK_BG = "#fff2cc"; // Light buttery yellow for Bankerohan
const DFTC_BG = "#cfe2f3"; // Light sky blue for DFTC Taboan
const CATEGORY_BG = "#cbd5e1"; // Solid light slate-grey for category header

// Left Produce Illustration: Cabbage, Tomato, Eggplant, Carrot
function VegProduceLeft() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* Cabbage Outer Leaves */}
      <circle cx="48" cy="48" r="26" fill="#4ade80" stroke="#16a34a" strokeWidth="1.5" />
      <path d="M26 40C30 30 45 28 55 34C60 38 65 48 55 58C45 68 30 64 26 55Z" fill="#86efac" stroke="#15803d" strokeWidth="1" />
      <path d="M38 32C44 26 56 28 62 36C66 42 64 52 56 56C48 60 38 52 38 42Z" fill="#bbf7d0" />
      <path d="M42 38C48 44 54 50 58 56" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M48 35C46 42 42 48 36 52" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" />

      {/* Eggplant */}
      <ellipse cx="86" cy="38" rx="14" ry="22" transform="rotate(35 86 38)" fill="#581c87" stroke="#3b0764" strokeWidth="1.2" />
      <ellipse cx="88" cy="34" rx="4" ry="12" transform="rotate(35 88 34)" fill="#7e22ce" opacity="0.6" />
      {/* Eggplant Calyx */}
      <path d="M72 20C74 18 78 20 80 22C82 18 86 18 88 22C90 19 94 21 94 24C92 26 88 26 84 26C80 26 74 24 72 20Z" fill="#15803d" />
      <path d="M82 20C82 16 84 12 85 10" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />

      {/* Ripe Tomato */}
      <circle cx="30" cy="54" r="16" fill="#dc2626" stroke="#991b1b" strokeWidth="1.2" />
      <ellipse cx="26" cy="48" rx="4" ry="6" fill="#ef4444" opacity="0.8" />
      {/* Tomato Calyx */}
      <path d="M30 40L28 36M30 40L33 36M30 40L30 35M30 40L26 41M30 40L34 42" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />

      {/* Carrot */}
      <path d="M80 62L112 48C114 47 116 50 114 52L86 70C84 71 81 70 80 68L80 62Z" fill="#ea580c" stroke="#c2410c" strokeWidth="1.2" />
      <path d="M88 58L86 63M96 54L94 59M104 50L102 54" stroke="#c2410c" strokeWidth="1" strokeLinecap="round" />
      {/* Carrot Greens */}
      <path d="M113 49C118 46 120 42 120 38M114 50C119 50 120 48 120 44" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Right Produce Illustration: Broccoli & Cauliflower
function VegProduceRight() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* Cauliflower Leaves Frame */}
      <ellipse cx="44" cy="52" rx="26" ry="18" fill="#15803d" />
      <ellipse cx="22" cy="44" rx="12" ry="20" transform="rotate(-20 22 44)" fill="#16a34a" />
      <ellipse cx="64" cy="46" rx="12" ry="18" transform="rotate(20 64 46)" fill="#16a34a" />
      {/* Cauliflower Head (White/Cream Florets) */}
      <circle cx="44" cy="42" r="18" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
      <circle cx="34" cy="38" r="8" fill="#ffffff" />
      <circle cx="46" cy="34" r="9" fill="#ffffff" />
      <circle cx="54" cy="40" r="8" fill="#ffffff" />
      <circle cx="38" cy="46" r="8" fill="#ffffff" />
      <circle cx="48" cy="48" r="9" fill="#ffffff" />
      <circle cx="44" cy="40" r="7" fill="#fef9c3" />

      {/* Broccoli Head */}
      <ellipse cx="88" cy="44" rx="22" ry="20" fill="#166534" stroke="#14532d" strokeWidth="1.2" />
      <circle cx="78" cy="36" r="9" fill="#15803d" />
      <circle cx="92" cy="32" r="10" fill="#15803d" />
      <circle cx="100" cy="42" r="9" fill="#15803d" />
      <circle cx="82" cy="48" r="9" fill="#16a34a" />
      <circle cx="94" cy="48" r="9" fill="#16a34a" />
      <circle cx="88" cy="40" r="7" fill="#22c55e" opacity="0.6" />
      {/* Broccoli Stem */}
      <path d="M84 58L83 72C83 74 88 75 91 75L91 58" fill="#4ade80" stroke="#16a34a" strokeWidth="1" />
    </svg>
  );
}

// Left Fruits Illustration: Durian & Mango
function FruitProduceLeft() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* Durian Outer Spiky Shell */}
      <ellipse cx="44" cy="46" rx="24" ry="26" fill="#a16207" stroke="#713f12" strokeWidth="1.5" />
      {/* Spikes */}
      <path d="M22 36L18 34L22 40M20 46L16 46L21 50M24 58L20 60L26 62M34 68L32 72L38 70M46 72L46 76L50 71M58 70L62 73L60 67M66 60L70 61L66 56" stroke="#713f12" strokeWidth="1.5" strokeLinecap="round" />
      {/* Durian Open Pod revealing creamy yellow pulp */}
      <ellipse cx="42" cy="46" rx="14" ry="18" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
      <ellipse cx="39" cy="42" rx="7" ry="10" fill="#facc15" />
      <ellipse cx="44" cy="52" rx="6" ry="8" fill="#fde047" />

      {/* Ripe Yellow Mango */}
      <path d="M72 42C72 30 84 22 96 26C108 30 112 46 104 58C96 70 82 72 75 64C71 58 72 50 72 42Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1.2" />
      <ellipse cx="88" cy="44" rx="8" ry="14" transform="rotate(-15 88 44)" fill="#fef08a" opacity="0.6" />
      {/* Mango Stem & Leaf */}
      <path d="M96 26C98 22 101 18 104 16" stroke="#713f12" strokeWidth="2" strokeLinecap="round" />
      <path d="M102 20C108 18 114 20 118 24C114 26 108 24 102 20Z" fill="#15803d" stroke="#16a34a" strokeWidth="1" />
    </svg>
  );
}

// Right Fruits Illustration: Bananas, Grapes & Papaya
function FruitProduceRight() {
  return (
    <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
      {/* Bananas */}
      <path d="M22 26C28 32 38 34 50 30C52 28 50 26 44 26C34 26 26 22 22 26Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      <path d="M24 30C32 38 44 40 56 34C58 32 54 30 48 30C38 30 30 26 24 30Z" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
      <path d="M26 36C36 44 48 46 60 38C62 36 58 34 52 34C42 34 32 32 26 36Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
      <circle cx="21" cy="27" r="2.5" fill="#15803d" />

      {/* Purple Grapes Cluster */}
      <g fill="#7e22ce" stroke="#581c87" strokeWidth="0.8">
        <circle cx="76" cy="42" r="5.5" fill="#9333ea" />
        <circle cx="86" cy="40" r="5.5" />
        <circle cx="70" cy="48" r="5.5" />
        <circle cx="80" cy="48" r="5.5" fill="#a855f7" />
        <circle cx="90" cy="48" r="5.5" />
        <circle cx="74" cy="56" r="5.5" />
        <circle cx="84" cy="56" r="5.5" fill="#9333ea" />
        <circle cx="78" cy="64" r="5" />
      </g>
      <path d="M82 36C82 30 84 26 86 24" stroke="#15803d" strokeWidth="1.5" strokeLinecap="round" />

      {/* Half Papaya */}
      <path d="M92 48C92 38 100 32 108 34C116 36 120 46 118 56C116 66 108 72 100 68C94 64 92 56 92 48Z" fill="#f97316" stroke="#c2410c" strokeWidth="1" />
      <ellipse cx="106" cy="52" rx="6" ry="10" fill="#ea580c" />
      {/* Papaya Seeds */}
      <circle cx="105" cy="48" r="1.2" fill="#18181b" />
      <circle cx="107" cy="50" r="1.2" fill="#18181b" />
      <circle cx="105" cy="53" r="1.2" fill="#18181b" />
      <circle cx="106" cy="56" r="1.2" fill="#18181b" />
    </svg>
  );
}

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

  const isFruitPage = categories.some((c) => c.name === "Fruits");

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
          {/* Left Produce Graphic */}
          <div style={{ width: 120, height: 80, flexShrink: 0 }}>
            {isFruitPage ? <FruitProduceLeft /> : <VegProduceLeft />}
          </div>

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

          {/* Right Produce Graphic */}
          <div style={{ width: 120, height: 80, flexShrink: 0 }}>
            {isFruitPage ? <FruitProduceRight /> : <VegProduceRight />}
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
                  {/* Re-render column headers before Rootcrops on Spices & Rootcrops image */}
                  {catIdx > 0 && cat.name === "Rootcrops" && (
                    <>
                      <tr>
                        <th style={cellHeader(BANK_BG, { width: "10%" })}>Landing</th>
                        <th style={cellHeader(BANK_BG, { width: "10%" })}>Wholesale</th>
                        <th style={cellHeader(BANK_BG, { width: "10%" })}>Retail</th>
                        <th style={cellHeader(DFTC_BG, { width: "10%" })}>Wholesale</th>
                        <th style={cellHeader(DFTC_BG, { width: "10%" })}>Retail</th>
                      </tr>
                    </>
                  )}

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
