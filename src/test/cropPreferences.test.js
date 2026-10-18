import { describe, it, expect } from "vitest";
import {
  getPreferredCropMatcher,
  isPreferredCrop,
  sortWithPreferredFirst,
} from "../app/farmer/utils/cropPreferences";

describe("cropPreferences utility", () => {
  const mockPreferredCrops = [
    { commodity_id: "COM-0001", commodity_name: "Ampalaya", variety_name: "Galaxy" },
    { commodity_id: "COM-0008", commodity_name: "Pipino" },
    { commodityId: "COM-0023", commodityName: "Chinese Pechay" },
  ];

  it("identifies preferred crops from array of objects", () => {
    const matcher = getPreferredCropMatcher(mockPreferredCrops);

    expect(matcher.isPreferred({ id: "COM-0001", name: "Ampalaya" })).toBe(true);
    expect(matcher.isPreferred({ commodityId: "COM-0008", name: "Pipino" })).toBe(true);
    expect(matcher.isPreferred({ name: "Chinese Pechay" })).toBe(true);
    expect(matcher.isPreferred({ name: "pechay" })).toBe(true);
    expect(matcher.isPreferred("Ampalaya")).toBe(true);
    expect(matcher.isPreferred("pipino")).toBe(true);

    // Non-preferred
    expect(matcher.isPreferred({ id: "COM-0004", name: "Kamatis" })).toBe(false);
    expect(matcher.isPreferred("Carrots")).toBe(false);
  });

  it("handles settings dictionary format { Ampalaya: 'Galaxy', Pipino: '' }", () => {
    const matcher = getPreferredCropMatcher({ Ampalaya: "Galaxy", Pipino: "" });
    expect(matcher.isPreferred("Ampalaya")).toBe(true);
    expect(matcher.isPreferred("Pipino")).toBe(true);
    expect(matcher.isPreferred({ name: "Kamatis" })).toBe(false);
  });

  it("handles full profile object", () => {
    const matcher = getPreferredCropMatcher({ preferredCrops: mockPreferredCrops });
    expect(matcher.isPreferred({ name: "Ampalaya" })).toBe(true);
    expect(matcher.isPreferred({ name: "Kamatis" })).toBe(false);
  });

  it("sorts items with preferred crops first while maintaining secondary sort", () => {
    const items = [
      { id: "1", name: "Talong" },
      { id: "2", name: "Ampalaya" },
      { id: "3", name: "Kamatis" },
      { id: "4", name: "Pipino" },
      { id: "5", name: "Carrots" },
    ];

    const sorted = sortWithPreferredFirst(items, mockPreferredCrops, (a, b) =>
      a.name.localeCompare(b.name)
    );

    // Preferred crops (Ampalaya, Pipino) should be first, sorted A-Z
    expect(sorted.slice(0, 2).map((c) => c.name)).toEqual(["Ampalaya", "Pipino"]);
    // Non-preferred crops (Carrots, Kamatis, Talong) should follow, sorted A-Z
    expect(sorted.slice(2).map((c) => c.name)).toEqual(["Carrots", "Kamatis", "Talong"]);
  });

  it("handles empty or null preferred crops safely", () => {
    const items = [{ name: "B" }, { name: "A" }];
    const sorted = sortWithPreferredFirst(items, null, (a, b) => a.name.localeCompare(b.name));
    expect(sorted.map((c) => c.name)).toEqual(["A", "B"]);
  });
});
