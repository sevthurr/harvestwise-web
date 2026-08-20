import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import VerticalLogo from "../../imports/logo";
import { useAuth, roleHome } from "../global/contexts/AuthContext";
import { Footer } from "../global/components/Footer";
import { apiPost, parseResponse } from "../global/api";

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
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim()) { setError("Enter your email or phone number."); return; }
    if (!password.trim())    { setError("Enter your password."); return; }

    setLoading(true);
    try {
      const res = await apiPost("/api/v1/auth/login", { identifier: identifier.trim(), password });
      const tokens = await parseResponse(res);
      const me = await login(tokens);
      navigate(roleHome(me.role.role_name), { replace: true });
    } catch (err) {
      const msg = err.message ?? "Something went wrong. Please try again.";
      // 429 = account locked
      if (err.status === 429) {
        setError(msg);
      } else if (err.status === 403) {
        setError("Your account is inactive. Contact support.");
      } else {
        setError("Invalid email/phone or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Google sign-in: backend OAuth endpoint not yet implemented — kept for future use
  const handleGoogle = async () => {
    // No-op until backend Google OAuth is available
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">

      {/* Logo + header */}
      <div className="flex flex-col items-center mb-8">
        <LogoMark />
        <h1 className="-mt-15 text-[28px] font-bold text-[var(--hw-neutral-900)] leading-tight text-center">
          Sign in
        </h1>
        <p className="mt-0.5 text-[15px] text-[var(--hw-neutral-500)] text-center">
          Access your HarvestWise account
        </p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_2px_16px_0_rgba(0,0,0,0.07)] p-7 space-y-4">

        <form onSubmit={handleSignIn} className="space-y-4">

          {/* Email / phone */}
          <div className="space-y-1.5">
            <label htmlFor="identifier" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
              Email or phone number
            </label>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(""); }}
              placeholder="you@example.com"
              className="w-full h-11 px-3.5 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[15px] font-medium text-[var(--hw-neutral-700)]">
                Password
              </label>
              <button
                type="button"
                className="text-[13px] font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                className="w-full h-11 pl-3.5 pr-11 text-[15px] text-[var(--hw-neutral-900)] bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--hw-neutral-400)] hover:text-[var(--hw-neutral-600)] transition-colors"
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && <p role="alert" className="text-[13px] text-red-600 font-medium">{error}</p>}

          {/* Sign in button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 flex items-center justify-center bg-[var(--hw-green-700)] text-white text-[15px] font-semibold rounded-xl hover:bg-[var(--hw-green-800)] disabled:opacity-60 transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[var(--hw-neutral-200)]" />
          <span className="text-[12px] text-[var(--hw-neutral-400)] font-medium">or</span>
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
          <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
          <span className="text-[11px] ml-1 text-[var(--hw-neutral-400)]">(unavailable)</span>
        </button>

        {/* Create account */}
        <p className="text-center text-[14px] text-[var(--hw-neutral-600)]">
          Don&apos;t have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>

      <Footer className="mt-4" />
    </div>
  );
}

export { LoginPage as default };
