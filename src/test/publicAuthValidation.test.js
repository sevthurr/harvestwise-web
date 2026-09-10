import { describe, it, expect, beforeEach } from "vitest";
import {
  isValidPhPhone,
  normalizePhPhone,
  isValidEmail,
  validateContact,
  validatePasswordStrength,
  detectContactMode,
  formatContactInput,
  getContactInputMeta,
} from "../app/auth/authValidation";
import {
  getStoredPublicAuthLanguage,
  PUBLIC_AUTH_LANG_STORAGE_KEY,
  AUTH_LANGUAGES,
} from "../app/auth/usePublicAuthLanguage";
import { getCommodityIconKey } from "../app/global/components/shared/CommodityIllustrations";
import { t } from "../app/global/i18n";

describe("Public Auth - Phone Validation", () => {
  it("accepts valid 09XXXXXXXXX format (11 digits)", () => {
    expect(isValidPhPhone("09171234567")).toBe(true);
    expect(isValidPhPhone("09987654321")).toBe(true);
    expect(isValidPhPhone(" 09171234567 ")).toBe(true);
  });

  it("accepts valid +639XXXXXXXXX format", () => {
    expect(isValidPhPhone("+639171234567")).toBe(true);
    expect(isValidPhPhone("+639987654321")).toBe(true);
  });

  it("rejects invalid phone formats", () => {
    expect(isValidPhPhone("09123")).toBe(false);
    expect(isValidPhPhone("123456")).toBe(false);
    expect(isValidPhPhone("09ABC123456")).toBe(false);
    expect(isValidPhPhone("+631234567890")).toBe(false);
    expect(isValidPhPhone("+63912345")).toBe(false);
    expect(isValidPhPhone("08123456789")).toBe(false);
  });

  it("normalizes +639... to 09...", () => {
    expect(normalizePhPhone("+639171234567")).toBe("09171234567");
    expect(normalizePhPhone("09171234567")).toBe("09171234567");
  });
});

describe("Public Auth - Email Validation", () => {
  it("accepts valid email addresses including .ph and multi-part TLDs", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user@example.ph")).toBe(true);
    expect(isValidEmail("user@school.edu.ph")).toBe(true);
    expect(isValidEmail("farmer.davao@coop.org")).toBe(true);
  });

  it("rejects invalid email addresses", () => {
    expect(isValidEmail("user")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
    expect(isValidEmail("user@.com")).toBe(false);
  });
});

describe("Public Auth - Unified Contact Detection & Payload Mapping", () => {
  it("detects and normalizes phone input", () => {
    const res = validateContact("+639171234567");
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("phone");
    expect(res.normalized).toBe("09171234567");
  });

  it("detects and normalizes email input", () => {
    const res = validateContact("Farmer@Example.PH");
    expect(res.isValid).toBe(true);
    expect(res.type).toBe("email");
    expect(res.normalized).toBe("farmer@example.ph");
  });

  it("returns phone_invalid error for malformed phone", () => {
    const res = validateContact("091234");
    expect(res.isValid).toBe(false);
    expect(res.type).toBe("phone");
    expect(res.errorKey).toBe("phone_invalid");
  });

  it("returns email_invalid error for malformed email", () => {
    const res = validateContact("user@invalid");
    expect(res.isValid).toBe(false);
    expect(res.type).toBe("email");
    expect(res.errorKey).toBe("email_invalid");
  });

  it("maps payload strictly: phone only vs email only", () => {
    // Simulate phone registration
    const phoneInput = "+639171234567";
    const phoneCheck = validateContact(phoneInput);
    const phonePayload = {
      first_name: "Juan",
      last_name: "Dela Cruz",
      ...(phoneCheck.type === "phone" && { phone: phoneCheck.normalized }),
      ...(phoneCheck.type === "email" && { email: phoneCheck.normalized }),
      password: "Password123!",
    };
    expect(phonePayload.phone).toBe("09171234567");
    expect(phonePayload.email).toBeUndefined();

    // Simulate email registration
    const emailInput = "juan@example.ph";
    const emailCheck = validateContact(emailInput);
    const emailPayload = {
      first_name: "Juan",
      last_name: "Dela Cruz",
      ...(emailCheck.type === "phone" && { phone: emailCheck.normalized }),
      ...(emailCheck.type === "email" && { email: emailCheck.normalized }),
      password: "Password123!",
    };
    expect(emailPayload.email).toBe("juan@example.ph");
    expect(emailPayload.phone).toBeUndefined();
  });
});

describe("Public Auth - Password Strength", () => {
  it("validates 8+ chars, 1 uppercase, 1 number, 1 special char", () => {
    expect(validatePasswordStrength("Password123!")).toBe(true);
    expect(validatePasswordStrength("pass")).toBe(false);
    expect(validatePasswordStrength("password123!")).toBe(false); // missing uppercase
    expect(validatePasswordStrength("Password!!!!")).toBe(false); // missing number
    expect(validatePasswordStrength("Password1234")).toBe(false); // missing special char
  });
});

describe("Public Auth - Language Defaults and Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to English ('en') when no preference is stored", () => {
    expect(getStoredPublicAuthLanguage()).toBe("en");
  });

  it("preserves stored public auth language when navigating between pages", () => {
    localStorage.setItem(PUBLIC_AUTH_LANG_STORAGE_KEY, "ceb");
    expect(getStoredPublicAuthLanguage()).toBe("ceb");

    localStorage.setItem(PUBLIC_AUTH_LANG_STORAGE_KEY, "tl");
    expect(getStoredPublicAuthLanguage()).toBe("tl");
  });

  it("uses exact language labels in switcher", () => {
    expect(AUTH_LANGUAGES).toEqual([
      { code: "en", label: "English" },
      { code: "ceb", label: "Bisaya" },
      { code: "tl", label: "Filipino" },
    ]);
  });
});

describe("Public Auth - Translations & Style Standards", () => {
  it("translates Sign In title and subtitle properly", () => {
    expect(t("auth.login_title", {}, "en")).toBe("Sign in");
    expect(t("auth.login_title", {}, "ceb")).toBe("Mag-sign in");
    expect(t("auth.login_title", {}, "tl")).toBe("Mag-sign in");

    expect(t("auth.login_subtitle", {}, "en")).toBe("Access your HarvestWise account");
    expect(t("auth.login_subtitle", {}, "ceb")).toBe("I-access ang imong HarvestWise account");
    expect(t("auth.login_subtitle", {}, "tl")).toBe("I-access ang iyong HarvestWise account");
  });

  it("translates Registration title with requested adjustments", () => {
    expect(t("auth.register_title", {}, "en")).toBe("Create your farmer account");
    expect(t("auth.register_title", {}, "ceb")).toBe("Maghimo og farmer account");
    expect(t("auth.register_title", {}, "tl")).toBe("Gumawa ng farmer account");
  });

  it("translates Registration prompt without repeating 'account'", () => {
    expect(t("auth.no_farmer_account", {}, "en")).toBe("Don't have a Farmer account?");
    expect(t("auth.create_one", {}, "en")).toBe("Create one");

    expect(t("auth.no_farmer_account", {}, "ceb")).toBe("Wala pa kay Farmer account?");
    expect(t("auth.create_one", {}, "ceb")).toBe("Maghimo og usa");

    expect(t("auth.no_farmer_account", {}, "tl")).toBe("Wala ka pang Farmer account?");
    expect(t("auth.create_one", {}, "tl")).toBe("Gumawa ng isa");
  });

  it("translates Middle Name, Suffix, and optional label across languages", () => {
    // EN
    expect(t("auth.middle_name", {}, "en")).toBe("Middle Name");
    expect(t("auth.suffix", {}, "en")).toBe("Suffix");
    expect(t("auth.optional_label", {}, "en")).toBe("(optional)");

    // CEB
    expect(t("auth.middle_name", {}, "ceb")).toBe("Middle Name");
    expect(t("auth.suffix", {}, "ceb")).toBe("Suffix");
    expect(t("auth.optional_label", {}, "ceb")).toBe("(opsyonal)");

    // TL
    expect(t("auth.middle_name", {}, "tl")).toBe("Gitnang Pangalan");
    expect(t("auth.suffix", {}, "tl")).toBe("Suffix");
    expect(t("auth.optional_label", {}, "tl")).toBe("(opsyonal)");
  });

  it("translates password requirements into friendly conversational Bisaya", () => {
    expect(t("auth.requirements.min_chars", {}, "ceb")).toBe("At least 8 ka characters");
    expect(t("auth.requirements.uppercase", {}, "ceb")).toBe("At least 1 ka dako nga letra");
    expect(t("auth.requirements.number", {}, "ceb")).toBe("At least 1 ka numero");
    expect(t("auth.requirements.special_char", {}, "ceb")).toBe("At least 1 ka special character");
  });

  it("translates footer link labels correctly for EN, CEB, TL", () => {
    // EN
    expect(t("farmer.about.privacy_policy", {}, "en")).toBe("Privacy Policy");
    expect(t("farmer.about.terms_conditions", {}, "en")).toBe("Terms & Conditions");

    // CEB
    expect(t("farmer.about.privacy_policy", {}, "ceb")).toBe("Patakaran sa Pribasidad");
    expect(t("farmer.about.terms_conditions", {}, "ceb")).toBe("Mga Termino ug Kondisyon");

    // TL
    expect(t("farmer.about.privacy_policy", {}, "tl")).toBe("Patakaran sa Privacy");
    expect(t("farmer.about.terms_conditions", {}, "tl")).toBe("Mga Tuntunin at Kundisyon");
  });
});

describe("Public Auth - Live Contact Input Control Rules", () => {
  it("detects contact mode correctly", () => {
    expect(detectContactMode("")).toBe("empty");
    expect(detectContactMode("   ")).toBe("empty");
    expect(detectContactMode("09")).toBe("phone");
    expect(detectContactMode("+63")).toBe("phone");
    expect(detectContactMode("09298312983")).toBe("phone");
    expect(detectContactMode("juan@example.com")).toBe("email");
    expect(detectContactMode("juan")).toBe("email");
    expect(detectContactMode("09user@gmail.com")).toBe("email");
  });

  it("limits number of digits to 11 for local PH numbers and truncates excess digits", () => {
    // Exactly the user's reported example:
    const overflowInput = "092983129839123812938219382193819238";
    const formatted = formatContactInput(overflowInput);
    expect(formatted).toBe("09298312983");
    expect(formatted.length).toBe(11);
  });

  it("limits number of digits to 13 for +63 numbers and truncates excess digits", () => {
    const overflowPlus = "+6392983129839123812938219382193819238";
    const formatted = formatContactInput(overflowPlus);
    expect(formatted).toBe("+639298312983");
    expect(formatted.length).toBe(13);
  });

  it("strips hyphens and spaces from phone numbers", () => {
    expect(formatContactInput("0929-831-2983")).toBe("09298312983");
    expect(formatContactInput("+63 929 831 2983")).toBe("+639298312983");
  });

  it("applies email rules: strips spaces and allows standard length", () => {
    expect(formatContactInput(" juan @ example . com ")).toBe("juan@example.com");
    expect(formatContactInput("maria.delacruz@domain.com")).toBe("maria.delacruz@domain.com");
  });

  it("provides correct UI metadata and completion status", () => {
    const incompletePhone = getContactInputMeta("0929");
    expect(incompletePhone.mode).toBe("phone");
    expect(incompletePhone.currentLength).toBe(4);
    expect(incompletePhone.maxLength).toBe(11);
    expect(incompletePhone.isComplete).toBe(false);
    expect(incompletePhone.displayCount).toBe("4/11");

    const completePhone = getContactInputMeta("09298312983");
    expect(completePhone.mode).toBe("phone");
    expect(completePhone.currentLength).toBe(11);
    expect(completePhone.maxLength).toBe(11);
    expect(completePhone.isComplete).toBe(true);
    expect(completePhone.displayCount).toBe("11/11");

    const completeEmail = getContactInputMeta("farmer@example.com");
    expect(completeEmail.mode).toBe("email");
    expect(completeEmail.isComplete).toBe(true);

    const incompleteEmail = getContactInputMeta("farmer@");
    expect(incompleteEmail.mode).toBe("email");
    expect(incompleteEmail.isComplete).toBe(false);
  });
});

describe("Onboarding - Bisaya Wording & Commodity Illustrations", () => {
  it("uses conversational Bisaya: lenggwahe, Ex., mohaom, and mamalitay", () => {
    // Step 1: lenggwahe
    expect(t("onboarding.step1_title", {}, "ceb")).toBe("Pilia ang imong lenggwahe");

    // Step 2: Ex. in placeholders
    expect(t("onboarding.district_placeholder", {}, "ceb")).toContain("Ex.");
    expect(t("onboarding.barangay_placeholder", {}, "ceb")).toContain("Ex.");

    // Step 3: mohaom instead of deep maipahiangay
    expect(t("onboarding.step3_desc", {}, "ceb")).toContain("mohaom");
    expect(t("onboarding.step3_desc", {}, "ceb")).not.toContain("maipahiangay");

    // Step 4: mamalitay instead of deep pumapalit, and Ex. in placeholder
    expect(t("onboarding.selling_farmgate", {}, "ceb")).toContain("mamalitay");
    expect(t("onboarding.selling_farmgate", {}, "ceb")).not.toContain("pumapalit");
    expect(t("onboarding.selling_label_farmgate", {}, "ceb")).toContain("mamalitay");
    expect(t("onboarding.selling_buyer_placeholder", {}, "ceb")).toContain("Ex.");

    // Step 5: lenggwahe in summary
    expect(t("onboarding.summary_language", {}, "ceb")).toBe("Lenggwahe");
  });

  it("resolves distinct illustration icon keys for all 10 curated commodities", () => {
    const crops = [
      { id: "ampalaya", name: "Ampalaya" },
      { id: "atsal", name: "Atsal" },
      { id: "carrots", name: "Carrots" },
      { id: "chinese-pechay", name: "Chinese Pechay" },
      { id: "kalabasa", name: "Kalabasa" },
      { id: "kamatis", name: "Kamatis" },
      { id: "lettuce", name: "Lettuce" },
      { id: "pipino", name: "Pipino" },
      { id: "repolyo", name: "Repolyo" },
      { id: "talong", name: "Talong" },
    ];

    const keys = crops.map((c) => getCommodityIconKey(c.id, c.name, c.name));
    expect(keys).toEqual([
      "ampalaya",
      "atsal",
      "carrots",
      "pechay",
      "kalabasa",
      "kamatis",
      "lettuce",
      "pipino",
      "repolyo",
      "talong",
    ]);
  });
});


