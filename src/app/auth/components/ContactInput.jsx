import React from "react";
import { Phone, Mail } from "lucide-react";
import {
  formatContactInput,
  getContactInputMeta,
} from "../authValidation";

/**
 * Intelligent ContactInput control that recognizes whether the input is
 * a phone number or an email, applying live typing rules (digit limits for numbers,
 * whitespace stripping, email formatting) and providing responsive visual feedback.
 */
export function ContactInput({
  id = "contact",
  value = "",
  onChange,
  placeholder = "name@example.com or 09XXXXXXXXX",
  required = false,
  autoComplete = "username",
  className = "",
  disabled = false,
  error = false,
  ariaDescribedBy,
}) {
  const meta = getContactInputMeta(value);

  const handleChange = (e) => {
    const rawVal = e.target.value;
    const formatted = formatContactInput(rawVal);
    if (onChange) {
      onChange(formatted);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteText = e.clipboardData ? e.clipboardData.getData("text") : "";
    const target = e.target;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? value.length;
    const combined = value.slice(0, start) + pasteText + value.slice(end);
    const formatted = formatContactInput(combined);
    if (onChange) {
      onChange(formatted);
    }
  };

  const handleKeyDown = (e) => {
    // Always allow control/navigation keys
    if (
      e.key === "Backspace" ||
      e.key === "Delete" ||
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "Tab" ||
      e.key === "Enter" ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }

    // Disallow spaces
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      return;
    }

    // Phone-specific typing rules
    if (meta.mode === "phone") {
      // Allow '@' or letters so the user can freely transition into typing an email
      if (e.key === "@" || /^[a-zA-Z]$/.test(e.key)) {
        return;
      }

      // If user types a digit
      if (/^\d$/.test(e.key)) {
        const target = e.target;
        const hasSelection =
          (target.selectionEnd ?? 0) - (target.selectionStart ?? 0) > 0;
        if (
          !hasSelection &&
          meta.maxLength &&
          meta.currentLength >= meta.maxLength
        ) {
          e.preventDefault();
          return;
        }
        return;
      }

      // Allow '+' only if typing at the very first position
      if (e.key === "+") {
        const target = e.target;
        if ((target.selectionStart ?? 0) === 0) {
          return;
        }
        e.preventDefault();
        return;
      }

      // Disallow any other non-digit symbol while in phone mode
      e.preventDefault();
    }
  };

  const inputMode =
    meta.mode === "phone" ? "tel" : meta.mode === "email" ? "email" : "text";

  return (
    <div className="relative w-full">
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        autoComplete={autoComplete}
        required={required}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} ${meta.mode !== "empty" ? "pr-11" : ""}`}
      />

      {/* Dynamic Type Recognition Icon Indicator */}
      {meta.mode !== "empty" && (
        <div
          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none select-none transition-all duration-200"
          aria-hidden="true"
        >
          {meta.mode === "phone" && (
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
                meta.isComplete
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] border-[var(--hw-neutral-200)]"
              }`}
            >
              <Phone className="w-3.5 h-3.5 text-current" />
            </span>
          )}

          {meta.mode === "email" && (
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-full border transition-colors ${
                meta.isComplete
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-600)] border-[var(--hw-neutral-200)]"
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-current" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default ContactInput;
