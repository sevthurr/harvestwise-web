import React, { useEffect, useState } from "react";
import { Link } from "react-router";
import { X } from "lucide-react";

const ACK_KEY = "hw_privacy_policy_ack_1.1";

export function PrivacyPolicyNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { setVisible(localStorage.getItem(ACK_KEY) !== "true"); } catch { setVisible(true); }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try { localStorage.setItem(ACK_KEY, "true"); } catch {}
    setVisible(false);
  };

  return (
    <aside className="mx-4 mt-4 md:mx-8 lg:mx-10 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-[var(--shadow-xs)]" role="status">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Privacy Policy updated</p>
          <p className="mt-1 text-xs leading-relaxed">
            Version 1.1, effective October 24, 2026, explains browser storage,
            offline retention, stale data, and device-data deletion controls.
          </p>
          <Link to="/privacy" className="mt-2 inline-block text-xs font-semibold underline hover:no-underline">
            Read the Privacy Policy
          </Link>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss privacy policy update" className="rounded-lg p-1 hover:bg-blue-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
