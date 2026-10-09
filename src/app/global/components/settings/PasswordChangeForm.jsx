import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { apiPost, parseResponse } from "../../api";
import { FieldLabel, GreenBtn, GhostBtn, inputCls, PW_REQS } from "../ui/hw-ui";
import { useLanguage } from "../../contexts/LanguageContext";

/**
 * The change-password form, shared by every surface that rotates a password.
 *
 * It replaces five near-identical copies that had begun to drift: identical
 * validation and an identical POST, but three different error strings and two
 * different API call spellings (`authApi.changePassword` is literally
 * `apiPost("/auth/change-password", …)`). The containers kept their own chrome
 * and toast; only the form lives here.
 *
 * `onCancel` is optional and only resets the fields. A caller that must not
 * offer an escape route — the temporary-password panel — passes nothing, and
 * the Cancel button is not rendered at all.
 */

// PW_REQS carries the regexes; the labels are translated here so the checklist
// matches the rest of the form. Order must stay aligned with PW_REQS.
const PW_REQ_KEYS = [
  "common.pw_req_min_chars",
  "common.pw_req_uppercase",
  "common.pw_req_number",
  "common.pw_req_special",
];

// Module scope so the input elements keep stable identity across renders.
// Defined inline, React remounts the subtree on every keystroke and drops focus.
const PasswordInput = ({ id, value, visible, placeholder, onChange, toggleShow }) => (
  <div className="relative">
    <input
      id={id}
      type={visible ? "text" : "password"}
      value={value}
      autoComplete="new-password"
      onChange={(e) => {
        onChange(e.target.value);
      }}
      placeholder={placeholder}
      className={`${inputCls} pr-11`}
    />
    <button
      type="button"
      onClick={() => toggleShow()}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
      aria-label={visible ? "Hide password" : "Show password"}
    >
      {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  </div>
);

const PasswordChangeForm = ({
  onSuccess,
  onError,
  onCancel,
  idPrefix = "pw",
}) => {
  const { t } = useLanguage();
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPw({ current: "", newPw: "", confirm: "" });
    setShow({ current: false, newPw: false, confirm: false });
    setErrorMsg("");
  };

  const handleSave = async () => {
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setErrorMsg(t("common.pw_err_required", {}, "Please fill in all fields."));
      return;
    }
    if (pw.newPw !== pw.confirm) {
      setErrorMsg(t("common.pw_err_mismatch", {}, "Passwords do not match."));
      return;
    }
    if (!PW_REQS.every((r) => r.test(pw.newPw))) {
      setErrorMsg(t("common.pw_err_requirements", {}, "Password does not meet all requirements."));
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      await parseResponse(
        await apiPost("/auth/change-password", {
          current_password: pw.current,
          new_password: pw.newPw
        })
      );
      reset();
      setSubmitting(false);
      if (onSuccess) await onSuccess();
    } catch (err) {
      setSubmitting(false);
      // The caller owns its own copy where it has one (AdminSettings surfaces
      // the server's message); everyone else gets the shared fallback.
      if (onError) onError(err);
      else setErrorMsg(err?.message || t("common.pw_err_generic", {}, "Could not update password. Check your current password and try again."));
    }
  };

  const toggleShow = (field) =>
    setShow((s) => ({ ...s, [field]: !s[field] }));

  const updateField = (field) => (value) => {
    setPw((p) => ({ ...p, [field]: value }));
    setErrorMsg("");
  };

  const ids = {
    current: `${idPrefix}-current`,
    newPw: `${idPrefix}-new`,
    confirm: `${idPrefix}-confirm`,
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <FieldLabel htmlFor={ids.current}>
          {t("common.pw_current", {}, "Current password")}
        </FieldLabel>
        <PasswordInput
          id={ids.current}
          value={pw.current}
          visible={show.current}
          placeholder="••••••••"
          onChange={updateField("current")}
          toggleShow={() => toggleShow("current")}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor={ids.newPw}>
          {t("common.pw_new", {}, "New password")}
        </FieldLabel>
        <PasswordInput
          id={ids.newPw}
          value={pw.newPw}
          visible={show.newPw}
          placeholder={t("common.pw_new", {}, "New password")}
          onChange={updateField("newPw")}
          toggleShow={() => toggleShow("newPw")}
        />
        {pw.newPw && (
          <ul className="space-y-1 mt-1">
            {PW_REQS.map((r, i) => {
              const ok = r.test(pw.newPw);
              const label = t(PW_REQ_KEYS[i], {}, r.label);
              return (
                <li
                  key={r.label}
                  className={`flex items-center gap-1.5 text-[12px] ${ok ? "text-emerald-600" : "text-black"}`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? "bg-emerald-500 border-emerald-500" : "border-[var(--hw-neutral-300)]"}`}
                  >
                    {ok && <Check className="w-2.5 h-2.5 text-white" />}
                  </div>
                  {label}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor={ids.confirm}>
          {t("common.pw_confirm", {}, "Confirm new password")}
        </FieldLabel>
        <PasswordInput
          id={ids.confirm}
          value={pw.confirm}
          visible={show.confirm}
          placeholder={t("common.pw_confirm", {}, "Confirm new password")}
          onChange={updateField("confirm")}
          toggleShow={() => toggleShow("confirm")}
        />
      </div>

      {errorMsg && <p className="text-[13px] text-red-600">{errorMsg}</p>}

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <GhostBtn
            onClick={() => {
              reset();
              onCancel();
            }}
          >
            {t("common.pw_cancel", {}, "Cancel")}
          </GhostBtn>
        )}
        <GreenBtn disabled={submitting} onClick={handleSave}>
          {submitting
            ? t("common.pw_updating", {}, "Updating...")
            : t("common.pw_update", {}, "Update password")}
        </GreenBtn>
      </div>
    </div>
  );
};

export { PasswordChangeForm };