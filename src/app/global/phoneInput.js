/**
 * Phone input sanitizers for the `type="tel"` fields.
 *
 * Phone values are canonicalized to the Philippine E.164 form
 * (+639XXXXXXXXX) once a complete local value is entered.
 */

const PHONE_MAX_DIGITS = 12;

export const PHONE_MAX_LENGTH = 13;

export function sanitizePhoneInput(value) {
  if (value == null) return "";
  const hasLeadingPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (hasLeadingPlus) return `+${digits.slice(0, PHONE_MAX_DIGITS)}`;
  if (digits.startsWith("639") && digits.length >= 12) {
    return `+${digits.slice(0, PHONE_MAX_DIGITS)}`;
  }
  if (digits.length === 10 && digits.startsWith("9")) {
    return `+63${digits}`;
  }
  const local = digits.slice(0, 11);
  return local.length === 11 && local.startsWith("09")
    ? `+63${local.slice(1)}`
    : local;
}
