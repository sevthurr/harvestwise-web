import { useState } from "react";
import { Link } from "react-router";
import VerticalLogo from "../../imports/logo";
import { Footer } from "../global/components/Footer";
import { parseResponse } from "../global/api";
import { authApi } from "../../services/api";
import { usePublicAuthLanguage } from "./usePublicAuthLanguage";
import { AuthLanguageSwitcher } from "./components/AuthLanguageSwitcher";
import { ContactInput } from "./components/ContactInput";
import { validateContact } from "./authValidation";

const inputClass =
  "w-full h-11 px-3.5 text-[16px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-500)]";

function ForgotPasswordPage() {
  const { authLang, t } = usePublicAuthLanguage();
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const contactCheck = validateContact(contact);
    if (!contactCheck.isValid) {
      setError(t(`auth.errors.${contactCheck.errorKey}`, {}, "Enter a valid email address or phone number."));
      return;
    }

    setError("");
    setLoading(true);
    try {
      const response = await authApi.requestPasswordReset(contactCheck.normalized);
      const data = await parseResponse(response);
      setMessage(data.message || t("auth.forgot_password_success", {}, "If an account exists for that contact, a reset code has been sent."));
    } catch (err) {
      setError(err.message || t("auth.errors.sign_in_failed", {}, "Unable to process your request right now."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm relative flex flex-col items-center mb-6">
        <div className="absolute right-0 top-1 z-10"><AuthLanguageSwitcher /></div>
        <div className="w-[180px] h-[130px] overflow-hidden">
          <div className="scale-[0.36] origin-top-left w-[494px] h-[361px]"><VerticalLogo /></div>
        </div>
        <h1 className="text-[28px] font-bold text-[var(--hw-neutral-900)] leading-tight text-center">
          {t("auth.forgot_password_title", {}, "Forgot your password?")}
        </h1>
        <p className="mt-1 text-[15px] text-[var(--hw-neutral-500)] text-center">
          {t("auth.forgot_password_subtitle", {}, "Enter your email or phone number and we’ll send you a reset code.")}
        </p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-7">
        {message ? (
          <div className="space-y-4">
            <p role="status" className="text-[14px] text-[var(--hw-green-800)] text-center">{message}</p>
            <Link to="/reset-password" className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] transition-colors">
              {t("auth.forgot_password_continue", {}, "Enter reset code")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="reset-email" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
                {t("auth.email_or_phone", {}, "Email or phone number")}
              </label>
              <ContactInput id="reset-contact" value={contact} onChange={(value) => { setContact(value); setError(""); }} required autoComplete="username" className={inputClass} error={!!error} />
            </div>
            {error && <p role="alert" className="text-[13px] text-red-600 font-medium">{error}</p>}
            <button type="submit" disabled={loading} className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors">
              {loading ? t("auth.sign_in_loading", {}, "Sending…") : t("auth.forgot_password_submit", {}, "Send reset code")}
            </button>
          </form>
        )}
        <div className="text-center mt-5">
          <Link to="/login" className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)]">
            {t("auth.back_to_sign_in", {}, "Back to sign in")}
          </Link>
        </div>
      </div>
      <Footer lang={authLang} className="mt-4" />
    </main>
  );
}

export { ForgotPasswordPage as default };
