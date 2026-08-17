import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { Accordion, FieldLabel, GreenBtn, GhostBtn, inputCls, PW_REQS } from "../ui/hw-ui";
const ChangePasswordAccordion = ({ showToast }) => {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState({ current: "", newPw: "", confirm: "" });
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [pwError, setPwError] = useState("");
  const handleSave = () => {
    if (!pw.current || !pw.newPw || !pw.confirm) {
      setPwError("Please fill in all fields.");
      return;
    }
    if (pw.newPw !== pw.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    if (!PW_REQS.every((r) => r.test(pw.newPw))) {
      setPwError("Password does not meet all requirements.");
      return;
    }
    setPwError("");
    setOpen(false);
    setPw({ current: "", newPw: "", confirm: "" });
    showToast("Password updated successfully.");
  };
  const handleCancel = () => {
    setOpen(false);
    setPwError("");
    setPw({ current: "", newPw: "", confirm: "" });
  };
  return <Accordion title="Change password" open={open} onToggle={() => setOpen((v) => !v)}>
      <div className="space-y-3">

        {
    /* Current password */
  }
        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpw-cur">Current password</FieldLabel>
          <div className="relative">
            <input
    id="cpw-cur"
    type={showCur ? "text" : "password"}
    value={pw.current}
    onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
    placeholder="••••••••"
    className={`${inputCls} pr-11`}
  />
            <button
    type="button"
    onClick={() => setShowCur((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
              {showCur ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {
    /* New password */
  }
        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpw-new">New password</FieldLabel>
          <div className="relative">
            <input
    id="cpw-new"
    type={showNew ? "text" : "password"}
    value={pw.newPw}
    onChange={(e) => setPw((p) => ({ ...p, newPw: e.target.value }))}
    placeholder="New password"
    className={`${inputCls} pr-11`}
  />
            <button
    type="button"
    onClick={() => setShowNew((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {pw.newPw && <ul className="space-y-1 mt-1">
              {PW_REQS.map((r) => {
    const ok = r.test(pw.newPw);
    return <li key={r.label} className={`flex items-center gap-1.5 text-[12px] ${ok ? "text-emerald-600" : "text-black"}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? "bg-emerald-500 border-emerald-500" : "border-[var(--hw-neutral-300)]"}`}>
                      {ok && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    {r.label}
                  </li>;
  })}
            </ul>}
        </div>

        {
    /* Confirm password */
  }
        <div className="space-y-1.5">
          <FieldLabel htmlFor="cpw-cfm">Confirm new password</FieldLabel>
          <div className="relative">
            <input
    id="cpw-cfm"
    type={showCfm ? "text" : "password"}
    value={pw.confirm}
    onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
    placeholder="Repeat new password"
    className={`${inputCls} pr-11`}
  />
            <button
    type="button"
    onClick={() => setShowCfm((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-black"
  >
              {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {pwError && <p className="text-[13px] text-red-600">{pwError}</p>}

        <div className="flex gap-2 pt-1">
          <GhostBtn onClick={handleCancel}>Cancel</GhostBtn>
          <GreenBtn onClick={handleSave}>Update password</GreenBtn>
        </div>

      </div>
    </Accordion>;
};
export {
  ChangePasswordAccordion
};
