import React, { useState, useRef } from "react";
import { Download, Check, AlertCircle, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";

const LEFT_BG = "#c6efce";
const BANK_BG = "#ffeb9c";
const DFTC_BG = "#dae8fc";

const DFTC_PERSONNEL_LIST = [
  { name: "CHRISTIAN JOEY PAUL M. HERMOSO", role: "Agricultural Technologist" },
  { name: "IVY JOYCE P. BOLODO", role: "Agri-Service & Related Worker" }
];

const DEFAULT_PERSONNEL = {
  encodedBy: DFTC_PERSONNEL_LIST[0].name,
  encodedByRole: DFTC_PERSONNEL_LIST[0].role,
  preparedBy: DFTC_PERSONNEL_LIST[1].name,
  preparedByRole: DFTC_PERSONNEL_LIST[1].role
};

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

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const DFTC_REPORT_CATEGORIES = [
  {
    name: "LOWLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Kamatis", variants: [
        { descriptor: "(diamante Big)", uom: "kg", bankLanding: "55.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "60.00", dftcRetail: "90.00" },
        { descriptor: "(local round)", uom: "kg", bankLanding: "50.00", bankWholesale: "58.00", bankRetail: "78.00", dftcWholesale: "—", dftcRetail: "75.00" }
      ] },
      { no: 2, name: "Talong", variants: [
        { descriptor: "(banate king)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "60.00", dftcWholesale: "35.00", dftcRetail: "55.00" },
        { descriptor: "(round/native)", uom: "kg", bankLanding: "28.00", bankWholesale: "32.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 3, name: "Pipino", variants: [
        { descriptor: "(mega c)", uom: "kg", bankLanding: "20.00", bankWholesale: "28.00", bankRetail: "45.00", dftcWholesale: "25.00", dftcRetail: "42.00" }
      ] },
      { no: 4, name: "Ampalaya", variants: [
        { descriptor: "(galaxy)", uom: "kg", bankLanding: "38.00", bankWholesale: "45.00", bankRetail: "70.00", dftcWholesale: "42.00", dftcRetail: "65.00" },
        { descriptor: "(white/pale)", uom: "kg", bankLanding: "—", bankWholesale: "42.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" }
      ] },
      { no: 5, name: "Kalabasa", variants: [
        { descriptor: "(suprema)", uom: "kg", bankLanding: "18.00", bankWholesale: "25.00", bankRetail: "40.00", dftcWholesale: "22.00", dftcRetail: "38.00" }
      ] },
      { no: 6, name: "Chinese Pechay", variants: [
        { descriptor: "(baby pechay)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" },
        { descriptor: "(regular)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 7, name: "Native Pechay", variants: [
        { descriptor: "(condor)", uom: "kg/bundle", bankLanding: "10.00", bankWholesale: "15.00", bankRetail: "25.00", dftcWholesale: "—", dftcRetail: "22.00" }
      ] },
      { no: 8, name: "Okra", variants: [
        { descriptor: "(smooth green)", uom: "kg", bankLanding: "30.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 9, name: "Sitaw", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "60.00" }
      ] },
      { no: 10, name: "Batong", variants: [
        { descriptor: "(negrostar)", uom: "kg", bankLanding: "32.00", bankWholesale: "42.00", bankRetail: "60.00", dftcWholesale: "—", dftcRetail: "55.00" }
      ] }
    ]
  },
  {
    name: "HIGHLAND VEGETABLES",
    commodities: [
      { no: 1, name: "Repolyo", variants: [
        { descriptor: "(green cabbage)", uom: "kg", bankLanding: "38.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "45.00", dftcRetail: "62.00" },
        { descriptor: "(red cabbage)", uom: "kg", bankLanding: "55.00", bankWholesale: "68.00", bankRetail: "90.00", dftcWholesale: "—", dftcRetail: "85.00" }
      ] },
      { no: 2, name: "Atsal", variants: [
        { descriptor: "(smooth cayene)", uom: "kg", bankLanding: "100.00", bankWholesale: "130.00", bankRetail: "190.00", dftcWholesale: "120.00", dftcRetail: "185.00" },
        { descriptor: "(sultan)", uom: "kg", bankLanding: "85.00", bankWholesale: "110.00", bankRetail: "165.00", dftcWholesale: "—", dftcRetail: "160.00" }
      ] },
      { no: 3, name: "Carrots", variants: [
        { descriptor: "(big)", uom: "kg", bankLanding: "48.00", bankWholesale: "60.00", bankRetail: "85.00", dftcWholesale: "55.00", dftcRetail: "80.00" },
        { descriptor: "(medium)", uom: "kg", bankLanding: "42.00", bankWholesale: "54.00", bankRetail: "75.00", dftcWholesale: "50.00", dftcRetail: "72.00" },
        { descriptor: "(small)", uom: "kg", bankLanding: "35.00", bankWholesale: "46.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 4, name: "Lettuce", variants: [
        { descriptor: "(curly)", uom: "kg", bankLanding: "50.00", bankWholesale: "65.00", bankRetail: "95.00", dftcWholesale: "—", dftcRetail: "90.00" },
        { descriptor: "(ball)", uom: "kg", bankLanding: "45.00", bankWholesale: "58.00", bankRetail: "85.00", dftcWholesale: "—", dftcRetail: "80.00" }
      ] },
      { no: 5, name: "Broccoli", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "80.00", bankWholesale: "100.00", bankRetail: "145.00", dftcWholesale: "—", dftcRetail: "140.00" }
      ] },
      { no: 6, name: "Cauliflower", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "135.00", dftcWholesale: "—", dftcRetail: "130.00" }
      ] },
      { no: 7, name: "Sayote", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "22.00", bankWholesale: "30.00", bankRetail: "45.00", dftcWholesale: "—", dftcRetail: "42.00" }
      ] }
    ]
  },
  {
    name: "SPICES",
    commodities: [
      { no: 1, name: "Luya", variants: [
        { descriptor: "(fresh ginger)", uom: "kg", bankLanding: "75.00", bankWholesale: "95.00", bankRetail: "110.00", dftcWholesale: "—", dftcRetail: "105.00" }
      ] },
      { no: 2, name: "Bawang", variants: [
        { descriptor: "(local)", uom: "kg", bankLanding: "130.00", bankWholesale: "165.00", bankRetail: "220.00", dftcWholesale: "150.00", dftcRetail: "210.00" },
        { descriptor: "(imported)", uom: "kg", bankLanding: "200.00", bankWholesale: "265.00", bankRetail: "340.00", dftcWholesale: "—", dftcRetail: "330.00" }
      ] },
      { no: 3, name: "Sibuyas", variants: [
        { descriptor: "(red onion)", uom: "kg", bankLanding: "110.00", bankWholesale: "145.00", bankRetail: "180.00", dftcWholesale: "—", dftcRetail: "175.00" },
        { descriptor: "(bombay/yellow)", uom: "kg", bankLanding: "—", bankWholesale: "—", bankRetail: "—", dftcWholesale: "—", dftcRetail: "—" }
      ] },
      { no: 4, name: "Sili", variants: [
        { descriptor: "(labuyo)", uom: "kg", bankLanding: "180.00", bankWholesale: "220.00", bankRetail: "280.00", dftcWholesale: "—", dftcRetail: "270.00" },
        { descriptor: "(espada/haba)", uom: "kg", bankLanding: "40.00", bankWholesale: "55.00", bankRetail: "80.00", dftcWholesale: "—", dftcRetail: "75.00" },
        { descriptor: "(baguio)", uom: "kg", bankLanding: "95.00", bankWholesale: "120.00", bankRetail: "160.00", dftcWholesale: "—", dftcRetail: "155.00" }
      ] }
    ]
  },
  {
    name: "ROOTCROPS",
    commodities: [
      { no: 1, name: "Kamote", variants: [
        { descriptor: "(orange/yellow)", uom: "kg", bankLanding: "25.00", bankWholesale: "35.00", bankRetail: "50.00", dftcWholesale: "—", dftcRetail: "48.00" },
        { descriptor: "(purple/violet)", uom: "kg", bankLanding: "30.00", bankWholesale: "40.00", bankRetail: "58.00", dftcWholesale: "—", dftcRetail: "55.00" }
      ] },
      { no: 2, name: "Gabi", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "40.00", bankWholesale: "52.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 3, name: "Singkamas", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "45.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 4, name: "Ube", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "55.00", bankWholesale: "70.00", bankRetail: "90.00", dftcWholesale: "—", dftcRetail: "88.00" }
      ] }
    ]
  },
  {
    name: "FRUITS",
    commodities: [
      { no: 1, name: "Saging", variants: [
        { descriptor: "(lakatan)", uom: "kg", bankLanding: "48.00", bankWholesale: "62.00", bankRetail: "85.00", dftcWholesale: "—", dftcRetail: "80.00" },
        { descriptor: "(latundan)", uom: "kg", bankLanding: "38.00", bankWholesale: "52.00", bankRetail: "70.00", dftcWholesale: "—", dftcRetail: "65.00" },
        { descriptor: "(saba)", uom: "kg", bankLanding: "28.00", bankWholesale: "38.00", bankRetail: "55.00", dftcWholesale: "—", dftcRetail: "50.00" }
      ] },
      { no: 2, name: "Mangga", variants: [
        { descriptor: "(carabao/ripe)", uom: "kg", bankLanding: "95.00", bankWholesale: "125.00", bankRetail: "150.00", dftcWholesale: "—", dftcRetail: "145.00" },
        { descriptor: "(green/unripe)", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] },
      { no: 3, name: "Papaya", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "25.00", bankWholesale: "35.00", bankRetail: "45.00", dftcWholesale: "—", dftcRetail: "42.00" },
        { descriptor: "(solo/hawaiian)", uom: "kg", bankLanding: "40.00", bankWholesale: "55.00", bankRetail: "75.00", dftcWholesale: "—", dftcRetail: "72.00" }
      ] },
      { no: 4, name: "Durian", variants: [
        { descriptor: "(Puyat)", uom: "kg", bankLanding: "150.00", bankWholesale: "200.00", bankRetail: "250.00", dftcWholesale: "—", dftcRetail: "245.00" }
      ] }
    ]
  },
  {
    name: "OTHERS",
    commodities: [
      { no: 1, name: "Mushroom", variants: [
        { descriptor: "(button)", uom: "kg", bankLanding: "180.00", bankWholesale: "240.00", bankRetail: "320.00", dftcWholesale: "—", dftcRetail: "310.00" },
        { descriptor: "(oyster)", uom: "kg", bankLanding: "150.00", bankWholesale: "200.00", bankRetail: "280.00", dftcWholesale: "—", dftcRetail: "270.00" }
      ] },
      { no: 2, name: "Tokwa / Tofu", variants: [
        { descriptor: "(firm)", uom: "pcs", bankLanding: "45.00", bankWholesale: "60.00", bankRetail: "80.00", dftcWholesale: "—", dftcRetail: "78.00" },
        { descriptor: "(soft)", uom: "pcs", bankLanding: "38.00", bankWholesale: "50.00", bankRetail: "68.00", dftcWholesale: "—", dftcRetail: "65.00" }
      ] },
      { no: 3, name: "Toge (Bean Sprouts)", variants: [
        { descriptor: "(regular)", uom: "kg", bankLanding: "35.00", bankWholesale: "48.00", bankRetail: "65.00", dftcWholesale: "—", dftcRetail: "62.00" }
      ] }
    ]
  }
];

const PAGE_CATEGORY_GROUPS = [
  ["LOWLAND VEGETABLES"],
  ["HIGHLAND VEGETABLES"],
  ["SPICES", "ROOTCROPS"],
  ["FRUITS", "OTHERS"]
];

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

function PDFPreviewContent({ personnel, reportDate }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  return (
    <div className="space-y-5">
      {PAGE_CATEGORY_GROUPS.map((group, idx) => {
        const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
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

function ExcelPreviewContent({ personnel, reportDate, reportDateShort }) {
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
          const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
          return <DFTCReportPage key={idx} pageIndex={idx} totalPages={total} categories={cats} isFirst={idx === 0} isLast={idx === total - 1} reportDate={reportDate} personnel={idx === total - 1 ? personnel : void 0} />;
        })}
      </div>
      <div className="bg-[#f3f3f3] border-t border-[var(--hw-neutral-300)] px-3 py-1.5 flex items-center gap-1">
        <div className="px-3 py-0.5 bg-white border border-b-0 border-[var(--hw-neutral-300)] rounded-t text-[12px] font-medium text-[#217346] -mb-1.5">Price Monitoring</div>
      </div>
    </div>
  );
}

function IMGPreview({ page, onPageChange, personnel, reportDate }) {
  const total = PAGE_CATEGORY_GROUPS.length;
  const currentCats = PAGE_CATEGORY_GROUPS[page].map((name) => DFTC_REPORT_CATEGORIES.find((c) => c.name === name)).filter(Boolean);

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
  const [updated, setUpdated] = useState(false);
  const pageRefs = useRef([]);
  const total = PAGE_CATEGORY_GROUPS.length;

  const reportingDate = formatDisplayDate(file.reportingDate || file.savedDate);
  const reportingDateShort = formatDisplayDateShort(file.reportingDate || file.savedDate);
  const reportReference = file.reportId || file.reportReferenceNo || file.fileId || "—";
  const encodedByName = getEncodedByName(file);

  function updatePersonnel(field, name) {
    const user = DFTC_PERSONNEL_LIST.find((p) => p.name === name);
    if (!user) return;
    setPersonnel((prev) => ({
      ...prev,
      [field]: user.name,
      [field === "encodedBy" ? "encodedByRole" : "preparedByRole"]: user.role
    }));
    setUpdated(true);
    setTimeout(() => setUpdated(false), 3000);
  }

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

      DFTC_REPORT_CATEGORIES.forEach((cat) => {
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
    <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] flex flex-col w-full overflow-hidden">
      {/* ── Header (Back button only, title: Preview Daily Report) ── */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-[var(--hw-neutral-100)] bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 -ml-1 rounded-xl hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-700)] hover:text-[var(--hw-neutral-900)] transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[16px] font-bold text-[var(--hw-neutral-900)]">Preview Daily Report</h2>
        </div>
      </div>

      {/* ── Report Metadata (Per Line 76-80: DFTC Price Monitoring — {date}, Report ID, Reporting Date, Class A) ── */}
      <div className="px-4 md:px-6 py-3.5 border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]/50">
        <p className="font-semibold text-[15px] text-[var(--hw-neutral-900)] mb-2">DFTC Price Monitoring — {reportingDate}</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
          {[
            ["Report ID", reportReference],
            ["Reporting Date", reportingDate],
            ["Class", "A"],
            ["Records Included", String(file.records ?? 0)],
            ["Saved Date", file.savedDate || "—"],
            ["Encoded By", encodedByName]
          ].map(([label, val]) => (
            <div key={label} className="min-w-0">
              <span className="text-[11px] font-medium text-[var(--hw-neutral-600)] block">{label}:</span>
              <span className="text-[12px] font-medium text-[var(--hw-neutral-900)] truncate block" title={val}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Format tabs ── */}
      <div className="px-4 md:px-6 py-3 border-b border-[var(--hw-neutral-100)]">
        <div className="flex gap-2">
          {["PDF", "Excel", "IMG"].map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`px-4 py-2 rounded-xl border text-[13px] font-medium transition-colors ${format === f ? "border-[var(--hw-green-700)] bg-[var(--hw-green-50)] text-[var(--hw-green-800)]" : "border-[var(--hw-neutral-200)] text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)]"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Preview area (full-width on desktop, smoothly scrollable on mobile) ── */}
      <div className="p-3 md:p-6 bg-[var(--hw-neutral-50)]">
        {format === "IMG" && (
          <IMGPreview
            page={imgPage}
            onPageChange={setImgPage}
            personnel={personnel}
            reportDate={reportingDate}
          />
        )}
        {format === "PDF" && <PDFPreviewContent personnel={personnel} reportDate={reportingDate} />}
        {format === "Excel" && <ExcelPreviewContent personnel={personnel} reportDate={reportingDate} reportDateShort={reportingDateShort} />}
      </div>

      {/* ── Report Personnel ── */}
      <div className="px-4 md:px-6 py-4 border-t border-[var(--hw-neutral-100)] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-1">Encoded By</label>
            <select
              value={personnel.encodedBy}
              onChange={(e) => updatePersonnel("encodedBy", e.target.value)}
              className="text-[12px] border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] w-full"
            >
              {DFTC_PERSONNEL_LIST.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <span className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5">{personnel.encodedByRole}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <label className="text-[12px] font-semibold text-[var(--hw-neutral-800)] mb-1">Prepared By</label>
            <select
              value={personnel.preparedBy}
              onChange={(e) => updatePersonnel("preparedBy", e.target.value)}
              className="text-[12px] border border-[var(--hw-neutral-200)] rounded-xl px-3 py-2 bg-white text-[var(--hw-neutral-900)] focus:outline-none focus:border-[var(--hw-green-700)] w-full"
            >
              {DFTC_PERSONNEL_LIST.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            <span className="text-[11px] text-[var(--hw-neutral-600)] mt-0.5">{personnel.preparedByRole}</span>
          </div>
          {updated && (
            <div className="flex items-center gap-1.5 self-end pb-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-[12px] text-emerald-700 font-medium">Report personnel updated</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {isError && (
        <div className="px-4 md:px-6 py-2.5 bg-red-50 border-t border-red-100 shrink-0 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-[12px] text-red-700">
            {errorFormat === "PDF" ? "PDF" : errorFormat === "EXCEL" ? "Excel" : "Image"} generation failed.{" "}
            <button className="underline font-medium" onClick={() => setDlState("idle")}>Try again</button>
          </span>
        </div>
      )}

      {/* ── Action bar ── */}
      <div className="px-4 md:px-6 py-4 border-t border-[var(--hw-neutral-100)] flex items-center justify-between gap-3 bg-white">
        <button
          onClick={onClose}
          className="py-2.5 px-5 rounded-xl border border-[var(--hw-neutral-200)] text-[13px] font-medium text-[var(--hw-neutral-800)] hover:bg-[var(--hw-neutral-50)] transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className="flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-[var(--hw-green-700)] text-white text-[13px] font-medium hover:bg-[var(--hw-green-800)] transition-colors disabled:opacity-60"
        >
          {isGenerating ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span>{dlLabel}</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 shrink-0" />
              <span>{dlLabel}</span>
            </>
          )}
        </button>
      </div>

      {/* Hidden off-screen pages for html2canvas rendering */}
      <div style={{ position: "fixed", left: -9999, top: 0, width: 960, pointerEvents: "none" }}>
        {PAGE_CATEGORY_GROUPS.map((group, idx) => {
          const cats = group.map((n) => DFTC_REPORT_CATEGORIES.find((c) => c.name === n)).filter(Boolean);
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
        })}
      </div>
    </div>
  );
}

export { DFTCFilePreview };
