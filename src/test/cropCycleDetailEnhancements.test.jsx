import { describe, it, expect } from "vitest";
import { formatClassification } from "../app/farmer/pages/CropCycleDetail.jsx";
import { ceb } from "../app/global/i18n/locales/ceb.js";
import { tl } from "../app/global/i18n/locales/tl.js";
import { en } from "../app/global/i18n/locales/en.js";

describe("CropCycleDetail Enhancements", () => {
  const getTranslator = (localeObj) => {
    return (path, _params, fallback) => {
      const parts = path.split(".");
      let cur = localeObj;
      for (const part of parts) {
        if (!cur || typeof cur !== "object") return fallback;
        cur = cur[part];
      }
      return cur !== undefined ? cur : fallback;
    };
  };

  it("translates factor classifications correctly in Cebuano", () => {
    const tCeb = getTranslator(ceb);
    expect(formatClassification("Neutral", tCeb)).toBe("Halos Pareho");
    expect(formatClassification("Low", tCeb)).toBe("Ubos");
    expect(formatClassification("Upper Middle", tCeb)).toBe("Katamtamang Taas");
    expect(formatClassification("Severe", tCeb)).toBe("Taas ang Risk");
    expect(formatClassification("Favorable", tCeb)).toBe("Maayo");
    expect(formatClassification("Marginal", tCeb)).toBe("Duol sa Pagbawi sa Gasto");
    expect(formatClassification("Lower Middle", tCeb)).toBe("Katamtamang Ubos");
    expect(formatClassification("Caution", tCeb)).toBe("Kinahanglan Bantayan");
  });

  it("translates factor classifications correctly in Tagalog", () => {
    const tTl = getTranslator(tl);
    expect(formatClassification("Neutral", tTl)).toBe("Halos Pareho");
    expect(formatClassification("Low", tTl)).toBe("Mababa");
    expect(formatClassification("Upper Middle", tTl)).toBe("Katamtamang Mataas");
    expect(formatClassification("Severe", tTl)).toBe("Mataas ang Panganib");
    expect(formatClassification("Favorable", tTl)).toBe("Maganda");
  });

  it("translates factor classifications correctly in English", () => {
    const tEn = getTranslator(en);
    expect(formatClassification("Neutral", tEn)).toBe("Neutral");
    expect(formatClassification("Low", tEn)).toBe("Low");
    expect(formatClassification("Upper Middle", tEn)).toBe("Upper Middle");
    expect(formatClassification("Severe", tEn)).toBe("Severe");
    expect(formatClassification("Favorable", tEn)).toBe("Favorable");
  });

  it("has show and hide translation strings in all languages", () => {
    expect(ceb.common.show).toBe("Ipakita");
    expect(ceb.common.hide).toBe("Itago");
    expect(tl.common.show).toBe("Ipakita");
    expect(tl.common.hide).toBe("Itago");
    expect(en.common.show).toBe("Show");
    expect(en.common.hide).toBe("Hide");
  });
});
