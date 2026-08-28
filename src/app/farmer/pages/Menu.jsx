import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import {
  User,
  MapPin,
  LogOut,
  Globe,
  CloudRain,
  TrendingUp,
  Clock,
  RefreshCw,
  Download,
  Trash2,
  Shield,
  FileText,
  Info,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Wifi,
  WifiOff,
  Loader2,
  Smartphone,
  AlertCircle,
  Bell,
  Sprout
} from "lucide-react";
const SectionLabel = ({ children }) => <p className="text-xs font-semibold text-[var(--hw-neutral-900)] uppercase tracking-wide px-1 mb-2">
    {children}
  </p>;
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] overflow-hidden ${className}`}>
    {children}
  </div>;
const Divider = () => <div className="h-px bg-[var(--hw-neutral-100)] mx-4" />;
const SettingsRow = ({ icon, label, description, right, onClick, danger }) => <button
  onClick={onClick}
  className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${onClick ? "hover:bg-[var(--hw-neutral-50)]" : "cursor-default"}`}
>
    <span className={`flex-shrink-0 ${danger ? "text-red-500" : "text-[var(--hw-neutral-900)]"}`}>
      {icon}
    </span>
    <div className="flex-1 min-w-0">
      <p className={`text-sm font-medium ${danger ? "text-red-600" : "text-[var(--hw-neutral-900)]"}`}>{label}</p>
      {description && <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{description}</p>}
    </div>
    {right ?? (onClick && <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0" />)}
  </button>;
const Toggle = ({ checked, onChange }) => <button
  role="switch"
  aria-checked={checked}
  onClick={() => onChange(!checked)}
  className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-[var(--hw-green-700)]" : "bg-[var(--hw-neutral-300)]"}`}
>
    <span
  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`}
/>
  </button>;
const ConfirmDialog = ({ open, title, message, confirmLabel = "Confirm", danger, onConfirm, onCancel }) => {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-[var(--shadow-xl)] p-5 space-y-4">
        <p className="font-semibold text-[var(--hw-neutral-900)]">{title}</p>
        <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[var(--hw-neutral-200)] text-sm font-medium text-[var(--hw-neutral-700)] hover:bg-[var(--hw-neutral-50)] transition-colors">
            Cancel
          </button>
          <button
    onClick={onConfirm}
    className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-[var(--hw-green-700)] hover:bg-[var(--hw-green-800)]"}`}
  >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>;
};
const LEGAL = {
  privacy: {
    title: "Privacy",
    body: <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">HarvestWise collects only the information needed to provide market monitoring and planting recommendations. Your farm data and planting records are stored on your device. Account information is stored securely on HarvestWise servers and is not shared with third parties without your consent. Full privacy policy available on the HarvestWise website.</p>
  },
  terms: {
    title: "Terms of use",
    body: <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">HarvestWise is a decision-support tool. Recommendations and forecasts are estimates based on available data and do not guarantee income or profit. Farmers are responsible for their own planting and selling decisions. Full terms available on the HarvestWise website.</p>
  },
  about: {
    title: "About HarvestWise",
    body: <div className="space-y-3 text-sm text-[var(--hw-neutral-900)]">
        <p>HarvestWise is a mobile-first Progressive Web Application designed to help vegetable farmers in Davao City make informed planting and selling decisions.</p>
        <p>HarvestWise uses market price data, supply information, weather forecasts, and calendar indicators to provide personalized planting recommendations and crop-cycle monitoring.</p>
        <div className="pt-2 border-t border-[var(--hw-neutral-100)] space-y-1 text-xs text-[var(--hw-neutral-900)]">
          <p>Version 1.0.0 — prototype build</p>
          <p>© 2026 HarvestWise. All rights reserved.</p>
        </div>
      </div>
  }
};
const LegalDrawer = ({ id, onClose }) => {
  if (!id) return null;
  const content = LEGAL[id];
  return <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 md:inset-y-0 md:right-0 md:left-auto md:w-96 bg-white rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-[var(--shadow-xl)] flex flex-col max-h-[85vh] md:max-h-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--hw-neutral-200)]">
          <p className="font-semibold text-[var(--hw-neutral-900)]">{content.title}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-900)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{content.body}</div>
      </div>
    </>;
};
const HELP_ITEMS = [
  { title: "How recommendations work", body: "A recommendation is based on your planting schedule, expected harvest date, production costs, and current market conditions. HarvestWise compares your cost to recover to the expected market price at harvest and considers supply and weather risks." },
  { title: "What the advisory labels mean", body: '"Recommended" means conditions look favorable for your crop. "Proceed with Caution" means risks are present — monitor conditions closely. "Avoid for Now" means significant risks exist and it may be better to wait.' },
  { title: "How estimated profit is calculated", body: "Estimated profit is calculated by multiplying your expected harvest volume by the difference between the expected selling price and your cost to recover per kilogram. This is an estimate only \u2014 actual income depends on your final selling price and harvest volume." },
  { title: "How weather affects crops", body: "Heavy rain and strong winds can damage crops, delay field work, and affect harvest quality. HarvestWise shows weather warnings and action tips based on your crop phase and the current forecast for Davao City." },
  { title: "Offline use", body: "HarvestWise saves recent market information, weather data, and your crop records on this device. You can view saved information while offline, but prices and forecasts will not update until you reconnect and sync." }
];
const HelpAccordion = () => {
  const [open, setOpen] = useState(null);
  return <div className="divide-y divide-[var(--hw-neutral-100)]">
      {HELP_ITEMS.map((item) => <div key={item.title}>
          <button
    onClick={() => setOpen(open === item.title ? null : item.title)}
    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
            <span className="text-sm font-medium text-[var(--hw-neutral-900)]">{item.title}</span>
            {open === item.title ? <ChevronUp className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--hw-neutral-700)] flex-shrink-0" />}
          </button>
          {open === item.title && <div className="px-4 pb-3.5">
              <p className="text-sm text-[var(--hw-neutral-900)] leading-relaxed">{item.body}</p>
            </div>}
        </div>)}
    </div>;
};
function MenuPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { effectiveLanguage: language, setLanguage } = useLanguage();
  const [alertPrefs, setAlertPrefs] = useState({
    price: true,
    weather: true,
    crops: true,
    harvest: true
  });
  const [syncStatus, setSyncStatus] = useState("updated");
  const [installStatus, setInstallStatus] = useState("not-installed");
  const [legalOpen, setLegalOpen] = useState(null);
  const [showSignOut, setShowSignOut] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };
  const handleSync = () => {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus(Math.random() > 0.2 ? "updated" : "failed");
    }, 2e3);
  };
  const syncStatusConfig = {
    updated: { icon: <Wifi className="w-4 h-4" />, label: "Online \u2014 up to date", color: "text-emerald-600" },
    syncing: { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: "Syncing\u2026", color: "text-blue-500" },
    failed: { icon: <AlertCircle className="w-4 h-4" />, label: "Sync failed", color: "text-red-500" },
    offline: { icon: <WifiOff className="w-4 h-4" />, label: "Offline", color: "text-amber-600" },
    pending: { icon: <Clock className="w-4 h-4" />, label: "Pending changes", color: "text-amber-600" }
  };
  const sc = syncStatusConfig[syncStatus];
  const notifItems = [
    { key: "price", icon: <TrendingUp className="w-4 h-4" />, label: "Price changes", desc: "Significant market price movements for your crops" },
    { key: "weather", icon: <CloudRain className="w-4 h-4" />, label: "Weather warnings", desc: "Rain and wind that may affect your farm" },
    { key: "crops", icon: <Sprout className="w-4 h-4" />, label: "Crop reminders", desc: "Reminders tied to your saved crop plans" },
    { key: "harvest", icon: <Clock className="w-4 h-4" />, label: "Harvest reminders", desc: "Alerts when your harvest window is approaching" }
  ];
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">

        {
    /* ── 1. Farmer profile ── */
  }
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--hw-green-700)] flex items-center justify-center text-white text-xl font-bold flex-shrink-0 select-none">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[var(--hw-neutral-900)]">Juan Dela Cruz</p>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">Vegetable Farmer</p>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">0912 345 6789</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${sc.color}`}>
                  {sc.icon}
                  {sc.label}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[var(--hw-neutral-100)]">
            <button
    onClick={() => showToast("Edit profile is coming soon.")}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
              <User className="w-4 h-4" />
              Edit profile
            </button>
          </div>
        </div>

        {
    /* ── 2. Farm location ── */
  }
        <section>
          <SectionLabel>Farm location</SectionLabel>
          <Card>
            <div className="px-4 py-3 divide-y divide-[var(--hw-neutral-100)]">
              {[
    { label: "City", value: "Davao City" },
    { label: "Barangay", value: "Barangay Buda, Marilog District" },
    { label: "Farm size", value: "1,500 sq m" }
  ].map((r) => <div key={r.label} className="flex items-center justify-between gap-4 py-2.5 flex-wrap">
                  <span className="text-xs text-[var(--hw-neutral-700)]">{r.label}</span>
                  <span className="text-xs font-medium text-[var(--hw-neutral-900)] text-right">{r.value}</span>
                </div>)}
            </div>
            <div className="px-4 py-3 border-t border-[var(--hw-neutral-100)]">
              <button
    onClick={() => showToast("Farm location editing is coming soon.")}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] transition-colors"
  >
                <MapPin className="w-3.5 h-3.5" />
                Edit location
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        </section>

        {
    /* ── 3. Language ── */
  }
        <section>
          <SectionLabel>Language</SectionLabel>
          <Card>
            {[["english", "English", "Default interface language"], ["cebuano", "Cebuano / Bisaya", "Farmer default language"], ["tagalog", "Tagalog", "Filipino language option"]].map(([id, label, sub], i, arr) => <React.Fragment key={id}>
                <button
    onClick={() => setLanguage(id)}
    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--hw-neutral-50)] transition-colors text-left"
  >
                  <Globe className="w-5 h-5 text-[var(--hw-neutral-900)] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--hw-neutral-900)]">{label}</p>
                    <p className="text-xs text-[var(--hw-neutral-900)]">{sub}</p>
                  </div>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${language === id ? "bg-[var(--hw-green-700)] border-[var(--hw-green-700)]" : "border-[var(--hw-neutral-300)]"}`}>
                    {language === id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </button>
                {i < arr.length - 1 && <Divider />}
              </React.Fragment>)}
            <div className="px-4 py-3 bg-[var(--hw-neutral-50)] border-t border-[var(--hw-neutral-100)]">
              <p className="text-xs text-[var(--hw-neutral-900)] leading-relaxed">
                Vegetable names remain in Filipino in all language options.
              </p>
            </div>
          </Card>
        </section>

        {
    /* ── 4. Notifications ── */
  }
        <section>
          <SectionLabel>Notifications</SectionLabel>
          <Card>
            <div className="divide-y divide-[var(--hw-neutral-100)]">
              {notifItems.map(({ key, icon, label, desc }) => <div key={key} className="flex items-start gap-3 px-4 py-3.5">
                  <span className="flex-shrink-0 text-[var(--hw-neutral-900)] mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--hw-neutral-900)]">{label}</p>
                    <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <Toggle
    checked={alertPrefs[key]}
    onChange={(v) => setAlertPrefs((p) => ({ ...p, [key]: v }))}
  />
                </div>)}
            </div>
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <div className="flex items-start gap-2">
                <Bell className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Urgent crop and weather warnings may still appear when necessary.
                </p>
              </div>
            </div>
          </Card>
        </section>

        {
    /* ── 5. Offline data ── */
  }
        <section>
          <SectionLabel>Offline data</SectionLabel>
          <Card>
            {
    /* Status */
  }
            <div className="px-4 py-3.5 flex items-center gap-3">
              <span className={`flex-shrink-0 ${sc.color}`}>{sc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--hw-neutral-900)]">Connection status</p>
                <p className={`text-xs font-medium mt-0.5 ${sc.color}`}>{sc.label}</p>
              </div>
            </div>
            <Divider />

            {
    /* Last sync */
  }
            <div className="px-4 py-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--hw-neutral-900)]">Last synced</p>
                <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">Today at 8:30 AM</p>
              </div>
              <button
    onClick={handleSync}
    disabled={syncStatus === "syncing"}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--hw-green-700)] hover:opacity-70 transition-opacity disabled:opacity-50"
  >
                <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
                {syncStatus === "syncing" ? "Syncing\u2026" : "Sync now"}
              </button>
            </div>

            {syncStatus === "failed" && <div className="px-4 pb-3 text-xs text-red-600 flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                Synchronization failed. Check your connection and try again.
              </div>}

            <Divider />

            {
    /* Install */
  }
            <div className="px-4 py-4 space-y-3">
              {installStatus === "not-installed" && <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[var(--hw-green-50)] rounded-xl flex-shrink-0">
                      <Smartphone className="w-5 h-5 text-[var(--hw-green-700)]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--hw-neutral-900)]">Install HarvestWise</p>
                      <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5 leading-snug">
                        Install for faster access and to view saved data while offline.
                      </p>
                    </div>
                  </div>
                  <button
    onClick={() => setInstallStatus("installed")}
    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[var(--hw-green-700)] text-white text-sm font-medium rounded-xl hover:bg-[var(--hw-green-800)] transition-colors"
  >
                    <Download className="w-4 h-4" />
                    Install app
                  </button>
                </div>}

              {installStatus === "installed" && <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 rounded-xl flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm text-[var(--hw-neutral-900)]">HarvestWise is installed</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <p className="text-xs font-medium text-emerald-700">Up to date</p>
                    </div>
                  </div>
                </div>}

              {installStatus === "update-available" && <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0">
                      <RefreshCw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-[var(--hw-neutral-900)]">App update available</p>
                      <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">A new version of HarvestWise is ready to install.</p>
                    </div>
                  </div>
                  <button
    onClick={() => {
      setInstallStatus("installed");
      showToast("HarvestWise updated successfully.");
    }}
    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
  >
                    <Download className="w-4 h-4" />Update now
                  </button>
                </div>}
            </div>

            <Divider />

            {
    /* Clear data */
  }
            <button
    onClick={() => setShowClearData(true)}
    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 transition-colors text-left"
  >
              <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-sm font-medium text-red-600">Clear downloaded data</span>
            </button>
          </Card>
        </section>

        {
    /* ── 6. Help ── */
  }
        <section>
          <SectionLabel>Help</SectionLabel>
          <Card>
            <HelpAccordion />
          </Card>
        </section>

        {
    /* ── 7. Privacy and About ── */
  }
        <section>
          <SectionLabel>Privacy and about</SectionLabel>
          <Card>
            <SettingsRow icon={<Shield className="w-5 h-5" />} label="Privacy" onClick={() => setLegalOpen("privacy")} />
            <Divider />
            <SettingsRow icon={<FileText className="w-5 h-5" />} label="Terms of use" onClick={() => setLegalOpen("terms")} />
            <Divider />
            <SettingsRow icon={<Info className="w-5 h-5" />} label="About HarvestWise" onClick={() => setLegalOpen("about")} />
            <Divider />
            <div className="px-4 py-3.5">
              <p className="text-sm font-medium text-[var(--hw-neutral-900)]">App version</p>
              <p className="text-xs text-[var(--hw-neutral-900)] mt-0.5">Version 1.0.0 — prototype</p>
            </div>
          </Card>
        </section>

        {
    /* ── 8. Sign out ── */
  }
        <button
    onClick={() => setShowSignOut(true)}
    className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-red-200 text-red-600 font-medium rounded-2xl hover:bg-red-50 transition-colors"
  >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>

      <LegalDrawer id={legalOpen} onClose={() => setLegalOpen(null)} />

      <ConfirmDialog
    open={showSignOut}
    title="Sign out?"
    message="You will be signed out of HarvestWise. Your saved crop records and preferences will remain on this device."
    confirmLabel="Sign out"
    danger
    onConfirm={() => {
      setShowSignOut(false);
      logout();
      navigate("/login", { replace: true });
    }}
    onCancel={() => setShowSignOut(false)}
  />

      <ConfirmDialog
    open={showClearData}
    title="Clear downloaded data?"
    message="Clearing downloaded data removes offline copies from this device. Your saved account records will remain available after you reconnect."
    confirmLabel="Clear data"
    danger
    onConfirm={() => {
      setShowClearData(false);
      showToast("Downloaded data cleared.");
    }}
    onCancel={() => setShowClearData(false)}
  />

      {toast && <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[var(--hw-neutral-900)] text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-[var(--shadow-lg)] whitespace-nowrap">
          {toast}
        </div>}
    </div>;
}
export {
  MenuPage as default
};
