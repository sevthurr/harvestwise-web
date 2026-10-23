import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import VerticalLogo from "../../imports/logo";
import { Footer } from "../global/components/Footer";
import { parseResponse } from "../global/api";
import { authApi } from "../../services/api";
import { usePublicAuthLanguage } from "./usePublicAuthLanguage";
import { AuthLanguageSwitcher } from "./components/AuthLanguageSwitcher";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../global/components/ui/input-otp";
import { isValidEmail, validatePasswordStrength } from "./authValidation";

const OTP_LENGTH = 6;
const inputClass =
  "w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { authLang, t } = usePublicAuthLanguage();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setError(t("auth.errors.email_invalid", {}, "Enter a valid email address."));
      return;
    }
    if (code.length !== OTP_LENGTH) {
      setError(t("auth.reset_password_invalid_code", {}, "Enter the 6-digit reset code."));
      return;
    }
    if (!validatePasswordStrength(password)) {
      setError(t("auth.errors.password_requirements", {}, "Password does not meet all requirements."));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.reset_password_password_mismatch", {}, "Passwords do not match."));
      return;
    }

    setError("");
    setLoading(true);
    try {
      await parseResponse(await authApi.resetPassword(normalizedEmail, code, password));
      navigate("/login", {
        replace: true,
        state: { passwordResetMessage: t("auth.reset_password_success", {}, "Password reset successfully. Please sign in.") },
      });
    } catch (err) {
      setError(err.message || t("auth.reset_password_invalid_code", {}, "Invalid or expired reset code."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm relative flex flex-col items-center mb-6">
        <div className="absolute right-0 top-1 z-10"><AuthLanguageSwitcher /></div>
        <div className="w-[180px] h-[130px] overflow-hidden">
          <div className="scale-[0.36] origin-top-left w-[494px] h-[361px]"><VerticalLogo /></div>
        </div>
        <h1 className="text-[28px] font-bold text-[var(--hw-neutral-900)] leading-tight text-center">
          {t("auth.reset_password_title", {}, "Reset your password")}
        </h1>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-7">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">{t("auth.email", {}, "Email")}</label>
            <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">{t("auth.reset_password_code_label", {}, "6-digit reset code")}</label>
            <div className="flex justify-center py-1">
              <InputOTP maxLength={OTP_LENGTH} value={code} onChange={(value) => { setCode(value); setError(""); }}>
                <InputOTPGroup>{Array.from({ length: OTP_LENGTH }, (_, index) => <InputOTPSlot key={index} index={index} />)}</InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">{t("auth.reset_password_new_password", {}, "New password")}</label>
            <div className="relative">
              <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" required value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] p-1" aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">{t("auth.reset_password_confirm_password", {}, "Confirm new password")}</label>
            <div className="relative">
              <input id="confirm-password" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" required value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setError(""); }} className={`${inputClass} pr-11`} />
              <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] p-1" aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
                {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>
          {error && <p role="alert" className="text-[13px] text-red-600 font-medium">{error}</p>}
          <button type="submit" disabled={loading} className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors">
            {loading ? t("auth.verifying", {}, "Resetting…") : t("auth.reset_password_submit", {}, "Reset password")}
          </button>
        </form>
        <div className="text-center mt-5"><Link to="/login" className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)]">{t("auth.back_to_sign_in", {}, "Back to sign in")}</Link></div>
      </div>
      <Footer lang={authLang} className="mt-4" />
    </div>
  );
}

export { ResetPasswordPage as default };
