import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import VerticalLogo from "../../imports/logo";
import { useAuth, roleHome } from "../global/contexts/AuthContext";
import { Footer } from "../global/components/Footer";
import { apiPost, parseResponse } from "../global/api";
import { authApi } from "../../services/api";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../global/components/ui/input-otp";
import { usePublicAuthLanguage } from "./usePublicAuthLanguage";
import { AuthLanguageSwitcher } from "./components/AuthLanguageSwitcher";
import { ContactInput } from "./components/ContactInput";
import { validateContact } from "./authValidation";

const SCALE = 0.85;
const LOGO_W = Math.round(494 * SCALE);
const LOGO_H = Math.round(361 * SCALE);

function LogoMark() {
  return (
    <div style={{ width: LOGO_W, height: LOGO_H, overflow: "hidden" }}>
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 494, height: 361 }}>
        <VerticalLogo />
      </div>
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { authLang, t } = usePublicAuthLanguage();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA challenge state
  const [mfaToken, setMfaToken] = useState(null);
  const [mfaFactor, setMfaFactor] = useState("totp");
  const [showMfa, setShowMfa] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError(t("auth.errors.identifier_required", {}, "Enter your email or mobile number."));
      return;
    }

    const contactCheck = validateContact(trimmedIdentifier);
    if (!contactCheck.isValid) {
      if (contactCheck.errorKey === "phone_invalid") {
        setError(t("auth.errors.phone_invalid", {}, "Enter a valid Philippine mobile number."));
      } else {
        setError(t("auth.errors.email_invalid", {}, "Enter a valid email address."));
      }
      return;
    }

    if (!password.trim()) {
      setError(t("auth.errors.password_required", {}, "Enter your password."));
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/api/v1/auth/login", {
        identifier: contactCheck.normalized,
        password,
      });
      const data = await parseResponse(res);

      // 2FA required — hold the short-lived mfa_token in state only
      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        setMfaFactor(data.factor || "totp");
        setShowMfa(true);
        return;
      }

      const me = await login(data);
      navigate(roleHome(me.role.role_name), { replace: true });
    } catch (err) {
      const msg = err.message ?? "";
      if (err.status === 429) {
        setError(msg || t("auth.errors.account_locked", {}, "Account locked. Please try again later."));
      } else if (err.status === 403) {
        setError(t("auth.errors.account_inactive", {}, "Your account is inactive. Contact support."));
      } else {
        setError(t("auth.errors.invalid_credentials", {}, "Invalid email/phone or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMfa = async (eventCode) => {
    const code = eventCode ?? mfaCode;
    if (!mfaToken || code.length !== 6) return;
    setMfaError("");
    setMfaLoading(true);
    try {
      const res =
        mfaFactor === "email_otp"
          ? await authApi.verifyEmailOtp(mfaToken, code)
          : await authApi.verifyTotpLogin(mfaToken, code);
      const tokens = await parseResponse(res);
      const me = await login(tokens);
      navigate(roleHome(me.role.role_name), { replace: true });
    } catch (err) {
      setMfaCode("");
      setMfaError(
        err.status === 429
          ? (err.message ?? "Too many failed attempts. Try again later.")
          : (err.message ?? "Invalid code. Try again.")
      );
    } finally {
      setMfaLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!mfaToken) return;
    setMfaError("");
    setMfaLoading(true);
    try {
      const res = await authApi.requestEmailOtp(mfaToken);
      await parseResponse(res);
      setMfaError("A new code was sent to your email.");
    } catch (err) {
      setMfaError(err.message ?? "Could not resend the code. Try again.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    if (!recoveryCode.trim()) return;
    setMfaError("");
    setMfaLoading(true);
    try {
      const res = await authApi.recoverTotp(identifier.trim(), password, recoveryCode.trim());
      await parseResponse(res);
      // TOTP is now disabled — log in normally with the same credentials
      const loginRes = await apiPost("/api/v1/auth/login", {
        identifier: identifier.trim(),
        password,
      });
      const tokens = await parseResponse(loginRes);
      const me = await login(tokens);
      navigate(roleHome(me.role.role_name), { replace: true });
    } catch (err) {
      setMfaCode("");
      setMfaError(
        err.status === 429
          ? (err.message ?? "Too many failed attempts. Try again later.")
          : (err.message ?? "Invalid recovery code.")
      );
    } finally {
      setMfaLoading(false);
    }
  };

  // Google sign-in: backend OAuth endpoint not yet implemented — kept for future use
  const handleGoogle = async () => {
    // No-op until backend Google OAuth is available
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      {/* Logo + header + Language Switcher */}
      <div className="w-full max-w-sm relative flex flex-col items-center mb-6">
        <div className="absolute right-0 top-1 z-10">
          <AuthLanguageSwitcher />
        </div>
        <LogoMark />
        <h1 className="-mt-15 text-[28px] font-bold text-[var(--hw-neutral-900)] leading-tight text-center">
          {t("auth.login_title", {}, "Sign in")}
        </h1>
        <p className="mt-0.5 text-[15px] text-[var(--hw-neutral-500)] text-center">
          {t("auth.login_subtitle", {}, "Access your HarvestWise account")}
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-7 space-y-4">
        {showMfa ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
              <span className="text-[15px] text-[var(--hw-neutral-600)] font-medium">
                {t("auth.two_factor_title", {}, "Two-Factor Authentication")}
              </span>
              <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
            </div>
            <p className="text-[14px] text-[var(--hw-neutral-600)] text-center">
              {mfaFactor === "email_otp"
                ? t("auth.enter_email_code", {}, "Enter the 6-digit code sent to your email.")
                : t("auth.enter_authenticator_code", {}, "Enter the 6-digit code from your authenticator app.")}
            </p>
            <div className="flex justify-center pt-1">
              <InputOTP
                maxLength={6}
                value={mfaCode}
                onChange={(v) => {
                  setMfaCode(v);
                  setMfaError("");
                }}
                onComplete={handleVerifyMfa}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>
            {mfaError && (
              <p role="alert" className="text-[13px] text-red-600 font-medium text-center">
                {mfaError}
              </p>
            )}
            <button
              type="button"
              disabled={mfaLoading || mfaCode.length !== 6}
              onClick={() => handleVerifyMfa()}
              className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
            >
              {mfaLoading
                ? t("auth.verifying", {}, "Verifying…")
                : t("auth.verify_code", {}, "Verify")}
            </button>
            <div className="flex items-center justify-center gap-4">
              {mfaFactor === "email_otp" && (
                <button
                  type="button"
                  disabled={mfaLoading}
                  onClick={handleResendOtp}
                  className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] disabled:opacity-50 transition-colors"
                >
                  {t("auth.resend_code", {}, "Resend code")}
                </button>
              )}
              {mfaFactor === "totp" && (
                <button
                  type="button"
                  onClick={() => {
                    setShowRecovery((v) => !v);
                    setMfaError("");
                    setRecoveryCode("");
                  }}
                  className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
                >
                  {t("auth.use_recovery_code", {}, "Use a recovery code")}
                </button>
              )}
            </div>
            {showRecovery && (
              <form onSubmit={handleRecovery} className="space-y-3 border-t border-[var(--hw-neutral-100)] pt-3">
                <p className="text-[13px] text-[var(--hw-neutral-600)]">
                  {t("auth.recovery_code_hint", {}, "Using a recovery code will disable 2FA so you can set up a new device.")}
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="recovery-code" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
                    {t("auth.recovery_code_label", {}, "Recovery code")}
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    autoComplete="off"
                    value={recoveryCode}
                    onChange={(e) => {
                      setRecoveryCode(e.target.value);
                      setMfaError("");
                    }}
                    placeholder="XXXXX-XXXXX"
                    className="w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent placeholder:text-[var(--hw-neutral-400)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mfaLoading || !recoveryCode.trim()}
                  className="w-full h-11 flex items-center justify-center bg-white border border-[var(--hw-neutral-300)] text-[15px] font-medium text-[var(--hw-neutral-700)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
                >
                  {mfaLoading
                    ? t("auth.recovering", {}, "Recovering…")
                    : t("auth.recover_access", {}, "Recover access")}
                </button>
              </form>
            )}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowMfa(false);
                  setMfaToken(null);
                  setMfaCode("");
                  setMfaError("");
                  setShowRecovery(false);
                  setRecoveryCode("");
                }}
                className="text-[13px] font-medium text-[var(--hw-neutral-500)] hover:text-[var(--hw-neutral-700)] transition-colors"
              >
                {t("auth.back_to_sign_in", {}, "Back to sign in")}
              </button>
            </div>
          </div>
        ) : (
        <>
        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
          {/* Email / phone */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
              {t("auth.email_or_mobile", {}, "Email or mobile number")}
              <span className="text-red-500 ml-1 font-semibold" aria-hidden="true">*</span>
            </label>
            <ContactInput
              id="identifier"
              value={identifier}
              onChange={(val) => {
                setIdentifier(val);
                setError("");
              }}
              placeholder={t("auth.contact_placeholder", {}, "name@example.com or 09XXXXXXXXX")}
              required
              className="w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
              error={!!error}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
                {t("auth.password_label", {}, "Password")}
                <span className="text-red-500 ml-1 font-semibold" aria-hidden="true">*</span>
              </label>
              <button
                type="button"
                className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                {t("auth.forgot_password", {}, "Forgot password?")}
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                required
                aria-required="true"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder={t("auth.password_placeholder", {}, "Enter your password")}
                className="w-full h-11 pl-3.5 pr-11 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] transition-colors p-1"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p role="alert" className="text-[13px] text-red-600 font-medium">
              {error}
            </p>
          )}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
          >
            {loading ? t("auth.sign_in_loading", {}, "Signing in…") : t("auth.sign_in", {}, "Sign in")}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
          <span className="text-[12px] text-[var(--hw-neutral-400)] font-medium">
            {t("auth.or", {}, "or")}
          </span>
          <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
        </div>

        {/* Google — disabled: no backend OAuth endpoint */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          title="Google sign-in is not available yet"
          className="w-full h-11 flex items-center justify-center gap-2.5 bg-white border border-[var(--hw-neutral-200)] text-[15px] font-medium text-[var(--hw-neutral-400)] rounded-xl cursor-not-allowed opacity-50"
          aria-disabled="true"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {t("auth.google_sign_in", {}, "Sign in with Google")}
          <span className="text-[11px] ml-1 text-[var(--hw-neutral-400)]">
            {t("auth.google_unavailable_parentheses", {}, "(unavailable)")}
          </span>
        </button>

        {/* Farmer Registration Prompt */}
        <p className="text-center text-[14px] text-[var(--hw-neutral-600)]">
          {t("auth.no_farmer_account", {}, "Don't have a Farmer account?")}{" "}
          <Link
            to="/register"
            className="font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
          >
            {t("auth.create_one", {}, "Create one")}
          </Link>
        </p>
        </>
        )}
      </div>

      <Footer lang={authLang} className="mt-4" />
    </div>
  );
}

export { LoginPage as default };

