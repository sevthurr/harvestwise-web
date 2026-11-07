import {
  FB,
  BORDER_COLOR,
  LEFT_BG,
  BANK_BG,
  DFTC_BG,
  CATEGORY_BG,
  computeFBLayout
} from "./DFTCFacebookImageCard";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, { size, bold, italic, color = "#111827", align = "left" }) {
  ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${size}px Arial, Helvetica, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(str, x, y);
}

function cell(ctx, x, y, w, h, bg) {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

/**
 * Draws one Facebook price card on a native canvas using the exact same
 * layout numbers as the on-screen DFTCFacebookImageCard (no DOM rasterising,
 * so text can never shift, overlap or clip).
 */
export function renderFBCardToCanvas({ categories, reportDate, personnel, isLast }, scale = 2) {
  const hasSig = !!(isLast && personnel);
  const { rows, heights, fontSize } = computeFBLayout(categories, hasSig);
  const canvas = document.createElement("canvas");
  canvas.width = FB.W * scale;
  canvas.height = FB.H * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Card shell
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, FB.W, FB.H);
  ctx.save();
  roundRect(ctx, 0, 0, FB.W, FB.H, 16);
  ctx.clip();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, FB.W, FB.H);

  // Header
  const cx = FB.W / 2;
  text(ctx, "DAVAO FOOD TERMINAL COMPLEX", cx, 10 + 13, { size: 20, bold: true, color: "#000000", align: "center" });
  text(ctx, "PRICE MONITORING", cx, 38 + 16, { size: 28, bold: true, color: "#16a34a", align: "center" });

  const dateStr = `PREVAILING MARKET PRICES AS OF ${String(reportDate).toUpperCase()}`;
  ctx.font = "bold 12px Arial, Helvetica, sans-serif";
  const dateW = ctx.measureText(dateStr).width + 44;
  ctx.fillStyle = "#15803d";
  roundRect(ctx, cx - dateW / 2, 74, dateW, 24, 12);
  ctx.fill();
  text(ctx, dateStr, cx, 74 + 12, { size: 12, bold: true, color: "#ffffff", align: "center" });

  ctx.font = "bold 12px Arial, Helvetica, sans-serif";
  const classW = ctx.measureText("CLASS A").width + 52;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, cx - classW / 2, 100, classW, 22, 11);
  ctx.fill();
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 2;
  roundRect(ctx, cx - classW / 2 + 1, 101, classW - 2, 20, 10);
  ctx.stroke();
  text(ctx, "CLASS A", cx, 100 + 11, { size: 12, bold: true, color: "#15803d", align: "center" });

  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, FB.HEADER_H - 2, FB.W, 2);

  // Table geometry
  const tx = FB.PAD;
  const tw = FB.W - FB.PAD * 2;
  const colW = FB.COLS.map((c) => Math.round(c * tw));
  colW[7] = tw - colW.slice(0, 7).reduce((a, b) => a + b, 0) - 1;
  const colX = [];
  colW.reduce((acc, w, i) => {
    colX[i] = acc;
    return acc + w;
  }, tx);
  let y = FB.HEADER_H + FB.PAD;
  const HR = FB.HEAD_ROW_H;
  const span = (a, b) => colX[b] + colW[b] - colX[a];

  // Column headers
  [[0, "No.", "center"], [1, "Commodity", "left"], [2, "UOM", "center"]].forEach(([i, label, al]) => {
    cell(ctx, colX[i], y, colW[i], HR * 2, LEFT_BG);
    text(ctx, label, al === "left" ? colX[i] + 6 : colX[i] + colW[i] / 2, y + HR, { size: 11, bold: true, align: al });
  });
  cell(ctx, colX[3], y, span(3, 5), HR, BANK_BG);
  text(ctx, "BANKEROHAN MARKET", colX[3] + span(3, 5) / 2, y + HR / 2, { size: 11, bold: true, align: "center" });
  cell(ctx, colX[6], y, span(6, 7), HR, DFTC_BG);
  text(ctx, "DFTC TABOAN", colX[6] + span(6, 7) / 2, y + HR / 2, { size: 11, bold: true, align: "center" });
  ["Landing", "Wholesale", "Retail", "Wholesale", "Retail"].forEach((label, k) => {
    const i = 3 + k;
    cell(ctx, colX[i], y + HR, colW[i], HR, i < 6 ? BANK_BG : DFTC_BG);
    text(ctx, label, colX[i] + colW[i] / 2, y + HR + HR / 2, { size: 11, bold: true, align: "center" });
  });
  y += HR * 2;

  // Body rows
  rows.forEach((r, i) => {
    const h = heights[i];
    const mid = y + h / 2;
    if (r.type === "cat") {
      cell(ctx, tx, y, tw - 1, h, CATEGORY_BG);
      text(ctx, r.name.toUpperCase(), tx + 6, mid, { size: fontSize, bold: true, italic: true });
    } else {
      const { com, v, vi } = r;
      for (let c = 0; c < 8; c++) {
        cell(ctx, colX[c], y, colW[c], h, c < 3 ? LEFT_BG : c < 6 ? BANK_BG : DFTC_BG);
      }
      if (vi === 0) text(ctx, String(com.no ?? ""), colX[0] + colW[0] / 2, mid, { size: fontSize, align: "center" });
      if (vi === 0) {
        text(ctx, com.name, colX[1] + 6, mid, { size: fontSize, bold: true });
        ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
        const nameW = ctx.measureText(com.name + " ").width;
        text(ctx, v.descriptor || "", colX[1] + 6 + nameW, mid, { size: fontSize });
      } else {
        text(ctx, v.descriptor || "", colX[1] + 6 + 14, mid, { size: fontSize });
      }
      text(ctx, v.uom || "", colX[2] + colW[2] / 2, mid, { size: fontSize, align: "center" });
      [v.bankLanding, v.bankWholesale, v.bankRetail, v.dftcWholesale, v.dftcRetail].forEach((val, k) => {
        if (val) text(ctx, String(val), colX[3 + k] + colW[3 + k] - 6, mid, { size: fontSize, align: "right" });
      });
    }
    y += h;
  });

  // Signature block
  if (hasSig) {
    const sigY = FB.H - FB.FOOTER_H - 8 - (FB.SIG_H - 12);
    const sigH = FB.SIG_H - 12;
    ctx.fillStyle = "#f9fafb";
    roundRect(ctx, FB.PAD, sigY, FB.W - FB.PAD * 2, sigH, 8);
    ctx.fill();
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    roundRect(ctx, FB.PAD + 0.5, sigY + 0.5, FB.W - FB.PAD * 2 - 1, sigH - 1, 8);
    ctx.stroke();
    const blocks = [
      [FB.W * 0.25, "ENCODED BY:", personnel.encodedBy, personnel.encodedByRole],
      [FB.W * 0.75, "REVIEWED BY:", personnel.reviewedBy || personnel.preparedBy, personnel.reviewedByRole || personnel.preparedByRole]
    ];
    blocks.forEach(([bx, label, name, role]) => {
      text(ctx, label, bx, sigY + 14, { size: 10, bold: true, color: "#4b5563", align: "center" });
      text(ctx, name || "", bx, sigY + 31, { size: 12, bold: true, align: "center" });
      ctx.font = "bold 12px Arial, Helvetica, sans-serif";
      const nw = ctx.measureText(name || "").width;
      ctx.fillStyle = "#111827";
      ctx.fillRect(bx - nw / 2, sigY + 38, nw, 1);
      text(ctx, role || "", bx, sigY + 48, { size: 10.5, color: "#374151", align: "center" });
    });
    ctx.fillStyle = "rgba(22,163,74,0.6)";
    ctx.fillRect(FB.W / 2 - 1, sigY + 12, 2, 36);
  }

  // Footer gradient
  const g = ctx.createLinearGradient(0, 0, FB.W, 0);
  g.addColorStop(0, "#15803d");
  g.addColorStop(0.5, "#22c55e");
  g.addColorStop(1, "#16a34a");
  ctx.fillStyle = g;
  ctx.fillRect(0, FB.H - FB.FOOTER_H, FB.W, FB.FOOTER_H);
  ctx.restore();

  // Outer border
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = FB.BORDER;
  roundRect(ctx, FB.BORDER / 2, FB.BORDER / 2, FB.W - FB.BORDER, FB.H - FB.BORDER, 15);
  ctx.stroke();

  return canvas;
}
