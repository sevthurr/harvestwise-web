import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { t, getDictionary } from "../app/global/i18n";
import { en } from "../app/global/i18n/locales/en";
import { ceb } from "../app/global/i18n/locales/ceb";
import { tl } from "../app/global/i18n/locales/tl";
import { LanguageProvider, useLanguage } from "../app/global/contexts/LanguageContext";
import PrivacyPolicyPage from "../app/global/pages/PrivacyPolicyPage";
import TermsPage from "../app/global/pages/TermsPage";
import { Footer } from "../app/global/components/Footer";

// Mock AuthContext
vi.mock("../app/global/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    isLoggedIn: false,
    loading: false,
    logout: vi.fn(),
  }),
  roleHome: () => "/farmer",
}));

// Mock Query Client
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: null, isLoading: false }),
  useQueryClient: () => ({
    getQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  }),
}));

describe("HarvestWise Legal & About - Localization Completeness", () => {
  const LOCALES = [
    ["English", "en"],
    ["Bisaya", "ceb"],
    ["Filipino", "tl"],
  ];

  it.each(LOCALES)("resolves all root About keys for %s (%s)", (_name, lang) => {
    expect(t("about.title", {}, lang)).toBeTruthy();
    expect(t("about.title", {}, lang)).not.toBe("about.title");
    expect(t("about.intro_p1", {}, lang)).toContain("Bachelor of Science in Information Technology");
    expect(t("about.intro_p1", {}, lang)).not.toContain("BSIT");
    expect(t("about.intro_p1", {}, lang)).toContain("University of Mindanao");
    expect(t("about.sections.contact.email", {}, lang)).toBe("harvestwise.app@gmail.com");
  });

  it.each(LOCALES)("resolves all root Privacy Policy keys for %s (%s)", (_name, lang) => {
    expect(t("legal.privacy.title", {}, lang)).toBeTruthy();
    expect(t("legal.privacy.title", {}, lang)).not.toBe("legal.privacy.title");
    expect(t("legal.privacy.effective_date", {}, lang)).toBe("October 9, 2026");
    expect(t("legal.privacy.version", {}, lang)).toBe("1.0");
    expect(t("legal.privacy.sections.s8.email", {}, lang)).toBe("harvestwise.app@gmail.com");
    expect(t("legal.privacy.sections.s14.email", {}, lang)).toBe("harvestwise.app@gmail.com");
    expect(t("legal.privacy.sections.s14.footer_note", {}, lang)).toContain("Bachelor of Science in Information Technology");
    expect(t("legal.privacy.sections.s14.footer_note", {}, lang)).not.toContain("BSIT");
  });

  it.each(LOCALES)("resolves all root Terms and Conditions keys for %s (%s)", (_name, lang) => {
    expect(t("legal.terms.title", {}, lang)).toBeTruthy();
    expect(t("legal.terms.title", {}, lang)).not.toBe("legal.terms.title");
    expect(t("legal.terms.effective_date", {}, lang)).toBe("October 9, 2026");
    expect(t("legal.terms.version", {}, lang)).toBe("1.0");
    expect(t("legal.terms.sections.s3.email", {}, lang)).toBe("harvestwise.app@gmail.com");
    expect(t("legal.terms.sections.s15.email", {}, lang)).toBe("harvestwise.app@gmail.com");
    expect(t("legal.terms.sections.s21.email", {}, lang)).toBe("harvestwise.app@gmail.com");
    expect(t("legal.terms.intro_p2", {}, lang)).toContain("Bachelor of Science in Information Technology");
    expect(t("legal.terms.intro_p2", {}, lang)).not.toContain("BSIT");
  });

  it.each(LOCALES)("resolves Farmer Request Account Deletion keys for %s (%s)", (_name, lang) => {
    const title = t("farmer.settings.request_deletion_title", {}, lang);
    expect(title).toBeTruthy();
    expect(title).not.toBe("farmer.settings.request_deletion_title");

    const desc = t("farmer.settings.request_deletion_desc", {}, lang);
    expect(desc).toBeTruthy();
    expect(desc).not.toBe("farmer.settings.request_deletion_desc");

    const modalBody = t("farmer.settings.request_deletion_modal_body", {}, lang);
    expect(modalBody).toContain("harvestwise.app@gmail.com");
    expect(modalBody).not.toMatch(/erased immediately/i);
  });
});

describe("Legal Copy Accuracy & Verification Constraints", () => {
  it("never abbreviates Bachelor of Science in Information Technology as BSIT in copy", () => {
    const checkNoBSIT = (obj) => {
      if (typeof obj === "string") {
        expect(obj).not.toMatch(/\bBSIT\b/);
      } else if (obj && typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          checkNoBSIT(obj[k]);
        }
      }
    };

    checkNoBSIT(en.about);
    checkNoBSIT(ceb.about);
    checkNoBSIT(tl.about);

    checkNoBSIT(en.legal);
    checkNoBSIT(ceb.legal);
    checkNoBSIT(tl.legal);
  });

  it("contains official support email harvestwise.app@gmail.com in all 3 documents", () => {
    expect(en.about.sections.contact.email).toBe("harvestwise.app@gmail.com");
    expect(en.legal.privacy.sections.s14.email).toBe("harvestwise.app@gmail.com");
    expect(en.legal.terms.sections.s21.email).toBe("harvestwise.app@gmail.com");
  });

  it("contains official Matina Campus address in all 3 documents", () => {
    const address = "University of Mindanao (UM) Matina Campus";
    expect(en.about.sections.contact.address_line1).toContain(address);
    expect(en.legal.privacy.sections.s14.address_line1).toContain(address);
    expect(en.legal.terms.sections.s21.address_line1).toContain(address);
  });

  it("explicitly states no runtime generative AI or LLM is used", () => {
    expect(en.about.sections.tech_data.p2).toContain("does not use a generative AI system or large language model");
    expect(en.legal.privacy.sections.s5.p5).toContain("does not use a generative AI system or large language model");
  });

  it("explicitly states weather risk evaluations and rainfall non-determination", () => {
    expect(en.about.sections.weather.p3).toContain("rainfall does not currently change the Weather Risk classification");
    expect(en.legal.terms.sections.s8.p4).toContain("Rainfall and rain probability are informational and do not currently determine the Weather Risk classification");
  });

  it("explicitly lists external services and disclosures", () => {
    expect(en.legal.privacy.sections.s4.open_meteo_title).toBe("Open-Meteo");
    expect(en.legal.privacy.sections.s4.osm_title).toBe("OpenStreetMap / Nominatim");
    expect(en.legal.privacy.sections.s4.psgc_title).toContain("Philippine Standard Geographic Code");
    expect(en.legal.privacy.sections.s4.supabase_title).toBe("Supabase");
    expect(en.legal.privacy.sections.s4.cloudinary_title).toBe("Cloudinary");
  });
});

describe("Standalone Public Pages & Routing Behavior", () => {
  it("renders PrivacyPolicyPage with 14 sections while logged out", () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <LanguageProvider>
          <PrivacyPolicyPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Privacy Policy|Patakaran sa Privacy/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /1\. (INFORMATION WE COLLECT|IMPORMASYON NGA AMONG GIPROSESO|IMPORMASYONG AMING PINOPROSESO)/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /14\. (CONTACT|KONTAK)/i })).toBeInTheDocument();
  });

  it("renders TermsPage with 21 sections while logged out", () => {
    render(
      <MemoryRouter initialEntries={["/terms"]}>
        <LanguageProvider>
          <TermsPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Terms and Conditions|Mga Termino ug Kondisyon|Mga Tuntunin at Kundisyon/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /1\. (PURPOSE OF HARVESTWISE|TUMONG SA HARVESTWISE|LAYUNIN NG HARVESTWISE)/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /21\. (CONTACT|KONTAK)/i })).toBeInTheDocument();
  });

  it("renders Footer without About and with modal triggers for Privacy Policy and Terms and Conditions", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LanguageProvider>
          <Footer />
        </LanguageProvider>
      </MemoryRouter>
    );

    // About link must NOT be in footer
    expect(screen.queryByRole("link", { name: /About|Mahitungod|Tungkol/i })).not.toBeInTheDocument();

    const privacyBtn = screen.getByRole("button", { name: /Privacy Policy|Patakaran sa Privacy/i });
    const termsBtn = screen.getByRole("button", { name: /Terms and Conditions|Mga Termino ug Kondisyon|Mga Tuntunin at Kundisyon/i });

    expect(privacyBtn).toBeInTheDocument();
    expect(termsBtn).toBeInTheDocument();

    // Click Privacy Policy button to open modal
    fireEvent.click(privacyBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Privacy Policy|Patakaran sa Privacy/i })).toBeInTheDocument();

    // Close modal
    const closeBtns = screen.getAllByRole("button", { name: /close/i });
    fireEvent.click(closeBtns[0]);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click Terms button to open modal
    fireEvent.click(termsBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Terms and Conditions|Mga Termino ug Kondisyon|Mga Tuntunin at Kundisyon/i })).toBeInTheDocument();
  });

  it("switches language dynamically on legal pages when language buttons are clicked", () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <LanguageProvider>
          <PrivacyPolicyPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    // Click EN
    const enBtn = screen.getByRole("button", { name: "EN" });
    fireEvent.click(enBtn);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Privacy Policy");

    // Click TL
    const tlBtn = screen.getByRole("button", { name: "TL" });
    fireEvent.click(tlBtn);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Patakaran sa Privacy");

    // Click CEB
    const cebBtn = screen.getByRole("button", { name: "CEB" });
    fireEvent.click(cebBtn);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Patakaran sa Privacy");
  });
});

describe("Farmer Registration & Account Alignment", () => {
  it("renders registration agreement with links to /terms and /privacy in RegisterPage", async () => {
    const { default: RegisterPage } = await import("../app/auth/RegisterPage");
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <LanguageProvider>
          <RegisterPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    const termsLinks = screen.getAllByRole("link", { name: /Terms and Conditions|Mga Termino ug Kondisyon|Mga Tuntunin at Kundisyon/i });
    const privacyLinks = screen.getAllByRole("link", { name: /Privacy Policy|Patakaran sa Privacy/i });

    expect(termsLinks.length).toBeGreaterThanOrEqual(1);
    termsLinks.forEach((link) => expect(link).toHaveAttribute("href", "/terms"));

    expect(privacyLinks.length).toBeGreaterThanOrEqual(1);
    privacyLinks.forEach((link) => expect(link).toHaveAttribute("href", "/privacy"));
  });


  it("Farmer, DFTC, and Admin about components all reuse CanonicalAboutContent", async () => {
    const { default: FarmerAbout } = await import("../app/farmer/pages/About");
    const { default: DFTCAbout } = await import("../app/dftc/pages/DFTCAbout");
    const { default: AdminAbout } = await import("../app/admin/pages/AdminAbout");

    // Verify all three mount without errors and render canonical copy
    const r1 = render(
      <MemoryRouter initialEntries={["/farmer/about"]}>
        <LanguageProvider>
          <FarmerAbout />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(r1.container.textContent).toContain("University of Mindanao");
    r1.unmount();

    const r2 = render(
      <MemoryRouter initialEntries={["/dftc/about"]}>
        <LanguageProvider>
          <DFTCAbout />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(r2.container.textContent).toContain("University of Mindanao");
    r2.unmount();

    const r3 = render(
      <MemoryRouter initialEntries={["/admin/about"]}>
        <LanguageProvider>
          <AdminAbout />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(r3.container.textContent).toContain("University of Mindanao");
    r3.unmount();
  });

  it("Farmer and DFTC pages retain Help / FAQs while contact form is removed", async () => {
    const { default: FarmerAbout } = await import("../app/farmer/pages/About");
    const { default: DFTCAbout } = await import("../app/dftc/pages/DFTCAbout");

    // Farmer page has FAQs accordion but no contact form
    const r1 = render(
      <MemoryRouter initialEntries={["/farmer/about"]}>
        <LanguageProvider>
          <FarmerAbout />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /FAQs/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send message/i })).not.toBeInTheDocument();
    r1.unmount();

    // DFTC page has FAQs accordion but no contact form
    const r2 = render(
      <MemoryRouter initialEntries={["/dftc/about"]}>
        <LanguageProvider>
          <DFTCAbout />
        </LanguageProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /FAQs/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Send message/i })).not.toBeInTheDocument();
    r2.unmount();
  });
});

