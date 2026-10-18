/**
 * Phone input sanitizers for the `type="tel"` fields.
 *
 * Hard rule: a phone number is digits only. A single leading `+` is preserved
 * (Philippine international form, e.g. +639000000000) so pasted international
 * numbers are never silently mangled into a wrong local number.
 */

const PHONE_MAX_DIGITS = 12;

export const PHONE_MAX_LENGTH = 13;

export function sanitizePhoneInput(value) {
  if (value == null) return "";
  const hasLeadingPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  return hasLeadingPlus
    ? `+${digits.slice(0, PHONE_MAX_DIGITS)}`
    : digits.slice(0, 11);
}