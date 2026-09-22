import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { apiPost, parseResponse } from "../../api";
import { Modal, FieldLabel, GreenBtn, GhostBtn, inputCls, PW_REQS } from "../ui/hw-ui";

/**
 * Dismissible prompt shown while the signed-in user is still on an
 * admin-provisioned temporary password (user.must_change_password).
 * Submits the standard /auth/change-password payload, then notifies the
 * caller so it can refresh the profile and hide the prompt.
 */

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

const ChangePasswordPrompt = ({ onClose, onChanged }) => {
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPw: false, confirm: false });
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (pw.newPw !== pw.confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (!PW_REQS.every((r) => r.test(pw.newPw))) {
      setErrorMsg("Password does not meet all requirements.");
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
      setSubmitting(false);
      if (onChanged) await onChanged();
    } catch {
      setSubmitting(false);
      setErrorMsg("Could not update your password. Check your current password and try again.");
    }
  };

  const toggleShow = (field) =>
    setShow((s) => ({ ...s, [field]: !s[field] }));

  return (
    <Modal title="Change your password" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-[14px] text-black">
          To keep your account secure, please replace the temporary password you
          received with a password only you know.
        </p>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpp-current">Current password</FieldLabel>
          <PasswordInput
            id="cpp-current"
            value={pw.current}
            visible={show.current}
            placeholder="••••••••"
            onChange={(v) => {
              setPw((p) => ({ ...p, current: v }));
              setErrorMsg("");
            }}
            toggleShow={() => toggleShow("current")}
          />
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpp-new">New password</FieldLabel>
          <PasswordInput
            id="cpp-new"
            value={pw.newPw}
            visible={show.newPw}
            placeholder="New password"
            onChange={(v) => {
              setPw((p) => ({ ...p, newPw: v }));
              setErrorMsg("");
            }}
            toggleShow={() => toggleShow("newPw")}
          />
          {pw.newPw && (
            <ul className="space-y-1 mt-1">
              {PW_REQS.map((r) => {
                const ok = r.test(pw.newPw);
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
                    {r.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpp-confirm">Confirm new password</FieldLabel>
          <PasswordInput
            id="cpp-confirm"
            value={pw.confirm}
            visible={show.confirm}
            placeholder="Repeat new password"
            onChange={(v) => {
              setPw((p) => ({ ...p, confirm: v }));
              setErrorMsg("");
            }}
            toggleShow={() => toggleShow("confirm")}
          />
        </div>

        {errorMsg && <p className="text-[13px] text-red-600">{errorMsg}</p>}

        <div className="flex gap-2 justify-end pt-1">
          <GhostBtn onClick={onClose}>Later</GhostBtn>
          <GreenBtn disabled={submitting} onClick={handleSave}>
            {submitting ? "Updating..." : "Update password"}
          </GreenBtn>
        </div>
      </div>
    </Modal>
  );
};

export { ChangePasswordPrompt };