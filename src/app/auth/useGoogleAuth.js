import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "../../services/api";
import {
  supabase,
  getAuthCodeFromUrl,
  clearAuthCodeFromUrl,
} from "../../services/supabaseClient";
import { parseResponse } from "../global/api";

/**
 * Google OAuth sign-in/connect via Supabase (PKCE).
 *
 * - `handleGoogle()` redirects to the Supabase authorize URL.
 * - On redirect back, the mount effect exchanges the auth code for a Supabase
 *   session, calls `submit(access_token)` (default `googleSignIn`), then
 *   `onResult(result)`.
 *
 * `onResult` receives the parsed submit response — either a `TokenResponse` or
 * an `MFARequiredResponse` for sign-in, or a connect/link response for the
 * Settings "Connect" flow — and owns navigation / state refresh.
 *
 * Pass `submit = authApi.googleConnect` from Settings pages so the same OAuth
 * code is routed to `POST /auth/google/connect` instead of creating a session.
 */
export function useGoogleAuth({ redirectTo, onResult, submit = authApi.googleSignIn }) {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });

  // Guards against React StrictMode double-mounting the OAuth callback effect.
  const processedCodeRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = useCallback(async () => {
    setError("");
    if (!supabase) {
      setError("Google sign-in is not configured.");
      return;
    }
    setLoading(true);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start Google sign-in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [redirectTo]);

  useEffect(() => {
    if (!supabase) return;

    const code = getAuthCodeFromUrl();
    if (!code || processedCodeRef.current === code) return;
    processedCodeRef.current = code;

    setLoading(true);
    setError("");
    (async () => {
      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError || !data?.session) {
          throw exchangeError ?? new Error("Google sign-in failed.");
        }
        clearAuthCodeFromUrl();
        const res = await submitRef.current(data.session.access_token);
        const result = await parseResponse(res);
        await onResultRef.current(result);
      } catch (err) {
        clearAuthCodeFromUrl();
        setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { handleGoogle, loading, error };
}