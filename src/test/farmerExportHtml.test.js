/**
 * Unit tests for the readable data-export document builder.
 *
 * The input is the raw `/dftc/data-export` dump (snake_case, opaque ids). The
 * output must be a self-contained HTML document with plain-language labels,
 * resolved names, and every value escaped.
 */

import { describe, it, expect } from "vitest";

import { buildFarmerExportHtml, escapeHtml } from "../app/farmer/utils/farmerExportHtml";

const payload = {
  exported_at: "2026-10-01T00:00:00Z",
  profile: {
    email: "juan@example.com",
    phone: "09171234567",
    role_name: "Farmer",
    preferred_language: "ceb",
    created_at: "2026-01-02T00:00:00Z",
  },
  farmers: [
    {
      first_name: "Juan",
      last_name: "Dela Cruz",
      farm_size: 1500,
      city: "Davao City",
      barangay: "Buda",
    },
  ],
  crop_plans: [
    {
      commodity_name: "Ampalaya",
      status: "Planted",
      farm_area: 1500,
      expected_harvest_qty: 300,
      expected_farmgate_price: 25,
      planned_planting_date: "2026-08-01",
      production_costs: [
        { category: "Seeds", amount: 500, created_at: "2026-08-01T00:00:00Z" },
      ],
      calendar: [
        { calendar_date: "2026-08-01", event_type: "Planting", notes: "Done" },
      ],
      harvests: [
        {
          actual_harvest_date: "2026-10-01",
          actual_harvest_qty: 280,
          actual_selling_price_per_kg: 30,
        },
      ],
    },
  ],
};

describe("buildFarmerExportHtml", () => {
  it("renders a self-contained HTML document with friendly labels and resolved names", () => {
    const html = buildFarmerExportHtml(payload, "en");

    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    // Section headings and field labels, not raw keys.
    expect(html).toContain("My HarvestWise Data");
    expect(html).toContain("My Account");
    expect(html).toContain("My Farm");
    expect(html).toContain("My Crops");
    expect(html).toContain("Production costs");
    expect(html).not.toContain("export_");

    // Values, including resolved names and formatted numbers/currency.
    expect(html).toContain("Juan Dela Cruz");
    expect(html).toContain("juan@example.com");
    expect(html).toContain("Ampalaya");
    expect(html).toContain("Planted");
    expect(html).toContain("Seeds");
    expect(html).toContain("₱500.00");
    expect(html).toContain("280 kg");
  });

  it("localizes the document labels for the active language", () => {
    const html = buildFarmerExportHtml(payload, "ceb");
    expect(html).toContain("Akong Datos sa HarvestWise");
    expect(html).toContain("Akong mga Tanom");
  });

  it("escapes user-supplied values so a note cannot inject markup", () => {
    const html = buildFarmerExportHtml(
      {
        ...payload,
        farmers: [{ first_name: "Juan", city: "<script>alert(1)</script>" }],
      },
      "en"
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("shows a plain 'None' row for empty cost, calendar and harvest lists", () => {
    const html = buildFarmerExportHtml(
      {
        crop_plans: [
          {
            commodity_name: "Ampalaya",
            production_costs: [],
            calendar: [],
            harvests: [],
          },
        ],
      },
      "en"
    );
    const matches = html.match(/None/g) || [];
    expect(matches.length).toBe(3);
  });

  it("does not throw on an empty payload", () => {
    const html = buildFarmerExportHtml({}, "en");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  });
});

describe("escapeHtml", () => {
  it("escapes the HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;"
    );
    expect(escapeHtml(null)).toBe("");
  });
});
