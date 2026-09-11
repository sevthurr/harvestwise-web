import { useState, useEffect } from "react";
import { apiGet, apiPost, parseResponse } from "../../../global/api";
import {
  inputCls,
  Card,
  SectionLabel,
  FieldLabel,
  GreenBtn,
  GhostBtn,
  Modal
} from "../../../global/components/ui/hw-ui";

export function EmailOtp2FACard({ showToast }) {
  const [otpEnabled, setOtpEnabled] = useState(false);
  const [otpLoaded, setOtpLoaded] = useState(false);
  const [otpStep, setOtpStep] = useState("idle");
  const [otpCode, setOtpCode] = useState("");
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpMsg, setOtpMsg] = useState("");
  const [otpErr, setOtpErr] = useState("");
  const [showOtpDisable, setShowOtpDisable] = useState(false);
  const [otpPassword, setOtpPassword] = useState("");
  const [otpPwErr, setOtpPwErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiGet("/auth/otp/status")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setOtpEnabled(!!data?.enabled);
        setOtpLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setOtpLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  const handleEnableStart = async () => {
    setOtpBusy(true);
    setOtpErr("");
    setOtpMsg("");
    try {
      const res = await parseResponse(await apiPost("/auth/otp/enable"));
      setOtpMsg(res?.message || "A verification code was sent to your email.");
      setOtpStep("enter_code");
    } catch (err) {
      setOtpErr(err?.message || "Could not send the code. Try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleEnableConfirm = async () => {
    setOtpBusy(true);
    setOtpErr("");
    setOtpMsg("");
    try {
      const res = await parseResponse(await apiPost("/auth/otp/enable/confirm", { code: otpCode }));
      setOtpEnabled(true);
      setOtpStep("idle");
      setOtpCode("");
      showToast(res?.message || "Email OTP 2FA enabled successfully.");
    } catch (err) {
      setOtpErr(err?.message || "Invalid code. Try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!otpPassword) {
      setOtpPwErr("Enter your password to disable 2FA.");
      return;
    }
    setOtpBusy(true);
    setOtpErr("");
    setOtpPwErr("");
    try {
      const res = await parseResponse(await apiPost("/auth/otp/disable", { password: otpPassword }));
      setOtpEnabled(false);
      setShowOtpDisable(false);
      setOtpPassword("");
      showToast(res?.message || "Email OTP 2FA disabled.");
    } catch (err) {
      setOtpErr(err?.message || "Invalid password. Try again.");
    } finally {
      setOtpBusy(false);
    }
  };

  return (
    <>
      <Card>
        <SectionLabel>Two-Factor Authentication</SectionLabel>
        <div className="flex items-center justify-between py-1">
          <div className="min-w-0 pr-3">
            <p className="text-[14px] font-semibold text-black">Email OTP (2FA)</p>
            <p className="text-[13px] text-black">
              {otpLoaded
                ? otpEnabled
                  ? "Enabled — a code will be required at every sign-in."
                  : "Disabled — your password alone signs you in."
                : "Loading…"}
            </p>
            {otpMsg && <p className="text-[13px] text-[var(--hw-green-700)] mt-1">{otpMsg}</p>}
            {otpErr && <p className="text-[13px] text-red-600 mt-1">{otpErr}</p>}
          </div>
          {!otpEnabled ? (
            <button
              type="button"
              onClick={handleEnableStart}
              disabled={otpBusy}
              className={`h-8 px-3 text-[13px] font-medium rounded-lg border transition-colors flex-shrink-0 ${otpBusy ? "opacity-50" : "border-[var(--hw-green-700)] text-[var(--hw-green-700)] hover:bg-[var(--hw-green-50)]"}`}
            >
              {otpBusy ? "Sending…" : "Enable"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { setShowOtpDisable(true); setOtpErr(""); }}
              className="h-8 px-3 text-[13px] font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
            >
              Disable
            </button>
          )}
        </div>
        {otpStep === "enter_code" && (
          <div className="mt-3 space-y-2 border-t border-[var(--hw-neutral-100)] pt-3">
            <FieldLabel htmlFor="otp-code">Enter the 6-digit code from your email</FieldLabel>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value.replace(/[^0-9]/g, "")); setOtpErr(""); }}
              placeholder="123456"
              className={`${inputCls} max-w-[180px]`}
            />
            <div className="flex gap-2">
              <GhostBtn onClick={() => { setOtpStep("idle"); setOtpCode(""); }}>Cancel</GhostBtn>
              <GreenBtn onClick={handleEnableConfirm} disabled={otpBusy || otpCode.length !== 6}>
                Verify & enable
              </GreenBtn>
            </div>
          </div>
        )}
      </Card>

      {showOtpDisable && (
        <Modal title="Disable two-factor authentication?" onClose={() => {
          setShowOtpDisable(false);
          setOtpPassword("");
          setOtpPwErr("");
        }}>
          <p className="text-[14px] text-black mb-4">Enter your password to confirm. Your DFTC account will no longer require an email code at sign-in.</p>
          <div className="space-y-1.5 mb-5">
            <label htmlFor="otp-disable-pw" className="block text-[14px] font-semibold text-black">Password</label>
            <input
              id="otp-disable-pw"
              type="password"
              value={otpPassword}
              onChange={(e) => {
                setOtpPassword(e.target.value);
                setOtpPwErr("");
              }}
              placeholder="••••••••"
              className={inputCls}
            />
            {otpPwErr && <p className="text-[13px] text-red-600">{otpPwErr}</p>}
            {otpErr && <p className="text-[13px] text-red-600">{otpErr}</p>}
          </div>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => {
              setShowOtpDisable(false);
              setOtpPassword("");
              setOtpPwErr("");
            }}>Cancel</GhostBtn>
            <button
              type="button"
              onClick={handleDisable}
              disabled={otpBusy}
              className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              {otpBusy ? "Disabling…" : "Disable"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}