import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, Plus, Loader2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";
import {
  Card,
  SectionLabel,
  FieldLabel,
  GreenBtn,
  GhostBtn,
  Toggle,
  Toast,
  Modal,
  inputCls,
  SUFFIX_OPTIONS
} from "../../global/components/ui/hw-ui";
const TABS = [
  { id: "users", label: "User Accounts" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "security", label: "System Security" },
  { id: "health", label: "System Health" }
];
const MOCK_USERS = [
  { id: "1", name: "Juan Dela Cruz", email: "juan@example.com", role: "Farmer", status: "Active", lastLogin: "Today, 7:30 AM", dateCreated: "Jan 5, 2025", phone: "09171234567", firstName: "Juan", middleName: "", lastName: "Dela Cruz", suffix: "None", loginMethod: "Email", city: "Davao City", district: "District I", barangay: "Talomo", farmSize: "2 hectares", preferredCrops: "Eggplant, Tomato" },
  { id: "2", name: "Maria Santos", email: "maria@dftc.gov.ph", role: "DFTC", status: "Active", lastLogin: "Today, 8:15 AM", dateCreated: "Feb 12, 2025", phone: "09189876543", firstName: "Maria", middleName: "Cruz", lastName: "Santos", suffix: "None", loginMethod: "Email", organization: "Davao Food Terminal Complex", position: "Market Monitoring Staff", recentSubmission: "Accepted" },
  { id: "3", name: "Pedro Reyes", email: "pedro@example.com", role: "Farmer", status: "Inactive", lastLogin: "Jul 30, 9:00 AM", dateCreated: "Mar 3, 2025", phone: "09201112222", firstName: "Pedro", middleName: "", lastName: "Reyes", suffix: "None", loginMethod: "Email", city: "Davao City", district: "District II", barangay: "Bucana", farmSize: "1 hectare", preferredCrops: "Cabbage" },
  { id: "4", name: "Ana Gomez", email: "ana@dftc.gov.ph", role: "DFTC", status: "Active", lastLogin: "Today, 6:45 AM", dateCreated: "Mar 15, 2025", phone: "09223334444", firstName: "Ana", middleName: "", lastName: "Gomez", suffix: "None", loginMethod: "Google", organization: "Davao Food Terminal Complex", position: "Data Encoder", recentSubmission: "Pending review" },
  { id: "5", name: "Carlo Ramos", email: "carlo@example.com", role: "Farmer", status: "Active", lastLogin: "Today, 5:20 AM", dateCreated: "Apr 1, 2025", phone: "09255556666", firstName: "Carlo", middleName: "Santos", lastName: "Ramos", suffix: "None", loginMethod: "Email", city: "Davao City", district: "District III", barangay: "Calinan", farmSize: "3 hectares", preferredCrops: "Ampalaya, Okra" },
  { id: "6", name: "Lena Cruz", email: "lena@dftc.gov.ph", role: "DFTC", status: "Inactive", lastLogin: "Jul 28, 3:00 PM", dateCreated: "Apr 10, 2025", phone: "09277778888", firstName: "Lena", middleName: "", lastName: "Cruz", suffix: "None", loginMethod: "Email", organization: "Davao Food Terminal Complex", position: "Supervisor", recentSubmission: "\u2014" },
  { id: "7", name: "Jose Bautista", email: "jose@example.com", role: "Farmer", status: "Active", lastLogin: "Today, 4:10 AM", dateCreated: "May 2, 2025", phone: "09299990000", firstName: "Jose", middleName: "", lastName: "Bautista", suffix: "Jr.", loginMethod: "Email", city: "Davao City", district: "District I", barangay: "Matina", farmSize: "0.5 hectare", preferredCrops: "Pechay, Kangkong" },
  { id: "8", name: "Rosa Fernandez", email: "rosa@example.com", role: "Farmer", status: "Active", lastLogin: "Today, 7:00 AM", dateCreated: "May 20, 2025", phone: "09311112222", firstName: "Rosa", middleName: "Ramos", lastName: "Fernandez", suffix: "None", loginMethod: "Google", city: "Davao City", district: "District II", barangay: "Agdao", farmSize: "1.5 hectares", preferredCrops: "Tomato, Pepper" },
  { id: "10", name: "Ben Torres", email: "ben@dftc.gov.ph", role: "DFTC", status: "Active", lastLogin: "Today, 7:50 AM", dateCreated: "Jun 1, 2025", phone: "09333334444", firstName: "Ben", middleName: "", lastName: "Torres", suffix: "None", loginMethod: "Email", organization: "Davao Food Terminal Complex", position: "Market Inspector", recentSubmission: "Accepted" }
];
const AddUserModal = ({ onClose, onAdd }) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    middleName: "",
    suffix: "None",
    phone: "",
    email: "",
    role: "Farmer",
    status: "Active",
    position: "",
    sendInvite: false
  });
  const canSubmit = form.firstName.trim() && form.lastName.trim();
  return <Modal title="Add User" onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="au-fname">First Name</FieldLabel>
            <input
    id="au-fname"
    type="text"
    placeholder="First name"
    className={inputCls}
    value={form.firstName}
    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
  />
          </div>
          <div>
            <FieldLabel htmlFor="au-lname">Last Name</FieldLabel>
            <input
    id="au-lname"
    type="text"
    placeholder="Last name"
    className={inputCls}
    value={form.lastName}
    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
  />
          </div>
          <div>
            <FieldLabel htmlFor="au-mname" optional>Middle Name</FieldLabel>
            <input
    id="au-mname"
    type="text"
    placeholder="Middle name"
    className={inputCls}
    value={form.middleName}
    onChange={(e) => setForm((f) => ({ ...f, middleName: e.target.value }))}
  />
          </div>
          <div>
            <FieldLabel htmlFor="au-suffix" optional>Suffix</FieldLabel>
            <div className="relative">
              <select
    id="au-suffix"
    className={`${inputCls} appearance-none pr-9`}
    value={form.suffix}
    onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))}
  >
                {SUFFIX_OPTIONS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="au-phone">Phone Number</FieldLabel>
            <input
    id="au-phone"
    type="tel"
    placeholder="09XX XXX XXXX"
    className={inputCls}
    value={form.phone}
    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
  />
          </div>
          <div>
            <FieldLabel htmlFor="au-email">Email</FieldLabel>
            <input
    id="au-email"
    type="email"
    placeholder="user@example.com"
    className={inputCls}
    value={form.email}
    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
  />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="au-role">Role</FieldLabel>
            <div className="relative">
              <select
    id="au-role"
    className={`${inputCls} appearance-none pr-9`}
    value={form.role}
    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, position: "" }))}
  >
                {["Farmer", "DFTC"].map((r) => <option key={r}>{r}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="au-status">Status</FieldLabel>
            <div className="relative">
              <select
    id="au-status"
    className={`${inputCls} appearance-none pr-9`}
    value={form.status}
    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
  >
                {["Active", "Inactive"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
        </div>
        {form.role === "DFTC" && <div>
            <FieldLabel htmlFor="au-position" optional>Position</FieldLabel>
            <input
    id="au-position"
    type="text"
    placeholder="e.g. Market Monitoring Staff"
    className={inputCls}
    value={form.position}
    onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
  />
          </div>}
        <div className="flex items-center justify-between py-3 border-t border-[var(--hw-neutral-100)]">
          <div>
            <p className="text-[14px] font-semibold text-black">Send invite link</p>
            <p className="text-[13px] text-black">Send an invitation email to the new user.</p>
          </div>
          <Toggle on={form.sendInvite} onChange={(v) => setForm((f) => ({ ...f, sendInvite: v }))} />
        </div>
      </div>
      <div className="flex gap-3 mt-5 pt-4 border-t border-[var(--hw-neutral-100)]">
        <GhostBtn onClick={onClose} className="flex-1">Cancel</GhostBtn>
        <GreenBtn onClick={() => {
    if (!canSubmit) return;
    onAdd();
    onClose();
  }} disabled={!canSubmit} className="flex-1">Add User</GreenBtn>
      </div>
    </Modal>;
};
const UserAccountsTab = ({ showToast }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [users, setUsers] = useState(MOCK_USERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const filtered = users.filter((u) => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "All" || u.role === roleFilter;
    return matchSearch && matchRole;
  });
  return <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)]" />
          <input
    type="text"
    placeholder="Search by name or email…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full h-11 pl-9 pr-3.5 text-[14px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)] focus:border-transparent transition-shadow placeholder:text-[var(--hw-neutral-400)]"
  />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {["All", "Farmer", "DFTC"].map((r) => <button
    key={r}
    type="button"
    onClick={() => setRoleFilter(r)}
    className={`h-9 px-3.5 text-[13px] font-medium rounded-xl border transition-colors ${roleFilter === r ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)]" : "bg-white text-black border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"}`}
  >{r}</button>)}
        </div>
        <GreenBtn onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </GreenBtn>
      </div>

      {
    /* Mobile cards */
  }
      <div className="space-y-3 md:hidden">
        {filtered.map((u) => <button
    key={u.id}
    type="button"
    onClick={() => navigate(`/admin/system/user/${u.id}`)}
    className="w-full text-left bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] p-4 space-y-1 hover:bg-[var(--hw-neutral-50)] transition-colors"
  >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-black">{u.name}</p>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
            </div>
            <p className="text-[13px] text-black">{u.email}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[13px] text-black">{u.role}</span>
              <span className="text-[12px] text-black">{u.status}</span>
              <span className="text-[12px] text-black">Last login: {u.lastLogin}</span>
            </div>
          </button>)}
        {filtered.length === 0 && <p className="text-[14px] text-black text-center py-8">No users found.</p>}
      </div>

      {
    /* Desktop table */
  }
      <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-100)]">
                {["Name", "Email", "Role", "Status", "Last Login"].map((h) => <th key={h} className="px-4 py-3 text-[12px] font-semibold text-black uppercase tracking-wide whitespace-nowrap">{h}</th>)}
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {filtered.map((u) => <tr
    key={u.id}
    onClick={() => navigate(`/admin/system/user/${u.id}`)}
    className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
  >
                  <td className="px-4 py-3 text-[14px] font-medium text-black whitespace-nowrap">{u.name}</td>
                  <td className="px-4 py-3 text-[14px] text-black">{u.email}</td>
                  <td className="px-4 py-3 text-[14px] text-black">{u.role}</td>
                  <td className="px-4 py-3 text-[14px] text-black">{u.status}</td>
                  <td className="px-4 py-3 text-[14px] text-black whitespace-nowrap">{u.lastLogin}</td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)]" />
                  </td>
                </tr>)}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-[14px] text-black text-center">No users found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <AddUserModal
    onClose={() => setShowAddModal(false)}
    onAdd={() => showToast("User account created successfully.")}
  />}
    </div>;
};
const INITIAL_PERMISSIONS = [
  { id: "own_profile", label: "View own profile", farmer: true, dftc: true },
  { id: "own_settings", label: "Update own settings", farmer: true, dftc: true },
  { id: "about_page", label: "View About page", farmer: true, dftc: true },
  { id: "market_prices", label: "View market prices", farmer: true, dftc: false },
  { id: "crop_calendar", label: "View crop calendar", farmer: true, dftc: false },
  { id: "crop_plans", label: "Manage own crop plans", farmer: true, dftc: false },
  { id: "submit_prices", label: "Submit price records", farmer: false, dftc: true },
  { id: "submit_arrivals", label: "Submit arrival volume records", farmer: false, dftc: true },
  { id: "upload_dataset", label: "Upload dataset", farmer: false, dftc: true },
  { id: "view_trends", label: "View trends", farmer: false, dftc: true },
  { id: "view_submissions", label: "View submissions", farmer: false, dftc: true }
];
const RolesTab = ({ showToast }) => {
  const [perms, setPerms] = useState(INITIAL_PERMISSIONS);
  const toggle = (id, role) => {
    setPerms((prev) => prev.map((p) => p.id === id ? { ...p, [role]: !p[role] } : p));
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Role Permissions Matrix</SectionLabel>
        <p className="text-[13px] text-black mb-4">Configure what each role can access and perform within HarvestWise.</p>
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-200)]">
                <th className="py-3 pr-4 text-[12px] font-semibold text-black uppercase tracking-wide w-full">Permission</th>
                <th className="py-3 px-6 text-[12px] font-semibold text-black uppercase tracking-wide text-center whitespace-nowrap">Farmer</th>
                <th className="py-3 px-6 text-[12px] font-semibold text-black uppercase tracking-wide text-center whitespace-nowrap">DFTC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {perms.map((p) => <tr key={p.id} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                  <td className="py-3 pr-4 text-[14px] text-black">{p.label}</td>
                  <td className="py-3 px-6 text-center">
                    <input
    type="checkbox"
    checked={p.farmer}
    onChange={() => toggle(p.id, "farmer")}
    className="w-4 h-4 rounded accent-[var(--hw-green-700)] cursor-pointer"
  />
                  </td>
                  <td className="py-3 px-6 text-center">
                    <input
    type="checkbox"
    checked={p.dftc}
    onChange={() => toggle(p.id, "dftc")}
    className="w-4 h-4 rounded accent-[var(--hw-green-700)] cursor-pointer"
  />
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <div className="pt-4 border-t border-[var(--hw-neutral-100)] mt-3">
          <GreenBtn onClick={() => showToast("Role permissions updated successfully.")}>Save permission changes</GreenBtn>
        </div>
      </Card>
    </div>;
};
const SecurityTab = ({ showToast }) => {
  const [adminTfa, setAdminTfa] = useState(true);
  const [dftcTfa, setDftcTfa] = useState(false);
  const [minLength, setMinLength] = useState(8);
  const [reqUpper, setReqUpper] = useState(true);
  const [reqNumber, setReqNumber] = useState(true);
  const [reqSpecial, setReqSpecial] = useState(true);
  const [failLimit, setFailLimit] = useState(5);
  const [lockoutDur, setLockoutDur] = useState("15 minutes");
  const [sessionTo, setSessionTo] = useState("1 hour");
  const handleTfaToggle = (setter, v) => {
    setter(v);
    showToast("Security setting updated.");
  };
  return <div className="space-y-4">
      <Card>
        <SectionLabel>Two-Factor Authentication Requirement</SectionLabel>
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] font-semibold text-black">Require 2FA for Admin accounts</p>
              <p className="text-[13px] text-black">All admin users must use two-factor authentication.</p>
            </div>
            <Toggle on={adminTfa} onChange={(v) => handleTfaToggle(setAdminTfa, v)} />
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-[14px] font-semibold text-black">Require 2FA for DFTC accounts</p>
              <p className="text-[13px] text-black">All DFTC users must use two-factor authentication.</p>
            </div>
            <Toggle on={dftcTfa} onChange={(v) => handleTfaToggle(setDftcTfa, v)} />
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>Password Policy</SectionLabel>
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="sec-minlen">Minimum password length</FieldLabel>
            <input
    id="sec-minlen"
    type="number"
    min={6}
    max={32}
    value={minLength}
    onChange={(e) => setMinLength(Number(e.target.value))}
    className={inputCls}
  />
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {[
    { label: "Require uppercase letter", val: reqUpper, set: setReqUpper },
    { label: "Require number", val: reqNumber, set: setReqNumber },
    { label: "Require special character", val: reqSpecial, set: setReqSpecial }
  ].map((row) => <div key={row.label} className="flex items-center justify-between py-3">
                <p className="text-[14px] font-semibold text-black">{row.label}</p>
                <Toggle on={row.val} onChange={(v) => row.set(v)} />
              </div>)}
          </div>
          <GreenBtn onClick={() => showToast("System security settings saved.")}>Save security settings</GreenBtn>
        </div>
      </Card>

      <Card>
        <SectionLabel>Login Attempt Limit</SectionLabel>
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="sec-fail">Failed attempt limit</FieldLabel>
            <input
    id="sec-fail"
    type="number"
    min={3}
    max={20}
    value={failLimit}
    onChange={(e) => setFailLimit(Number(e.target.value))}
    className={inputCls}
  />
          </div>
          <div>
            <FieldLabel htmlFor="sec-lockout">Lockout duration</FieldLabel>
            <div className="relative">
              <select
    id="sec-lockout"
    value={lockoutDur}
    onChange={(e) => setLockoutDur(e.target.value)}
    className={`${inputCls} appearance-none pr-9`}
  >
                {["5 minutes", "15 minutes", "30 minutes", "1 hour", "24 hours"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
          <GreenBtn onClick={() => showToast("System security settings saved.")}>Save security settings</GreenBtn>
        </div>
      </Card>

      <Card>
        <SectionLabel>Session Timeout</SectionLabel>
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="sec-session">Timeout duration</FieldLabel>
            <div className="relative">
              <select
    id="sec-session"
    value={sessionTo}
    onChange={(e) => setSessionTo(e.target.value)}
    className={`${inputCls} appearance-none pr-9`}
  >
                {["15 minutes", "30 minutes", "1 hour", "4 hours", "8 hours", "Never"].map((o) => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
          <GreenBtn onClick={() => showToast("System security settings saved.")}>Save security settings</GreenBtn>
        </div>
      </Card>
    </div>;
};
const INITIAL_SERVICES = [
  { id: "postgres", label: "PostgreSQL Database", status: "Connected", lastChecked: "Today, 7:55 AM", notes: "Database operational" },
  { id: "fastapi", label: "FastAPI Backend", status: "Running", lastChecked: "Today, 7:55 AM", notes: "All endpoints responsive" },
  { id: "forecast", label: "Forecast Service", status: "Running", lastChecked: "Today, 7:55 AM", notes: "Latest forecast completed" },
  { id: "psa", label: "PSA OpenStat API", status: "Connected", lastChecked: "Today, 7:30 AM", notes: "Production data available" },
  { id: "weather", label: "OpenMeteo Weather API", status: "Connected", lastChecked: "Today, 7:30 AM", notes: "Weather forecast available" },
  { id: "gcal", label: "Google Calendar API", status: "Connected", lastChecked: "Today, 7:30 AM", notes: "Holiday data synced" },
  { id: "upload", label: "File Upload Service", status: "Running", lastChecked: "Today, 7:55 AM", notes: "Upload processing active" },
  { id: "sync", label: "Offline Sync Service", status: "Running", lastChecked: "Today, 7:55 AM", notes: "Sync queue empty" }
];
const HealthTab = ({ showToast }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("Today, 8:00 AM");
  const [services, setServices] = useState(INITIAL_SERVICES);
  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      const now = /* @__PURE__ */ new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const ts = `Today, ${timeStr}`;
      setLastRefreshed(ts);
      setServices((prev) => prev.map((s) => ({ ...s, lastChecked: ts })));
      setRefreshing(false);
      showToast("System status updated.");
    }, 1800);
  };
  const isGood = (s) => ["Connected", "Running", "Operational"].includes(s);
  return <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>System Status</SectionLabel>
        <span className="text-[12px] text-black">Last refreshed: {lastRefreshed}</span>
      </div>

      {
    /* Desktop table */
  }
      <div className="hidden sm:block overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--hw-neutral-100)]">
              {["Service", "Status", "Last Checked", "Notes"].map((h) => <th key={h} className="pb-3 pr-6 text-[12px] font-semibold text-black uppercase tracking-wide whitespace-nowrap">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--hw-neutral-100)]">
            {services.map((svc) => <tr key={svc.id}>
                <td className="py-3 pr-6 text-[14px] font-semibold text-black whitespace-nowrap">{svc.label}</td>
                <td className="py-3 pr-6">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isGood(svc.status) ? "bg-emerald-500" : "bg-red-500"}`} />
                    <span className="text-[14px] text-black whitespace-nowrap">{svc.status}</span>
                  </div>
                </td>
                <td className="py-3 pr-6 text-[14px] text-black whitespace-nowrap">{svc.lastChecked}</td>
                <td className="py-3 text-[14px] text-black">{svc.notes}</td>
              </tr>)}
          </tbody>
        </table>
      </div>

      {
    /* Mobile stacked */
  }
      <div className="sm:hidden divide-y divide-[var(--hw-neutral-100)]">
        {services.map((svc) => <div key={svc.id} className="py-3 space-y-0.5">
            <p className="text-[14px] font-semibold text-black">{svc.label}</p>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isGood(svc.status) ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-[13px] text-black">{svc.status}</span>
            </div>
            <p className="text-[12px] text-black">{svc.lastChecked} · {svc.notes}</p>
          </div>)}
      </div>

      <div className="pt-4 border-t border-[var(--hw-neutral-100)] mt-2">
        <GhostBtn onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? <><Loader2 className="w-4 h-4 animate-spin" />Refreshing system status…</> : <><RefreshCw className="w-4 h-4" />Refresh status</>}
        </GhostBtn>
      </div>
    </Card>;
};
function AdminSystemManagement() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const [activeTab, setActiveTab] = useState(
    tabParam && ["users", "roles", "security", "health"].includes(tabParam) ? tabParam : "users"
  );
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef(null);
  const tabBarRef = useRef(null);
  useEffect(() => {
    if (tabParam && ["users", "roles", "security", "health"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  useEffect(() => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const btn = bar.querySelector('[data-active="true"]');
    if (btn) btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeTab]);
  const showToast = (msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 2800);
  };
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setParams({ tab });
  };
  return <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1240px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold text-black">System Management</h1>
        <p className="text-[15px] text-black mt-0.5">Manage users, permissions, security, and system health.</p>
      </div>

      <div
    ref={tabBarRef}
    className="flex gap-1 border-b border-[var(--hw-neutral-200)] mb-5"
    style={{ overflowX: "auto", scrollbarWidth: "none" }}
  >
        {TABS.map((t) => <button
    key={t.id}
    data-active={activeTab === t.id ? "true" : "false"}
    type="button"
    onClick={() => handleTabChange(t.id)}
    className={`flex-shrink-0 px-3.5 py-2.5 text-[14px] font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${activeTab === t.id ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]" : "border-transparent text-black hover:text-[var(--hw-green-700)]"}`}
  >
            {t.label}
          </button>)}
      </div>

      {activeTab === "users" && <UserAccountsTab showToast={showToast} />}
      {activeTab === "roles" && <RolesTab showToast={showToast} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}
      {activeTab === "health" && <HealthTab showToast={showToast} />}

      <Toast message={toastMsg} />
    </div>;
}
export {
  MOCK_USERS,
  AdminSystemManagement as default
};
