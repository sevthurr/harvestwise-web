import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, Check, Download } from "lucide-react";
import VerticalLogo from "../../imports/logo";
import { useAuth } from "../global/contexts/AuthContext";
import { Footer } from "../global/components/Footer";
import { usePWAInstall } from "../global/hooks/usePWAInstall";
const GoogleIcon = () => <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>;
const SCALE = 0.85;
const LOGO_W = Math.round(494 * SCALE);
const LOGO_H = Math.round(361 * SCALE);
function LogoMark() {
  return <div style={{ width: LOGO_W, height: LOGO_H, overflow: "hidden" }}>
      <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 494, height: 361 }}>
        <VerticalLogo />
      </div>
    </div>;
}
const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "At least 1 uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "At least 1 number", test: (p) => /[0-9]/.test(p) },
  { label: "At least 1 special character", test: (p) => /[^A-Za-z0-9]/.test(p) }
];
const SUFFIX_OPTIONS = ["None", "Jr.", "Sr.", "II", "III", "IV"];
const Field = ({ id, label, optional, children }) => <div className="space-y-1.5">
    <label htmlFor={id} className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
      {label}
      {optional && <span className="ml-1 text-[13px] text-[var(--hw-neutral-400)] font-normal">(optional)</span>}
    </label>
    {children}
  </div>;
const inputCls = "w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]";
function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "None",
    phone: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPw, setShowPw] = useState(false);
  const [showCfm, setShowCfm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const capitalizeWords = (v) => v.replace(/\b\w/g, (c) => c.toUpperCase());
  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((err) => ({ ...err, [key]: "" }));
  };
  const setName = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: capitalizeWords(e.target.value) }));
    setErrors((err) => ({ ...err, [key]: "" }));
  };
  const setPhone = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setForm((f) => ({ ...f, phone: digits }));
    setErrors((err) => ({ ...err, contact: "" }));
  };
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";
    if (!form.phone.trim() && !form.email.trim())
      e.contact = "Enter at least one contact method: phone number or email.";
    if (!form.password) e.password = "Password is required.";
    else if (!REQUIREMENTS.every((r) => r.test(form.password)))
      e.password = "Password does not meet all requirements.";
    if (form.password !== form.confirmPassword)
      e.confirmPassword = "Passwords do not match.";
    return e;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const name = [form.firstName, form.middleName, form.lastName, form.suffix !== "None" ? form.suffix : ""].filter(Boolean).join(" ");
    const email = form.email || `${form.phone}@harvestwise.app`;
    login({ name, email, role: "farmer" });
    navigate("/onboarding", { replace: true });
    setLoading(false);
  };
  const handleGoogle = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    login({ name: "Juan Dela Cruz", email: "juan.delacruz@gmail.com", role: "farmer" });
    navigate("/onboarding", { replace: true });
    setLoading(false);
  };
  return <div className="min-h-screen bg-white flex flex-col items-center px-4 py-12">

      {
    /* Logo + header */
  }
      <div className="flex flex-col items-center mb-8">
        <LogoMark />
        <h1 className="-mt-15 text-[26px] font-bold text-[var(--hw-neutral-900)] leading-tight text-center">
          Create your HarvestWise account
        </h1>
      </div>

      {
    /* Form card */
  }
      <div className="w-full max-w-xl bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-8 space-y-4">

        <form onSubmit={handleSubmit} className="space-y-4">

          {
    /* First Name */
  }
          <Field id="firstName" label="First Name">
            <input
    id="firstName"
    type="text"
    value={form.firstName}
    onChange={setName("firstName")}
    autoCapitalize="words"
    placeholder="Juan"
    className={inputCls}
  />
            {errors.firstName && <p className="text-[12px] text-red-600 mt-1">{errors.firstName}</p>}
          </Field>

          {
    /* Last Name */
  }
          <Field id="lastName" label="Last Name">
            <input
    id="lastName"
    type="text"
    value={form.lastName}
    onChange={setName("lastName")}
    autoCapitalize="words"
    placeholder="Dela Cruz"
    className={inputCls}
  />
            {errors.lastName && <p className="text-[12px] text-red-600 mt-1">{errors.lastName}</p>}
          </Field>

          {
    /* Middle Name */
  }
          <Field id="middleName" label="Middle Name" optional>
            <input
    id="middleName"
    type="text"
    value={form.middleName}
    onChange={setName("middleName")}
    autoCapitalize="words"
    placeholder="Santos"
    className={inputCls}
  />
          </Field>

          {
    /* Suffix */
  }
          <Field id="suffix" label="Suffix" optional>
            <div className="relative">
              <select
    id="suffix"
    value={form.suffix}
    onChange={set("suffix")}
    className={`${inputCls} appearance-none pr-9`}
  >
                {SUFFIX_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" fill="none" viewBox="0 0 10 6">
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Field>

          {
    /* Contact info */
  }
          <div className="space-y-3">
            <p className="text-[13px] text-[var(--hw-neutral-500)]">
              Enter at least one contact method: phone number or email.
            </p>
            <Field id="phone" label="Phone Number">
              <input
    id="phone"
    type="tel"
    inputMode="numeric"
    value={form.phone}
    onChange={setPhone}
    maxLength={11}
    placeholder="09XX XXX XXXX"
    className={inputCls}
  />
            </Field>
            <Field id="email" label="Email">
              <input
    id="email"
    type="email"
    value={form.email}
    onChange={set("email")}
    placeholder="you@example.com"
    className={inputCls}
  />
            </Field>
            {errors.contact && <p className="text-[12px] text-red-600">{errors.contact}</p>}
          </div>

          {
    /* Password */
  }
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
              Password
            </label>
            <div className="relative">
              <input
    id="password"
    type={showPw ? "text" : "password"}
    value={form.password}
    onChange={set("password")}
    placeholder="Create a password"
    className={`${inputCls} pr-11`}
  />
              <button
    type="button"
    onClick={() => setShowPw((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
    aria-label={showPw ? "Hide password" : "Show password"}
  >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {
    /* Requirements */
  }
            {form.password && <ul className="mt-2 space-y-1">
                {REQUIREMENTS.map((req) => {
    const ok = req.test(form.password);
    return <li key={req.label} className={`flex items-center gap-1.5 text-[12px] transition-colors ${ok ? "text-emerald-600" : "text-[var(--hw-neutral-400)]"}`}>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 border ${ok ? "bg-emerald-500 border-emerald-500" : "border-[var(--hw-neutral-300)]"}`}>
                        {ok && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {req.label}
                    </li>;
  })}
              </ul>}
            {errors.password && <p className="text-[12px] text-red-600">{errors.password}</p>}
          </div>

          {
    /* Confirm password */
  }
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
              Confirm Password
            </label>
            <div className="relative">
              <input
    id="confirmPassword"
    type={showCfm ? "text" : "password"}
    value={form.confirmPassword}
    onChange={set("confirmPassword")}
    placeholder="Repeat your password"
    className={`${inputCls} pr-11`}
  />
              <button
    type="button"
    onClick={() => setShowCfm((v) => !v)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)]"
    aria-label={showCfm ? "Hide password" : "Show password"}
  >
                {showCfm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-[12px] text-red-600">{errors.confirmPassword}</p>}
          </div>

          {
    /* Submit */
  }
          <button
    type="submit"
    disabled={loading}
    className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
  >
            {loading ? "Creating account\u2026" : "Create account"}
          </button>
        </form>

        {
    /* Divider */
  }
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
          <span className="text-[12px] text-[var(--hw-neutral-400)] font-medium">or</span>
          <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
        </div>

        <button
    onClick={handleGoogle}
    disabled={loading}
    className="w-full h-11 flex items-center justify-center gap-2.5 bg-white border border-[var(--hw-neutral-200)] text-[15px] font-medium text-[var(--hw-neutral-800)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-60 transition-colors"
  >
          <GoogleIcon />
          Sign up with Google
        </button>

        <p className="text-center text-[14px] text-[var(--hw-neutral-600)]">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors">
            Sign in
          </Link>
        </p>
      </div>

      <Footer className="mt-2" />
    </div>;
}
export {
  RegisterPage as default
};
