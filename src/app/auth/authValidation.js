/**
 * Public Authentication validation and formatting helpers.
 */

const PH_MOBILE_09_REGEX = /^09\d{9}$/;
const PH_MOBILE_63_REGEX = /^\+639\d{9}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Checks if input matches either 09XXXXXXXXX or +639XXXXXXXXX.
 */
export function isValidPhPhone(raw) {
  if (!raw) return false;
  const trimmed = raw.trim();
  return PH_MOBILE_09_REGEX.test(trimmed) || PH_MOBILE_63_REGEX.test(trimmed);
}

/**
 * Normalizes PH mobile number to 09XXXXXXXXX canonical format.
 */
export function normalizePhPhone(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("+63")) {
    return "0" + trimmed.slice(3);
  }
  return trimmed;
}

/**
 * Validates practical production-safe email addresses with proper domain & TLD.
 */
export function isValidEmail(raw) {
  if (!raw) return false;
  const trimmed = raw.trim();
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Determines whether user input appears intended as a phone number.
 */
export function isPhoneInput(raw) {
  if (!raw) return false;
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return false;
  return (
    trimmed.startsWith("+") ||
    trimmed.startsWith("09") ||
    /^\d+$/.test(trimmed)
  );
}

/**
 * Validates identifier/contact input.
 * Returns: { isValid: boolean, type: 'phone'|'email'|'unknown', normalized: string, errorKey?: string }
 */
export function validateContact(raw) {
  if (!raw || !raw.trim()) {
    return {
      isValid: false,
      type: "unknown",
      normalized: "",
      errorKey: "identifier_required",
    };
  }

  const trimmed = raw.trim();

  if (isPhoneInput(trimmed)) {
    if (isValidPhPhone(trimmed)) {
      return {
        isValid: true,
        type: "phone",
        normalized: normalizePhPhone(trimmed),
      };
    }
    return {
      isValid: false,
      type: "phone",
      normalized: trimmed,
      errorKey: "phone_invalid",
    };
  }

  // Not phone-like, check email
  if (isValidEmail(trimmed)) {
    return {
      isValid: true,
      type: "email",
      normalized: trimmed.toLowerCase(),
    };
  }

  return {
    isValid: false,
    type: "email",
    normalized: trimmed,
    errorKey: "email_invalid",
  };
}

export const PASSWORD_REQUIREMENTS = [
  { key: "min_chars",    test: (p) => p.length >= 8 },
  { key: "uppercase",    test: (p) => /[A-Z]/.test(p) },
  { key: "number",       test: (p) => /[0-9]/.test(p) },
  { key: "special_char", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePasswordStrength(password) {
  if (!password) return false;
  return PASSWORD_REQUIREMENTS.every((req) => req.test(password));
}

/**
 * Detects whether contact input is intended as phone or email.
 * Returns 'phone' | 'email' | 'empty'
 */
export function detectContactMode(value) {
  if (!value || !value.trim()) return "empty";
  const str = value.trim();

  // If it contains '@', it's definitely an email
  if (str.includes("@")) return "email";

  // If it contains any letters, it's treated as email (e.g. usernames, domain names)
  if (/[a-zA-Z]/.test(str)) return "email";

  // If it starts with '+' or starts with digits
  if (str.startsWith("+") || /^\d/.test(str)) {
    return "phone";
  }

  return "email";
}

/**
 * Applies live UI input control rules as user types or pastes into the contact field:
 * - Phone rule: Only digits (and optional leading '+'), max 11 digits for local (09...) or 13 chars for +63.
 * - Email rule: Disallows whitespace, max 254 chars.
 */
export function formatContactInput(value) {
  if (!value) return "";

  // Disallow whitespace in both modes
  const withoutSpaces = value.replace(/\s+/g, "");
  if (!withoutSpaces) return "";

  const mode = detectContactMode(withoutSpaces);

  if (mode === "phone") {
    const startsWithPlus = withoutSpaces.startsWith("+");
    const digitsOnly = withoutSpaces.replace(/\D/g, "");

    if (startsWithPlus) {
      // +63 format: '+' followed by at most 12 digits (+639XXXXXXXXX = 13 characters)
      return "+" + digitsOnly.slice(0, 12);
    } else {
      // Local PH format: at most 11 digits (09XXXXXXXXX)
      return digitsOnly.slice(0, 11);
    }
  }

  // Email mode: no whitespace, standard RFC length limit
  return withoutSpaces.slice(0, 254);
}

/**
 * Returns metadata for UI indicator (badge, icon, digit counters, completion status).
 */
export function getContactInputMeta(value) {
  const mode = detectContactMode(value);
  if (mode === "empty") {
    return { mode: "empty", currentLength: 0, maxLength: null, isComplete: false };
  }

  if (mode === "phone") {
    const isPlus = value.startsWith("+");
    const digits = value.replace(/\D/g, "");
    const maxDigits = isPlus ? 12 : 11;
    const currentLength = digits.length;
    return {
      mode: "phone",
      currentLength,
      maxLength: maxDigits,
      isComplete: isPlus
        ? currentLength === 12 && value.startsWith("+639")
        : currentLength === 11 && value.startsWith("09"),
      displayCount: `${currentLength}/${maxDigits}`,
    };
  }

  return {
    mode: "email",
    currentLength: value.length,
    maxLength: 254,
    isComplete: isValidEmail(value),
  };
}

