/**
 * Regression tests for how the price monitoring report resolves a cell.
 *
 * `DFTCFilePreview` is layout-only: every price comes from
 * `/dftc/reports/preview` and is matched by commodity name + variety. The
 * matcher used to fall back to *the first variety row for that commodity*
 * whenever a variety missed.
 *
 * That fallback published real numbers under the wrong label. Against the live
 * payload it made Repolyo (green cabbage) and Repolyo (red cabbage) both print
 * the Wakamini price, Ampalaya (white/pale) print Galaxy, Kamatis (local round)
 * print Diamante Big, and Talong (round/native) print Banate King — five rows
 * of confident, wrong, plausible-looking money on a report a DFTC user exports
 * and compares against the published sheet.
 *
 * A blank is honest. A borrowed number is not, so a variety that matches no
 * seeded row now resolves to nothing.
 *
 * SECOND REGRESSION, and the reason the test shape matters: `resolvePriceRow`
 * read `variant.descriptor`, but the preview payload's variant objects carry
 * `variety`. The property was simply absent, so every named variety normalised
 * to "" and fell through to the NULL-variety branch. Live effect: 1 priced row
 * (Chinese Pechay, the only NULL-variety commodity) out of 79. The old suite
 * passed 12/12 because it constructed its own `{ descriptor }` object — it
 * validated an invented shape rather than the real call site. The tests below
 * therefore pass the RAW variety string, exactly as `DFTCFilePreview` does.
 */
import { describe, it, expect } from "vitest";
import { buildRowsLookup, normalizeKey, resolvePriceRow } from "../app/dftc/components/DFTCFilePreview.jsx";

// The rows `/dftc/reports/preview` actually returns — each row's `variety` is
// both the seeded value and the lookup key, which is the whole contract.
const PAYLOAD = [
  { commodity_name: "Ampalaya", variety: "Galaxy" },
  { commodity_name: "Atsal", variety: "Smooth Cayene" },
  { commodity_name: "Atsal", variety: "Sultan" },
  { commodity_name: "Carrots", variety: "Big" },
  { commodity_name: "Carrots", variety: "Medium" },
  { commodity_name: "Carrots", variety: "Small" },
  { commodity_name: "Chinese Pechay", variety: null },
  { commodity_name: "Kalabasa", variety: "Suprema" },
  { commodity_name: "Kamatis", variety: "Diamante Big" },
  { commodity_name: "Lettuce", variety: "Ball" },
  { commodity_name: "Lettuce", variety: "Curly" },
  { commodity_name: "Pipino", variety: "Mega C" },
  { commodity_name: "Repolyo", variety: "Wakamini" },
  { commodity_name: "Talong", variety: "Banate King" }
];

const lookup = buildRowsLookup(PAYLOAD);
// Mirrors the call site: resolvePriceRow({ name: com.name }, v.variety, lookup).
const resolve = (name, variety) => resolvePriceRow({ name }, variety, lookup);

describe("resolvePriceRow", () => {
  // If this fails with a blank, the matcher is reading a property the payload
  // does not carry — the defect that blanked 78 of 79 cells.
  it("matches the raw seeded variety string from the payload", () => {
    expect(resolve("Repolyo", "Wakamini")?.variety).toBe("Wakamini");
    expect(resolve("Kamatis", "Diamante Big")?.variety).toBe("Diamante Big");
    expect(resolve("Ampalaya", "Galaxy")?.variety).toBe("Galaxy");
    expect(resolve("Pipino", "Mega C")?.variety).toBe("Mega C");
    expect(resolve("Lettuce", "Curly")?.variety).toBe("Curly");
  });

  // Every seeded row in the payload must be reachable. Under the
  // `variant.descriptor` regression this resolved exactly one.
  it("reaches all 13 named-variety rows in the payload", () => {
    const named = PAYLOAD.filter((r) => r.variety !== null);
    expect(named).toHaveLength(13);
    for (const row of named) {
      const hit = resolve(row.commodity_name, row.variety);
      expect(hit, `${row.commodity_name} ${row.variety}`).not.toBeNull();
      expect(hit.commodity_name).toBe(row.commodity_name);
    }
  });

  it("matches case-insensitively", () => {
    expect(resolve("Kamatis", "DIAMANTE big")?.variety).toBe("Diamante Big");
    expect(resolve("Lettuce", "ball")?.variety).toBe("Ball");
  });

  // The five rows that printed another variety's money.
  it.each([
    ["Repolyo", "green cabbage"],
    ["Repolyo", "red cabbage"],
    ["Ampalaya", "white/pale"],
    ["Kamatis", "local round"],
    ["Talong", "round/native"]
  ])("resolves %s %s to nothing rather than a neighbouring variety", (name, variety) => {
    expect(resolve(name, variety)).toBeNull();
  });

  it("resolves a commodity with no variety only to its own null-variety row", () => {
    expect(resolve("Chinese Pechay", null)?.variety).toBeNull();
    expect(resolve("Chinese Pechay", "")?.variety).toBeNull();
    expect(resolve("Chinese Pechay", "baby pechay")).toBeNull();
  });

  it("resolves nothing for a commodity absent from the payload", () => {
    expect(resolve("Baguio Beans", "Pencil")).toBeNull();
    expect(resolve("Durian", "Puyat")).toBeNull();
  });

  it("never returns a row whose variety differs from the one asked for", () => {
    for (const row of PAYLOAD) {
      if (!row.variety) continue;
      const hit = resolve(row.commodity_name, row.variety);
      expect(normalizeKey(hit?.variety), `${row.commodity_name} ${row.variety}`)
        .toBe(normalizeKey(row.variety));
    }
  });
});

describe("normalizeKey", () => {
  // The workbook spells a Saging variety "señorita"; the seeded row spells it
  // "Senorita". A bare [^a-z0-9] strip folds the first to "se orita" but the
  // second to "senorita" — two keys for one variety, so the row silently lost
  // its price. Diacritics are folded first so the two agree.
  it("treats an accented variety as the unaccented seeded spelling", () => {
    expect(normalizeKey("señorita")).toBe(normalizeKey("Senorita"));
    expect(resolve("Saging", "señorita")).toBeNull();
  });

  it("still collapses punctuation and case", () => {
    expect(normalizeKey("Diamante Big")).toBe("diamante big");
    expect(normalizeKey("Mega C")).toBe("mega c");
    expect(normalizeKey(null)).toBe("");
  });
});