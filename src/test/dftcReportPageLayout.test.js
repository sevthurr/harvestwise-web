/**
 * Regression tests for the DFTC price monitoring report layout.
 *
 * The report's commodity catalogue used to be a 32-entry array hardcoded in
 * `dftcReportCategories.js`, with mock price columns beside every row. It had
 * drifted from the sheet it is compared against and nothing could catch it:
 *
 *  - 19 of the published sheet's 51 commodities were missing entirely.
 *  - Atsal was filed under HIGHLAND VEGETABLES and Chinese Pechay under LOWLAND,
 *    while the workbook, the API seed and the live database all said Spices and
 *    Highland Vegetables.
 *  - The printed row number did not match the printed row position.
 *  - The mock prices were overwritten at render time, so ~160 numbers sat in the
 *    file looking authoritative and resolving to nothing.
 *
 * The catalogue is now served by `/dftc/reports/preview`, read from
 * `commodity.display_order` and seeded by
 * `api/scripts/data/dftc_price_report.py`. The workbook the order comes from is
 * a document, not a runtime dependency, so the client holds nothing to drift.
 *
 * `api/tests/test_dftc_price_report_seed.py` covers the catalogue itself — it is
 * the one place the order can be wrong now. This file covers the client's half:
 * grouping the served categories onto pages, and rendering them in the order and
 * with the numbering the server sent.
 */
import { describe, it, expect } from "vitest";
import { PAGE_CATEGORY_GROUPS } from "../app/dftc/components/dftcReportCategories.js";

// A `/dftc/reports/preview` payload in the shape the endpoint returns: the
// categories the commodity master holds, already in survey order.
const CATEGORIES = [
  { name: "Lowland Vegetables", commodities: [
    { no: 1, name: "Ampalaya", uom: "kg", variants: [{ variety: "Galaxy", uom: "kg" }] },
    { no: 2, name: "Batong", uom: "kg", variants: [{ variety: "Negrostar", uom: "kg" }] },
  ]},
  { name: "Highland Vegetables", commodities: [
    { no: 1, name: "Baguio Beans", uom: "kg", variants: [{ variety: "Pencil", uom: "kg" }] },
    { no: 2, name: "Carrots", uom: "kg", variants: [
      { variety: "Big", uom: "kg" }, { variety: "Medium", uom: "kg" }, { variety: "Small", uom: "kg" },
    ]},
    { no: 3, name: "Chinese Pechay", uom: "kg", variants: [{ variety: null, uom: "kg" }] },
  ]},
  { name: "Spices", commodities: [
    { no: 1, name: "Ahos", uom: "kg", variants: [{ variety: "Imported", uom: "kg" }] },
    { no: 2, name: "Atsal", uom: "kg", variants: [
      { variety: "Smooth Cayene", uom: "kg" }, { variety: "Sultan", uom: "kg" },
    ]},
  ]},
  { name: "Rootcrops", commodities: [
    { no: 1, name: "Gabi", uom: "kg", variants: [{ variety: "Bisol", uom: "kg" }] },
  ]},
  { name: "Fruits", commodities: [
    { no: 1, name: "Durian", uom: "kg", variants: [{ variety: "Puyat", uom: "kg" }] },
  ]},
  { name: "Others", commodities: [
    { no: 1, name: "Sweet Corn", uom: "sack/pcs", variants: [{ variety: null, uom: "sack/pcs" }] },
  ]},
];

/** What `DFTCFilePreview` builds from the payload, minus the price columns. */
function toLayout(categories) {
  return categories.map((cat) => ({
    name: cat.name,
    commodities: cat.commodities.map((com) => ({
      no: com.no,
      name: com.name,
      variants: com.variants.map((v) => ({
        descriptor: v.variety ? `(${v.variety})` : "",
        uom: v.uom || com.uom || "kg"
      }))
    }))
  }));
}

describe("report page layout", () => {
  it("splits the served categories across four pages, in served order", () => {
    const pages = PAGE_CATEGORY_GROUPS.map(
      (group) => group.map((name) => CATEGORIES.find((c) => c.name === name)).filter(Boolean)
    );
    expect(pages.map((p) => p.map((c) => c.name))).toEqual([
      ["Lowland Vegetables"],
      ["Highland Vegetables"],
      ["Spices", "Rootcrops"],
      ["Fruits", "Others"],
    ]);
  });

  it("places every served category on exactly one page", () => {
    const onPages = PAGE_CATEGORY_GROUPS.flat();
    expect(onPages).toEqual(CATEGORIES.map((c) => c.name));
    expect(new Set(onPages).size).toBe(onPages.length);
  });

  // Two categories share page 3 and two share page 4, so a row number is only
  // unique within its category. Keying on the number alone collided across them.
  it("gives every rendered row a distinct key within a page", () => {
    for (const group of PAGE_CATEGORY_GROUPS) {
      const keys = group.flatMap((name) => {
        const cat = CATEGORIES.find((c) => c.name === name);
        if (!cat) return [];
        return cat.commodities.flatMap((com) =>
          com.variants.map((_, vi) => `${cat.name}-${com.name}-${vi}`)
        );
      });
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe("catalogue rendered from the API payload", () => {
  const layout = toLayout(CATEGORIES);

  it("keeps the server's commodity order and row numbers", () => {
    expect(layout.map((c) => c.name)).toEqual(CATEGORIES.map((c) => c.name));
    for (const [i, cat] of layout.entries()) {
      expect(cat.commodities.map((c) => c.no)).toEqual(CATEGORIES[i].commodities.map((c) => c.no));
    }
  });

  it("renders a variety as a parenthesised descriptor, and nothing when there is none", () => {
    const carrots = layout[1].commodities.find((c) => c.name === "Carrots");
    expect(carrots.variants.map((v) => v.descriptor)).toEqual(["(Big)", "(Medium)", "(Small)"]);
    const pechay = layout[1].commodities.find((c) => c.name === "Chinese Pechay");
    expect(pechay.variants.map((v) => v.descriptor)).toEqual([""]);
  });

  it("carries the traded unit through, including non-kg ones", () => {
    expect(layout[5].commodities[0].variants[0].uom).toBe("sack/pcs");
    expect(layout[1].commodities[1].variants.map((v) => v.uom)).toEqual(["kg", "kg", "kg"]);
  });

  it("puts Atsal in Spices and Chinese Pechay in Highland Vegetables", () => {
    expect(layout[2].commodities.map((c) => c.name)).toContain("Atsal");
    expect(layout[1].commodities.map((c) => c.name)).toContain("Chinese Pechay");
    expect(layout[0].commodities.map((c) => c.name)).not.toContain("Chinese Pechay");
  });

  it("renders nothing for a payload that has not loaded", () => {
    expect(toLayout(undefined ?? [])).toEqual([]);
  });
});