import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "../../services/api";
import { useGoogleAuth } from "./useGoogleAuth";

/**
 * "Link this account to Google" state for the Settings pages (farmer / DFTC /
 * admin).
 *
 * Wraps `useGoogleAuth` but rebinds its redirect submit step to
 * `authApi.googleConnect` (`POST /auth/google/connect`) so the same Supabase
 * PKCE OAuth flow links the current account instead of signing in a new one.
 *
 * - `handleConnect()` redirects to the Supabase Google authorize URL.
 * - On redirect back, `useGoogleAuth` exchanges the code and calls
 *   `googleConnect(access_token)`, then `onResult(result)`.
 * - `googleConnected` is derived from `GET /auth-links`; `handleDisconnect()`
 *   calls `DELETE /auth-links/{accountId}`.
 *
 * `onResult` owns navigation/state refresh after a successful connect. Pass
 * `redirectTo` = the current Settings URL so OAuth returns to this page.
 */
export function useGoogleLink({ redirectTo, onResult, submit = authApi.googleConnect }) {
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  });

  const [googleConnected, setGoogleConnected] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [loading, setLoading] = useState(false);

  const refreshLink = useCallback(async () => {
    try {
      const links = await authApi.listAuthLinks();
      const googleLink = Array.isArray(links)
        ? links.find((link) => link.provider === "supabase" || link.provider === "google")
        : undefined;
      setGoogleConnected(Boolean(googleLink));
      setAccountId(googleLink?.id ?? null);
    } catch {
      setGoogleConnected(false);
      setAccountId(null);
    }
  }, []);

  useEffect(() => {
    refreshLink();
  }, [refreshLink]);

  const auth = useGoogleAuth({
    redirectTo,
    submit,
    onResult: async (result) => {
      await refreshLink();
      await onResultRef.current(result);
    },
  });

  const handleDisconnect = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      await authApi.unlinkAuthLink(accountId);
      await refreshLink();
    } finally {
      setLoading(false);
    }
  }, [accountId, refreshLink]);

  return {
    googleConnected,
    handleConnect: auth.handleGoogle,
    handleDisconnect,
    loading: auth.loading || loading,
    linkError: auth.error,
accountId,
    };
}