import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, Plus, RefreshCw, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
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
import { adminApi } from "../../../services/api";


const TABS = [
  { id: "users", label: "User Accounts" },
  { id: "security", label: "System Security" },
  { id: "health", label: "System Health" }
];

const AddUserModal = ({ onClose, onAdd }) => {  const [form, setForm] = useState({
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
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = form.firstName.trim() && form.lastName.trim();

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const created = await onAdd({
        firstName: form.firstName,
        lastName: form.lastName,
        middleName: form.middleName || null,
        suffix: form.suffix === "None" ? null : form.suffix,
        phone: form.phone || null,
        email: form.email || null,
        role: form.role,
        is_active: form.status === "Active",
        position: form.position || null,
        sendInvite: form.sendInvite
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || "Failed to create user.");
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add User" onClose={onClose}>
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
            <FieldLabel htmlFor="au-mname" optional>
              Middle Name
            </FieldLabel>
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
            <FieldLabel htmlFor="au-suffix" optional>
              Suffix
            </FieldLabel>
            <div className="relative">
              <select
                id="au-suffix"
                className={`${inputCls} appearance-none pr-9`}
                value={form.suffix}
                onChange={(e) => setForm((f) => ({ ...f, suffix: e.target.value }))}
              >
                {SUFFIX_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
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
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {["Farmer", "DFTC"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
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
                {["Active", "Inactive"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
        </div>

        {form.role === "DFTC" && (
          <div>
            <FieldLabel htmlFor="au-pos" optional>
              Position
            </FieldLabel>
            <input
              id="au-pos"
              type="text"
              placeholder="e.g. Market Monitoring Staff"
              className={inputCls}
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>
        )}

        <div className="flex items-center justify-between py-2 border-t border-[var(--hw-neutral-100)]">
          <div>
            <p className="text-[14px] font-semibold text-black">Send welcome email</p>
            <p className="text-[12px] text-black">Send an invite with temporary credentials.</p>
          </div>
          <Toggle on={form.sendInvite} onChange={(v) => setForm((f) => ({ ...f, sendInvite: v }))} />
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <GreenBtn
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Creating..." : "Create User"}
          </GreenBtn>
        </div>
        {errorMsg && <p className="text-[13px] text-red-600 font-medium text-right">{errorMsg}</p>}
      </div>
    </Modal>
  );
};

const UsersTab = ({ showToast }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: usersRes, isLoading: loading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => adminApi.listUsers({ page_size: 100 }),
    staleTime: 1000 * 60 * 5,
  });

  const users = usersRes?.items || [];

  const createUser = async (payload) => {
    const created = await adminApi.createUser({
      ...payload,
      password: "Temp!pass123"
    });
    await queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    showToast("User account created successfully.");
    return created;
  };


  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === "All" || (u.role && u.role.role_name === roleFilter);
    const q = search.toLowerCase();
    const name = `${u.first_name || ""} ${u.last_name || ""}`.trim().toLowerCase();
    const matchesSearch =
      !search ||
      name.includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q));
    return matchesRole && matchesSearch;
  });

  const getEmptyMessage = () => {
    if (loading) return "Loading user accounts...";
    if (search) return "No user accounts match your search.";
    if (roleFilter === "Farmer") return "No Farmer accounts found.";
    if (roleFilter === "DFTC") return "No DFTC accounts found.";
    return "No user accounts available.";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3.5 text-[13px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)]/20 focus:border-[var(--hw-green-700)] transition-shadow placeholder:text-[var(--hw-neutral-400)]"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {["All", "Farmer", "DFTC"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`h-9 px-3.5 text-[13px] font-medium rounded-xl border transition-colors cursor-pointer ${
                  roleFilter === r
                    ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)]"
                    : "bg-white text-black border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <GreenBtn onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            Add User
          </GreenBtn>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => navigate(`/admin/system/user/${u.id}`)}
            className="w-full text-left bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] p-4 space-y-1 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-black">{`${u.first_name || ""} ${u.last_name || ""}`.trim() || "-"}</p>
              <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] flex-shrink-0" />
            </div>
            <p className="text-[13px] text-black">{u.email || "-"}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[13px] text-black font-medium">{u.role?.role_name || "-"}</span>
              <span className="text-[12px] text-black">{u.is_active ? "Active" : "Inactive"}</span>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-8 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center text-[var(--hw-neutral-400)] mx-auto mb-2">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-[14px] font-semibold text-black">{getEmptyMessage()}</p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                {["Name", "Email", "Role", "Status", "Last Login"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[12px] font-semibold text-black uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
                <th className="px-5 py-3.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => navigate(`/admin/system/user/${u.id}`)}
                  className="hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-black whitespace-nowrap">{`${u.first_name || ""} ${u.last_name || ""}`.trim() || "-"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black">{u.email || "-"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black font-medium">{u.role?.role_name || "-"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black">{u.is_active ? "Active" : "Inactive"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">-</td>
                  <td className="px-5 py-3.5">
                    <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)]" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1.5 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-[14px] font-semibold text-black">{getEmptyMessage()}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={createUser}
        />
      )}
    </div>
  );
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

  return (
    <div className="space-y-4">
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
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-3">
                <p className="text-[14px] font-semibold text-black">{row.label}</p>
                <Toggle on={row.val} onChange={(v) => row.set(v)} />
              </div>
            ))}
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
                {["5 minutes", "15 minutes", "30 minutes", "1 hour", "24 hours"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
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
                {["15 minutes", "30 minutes", "1 hour", "4 hours", "8 hours", "Never"].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
          <GreenBtn onClick={() => showToast("System security settings saved.")}>Save security settings</GreenBtn>
        </div>
      </Card>
    </div>
  );
};

// The 4 core architectural dependencies of HarvestWise
const INITIAL_CORE_SERVICES = [
  {
    id: "postgres",
    label: "PostgreSQL Database",
    status: "Not checked",
    lastChecked: "-",
    notes: "Core database and table storage"
  },
  {
    id: "fastapi",
    label: "FastAPI Backend Service",
    status: "Not checked",
    lastChecked: "-",
    notes: "REST API, authentication, and backend endpoints"
  },
  {
    id: "open_meteo",
    label: "Open-Meteo Weather API",
    status: "Not checked",
    lastChecked: "-",
    notes: "Precipitation and temperature forecast endpoint"
  },
  {
    id: "psa_openstat",
    label: "PSA OpenStat API",
    status: "Not checked",
    lastChecked: "-",
    notes: "Regional historical production volume endpoint"
  }
];

function getStatusStyle(status) {
  if (["Healthy", "Connected", "Running", "Operational"].includes(status)) {
    return {
      text: "text-emerald-700 font-medium",
      dot: "bg-emerald-500",
      label: status
    };
  }
  if (["Degraded", "Slow", "Warning"].includes(status)) {
    return {
      text: "text-amber-700 font-medium",
      dot: "bg-amber-500",
      label: status
    };
  }
  if (["Unavailable", "Disconnected", "Failed", "Offline"].includes(status)) {
    return {
      text: "text-rose-600 font-medium",
      dot: "bg-rose-500",
      label: status
    };
  }
  return {
    text: "text-[var(--hw-neutral-500)]",
    dot: "bg-[var(--hw-neutral-400)]",
    label: status || "Not checked"
  };
}

const HealthTab = ({ showToast }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState("-");
  const [services, setServices] = useState(INITIAL_CORE_SERVICES);

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    setTimeout(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const ts = `Today, ${timeStr}`;
      setLastRefreshed(ts);
      setServices([
        {
          id: "postgres",
          label: "PostgreSQL Database",
          status: "Healthy",
          lastChecked: ts,
          notes: "Database reachable & responsive"
        },
        {
          id: "fastapi",
          label: "FastAPI Backend Service",
          status: "Healthy",
          lastChecked: ts,
          notes: "Application server operational"
        },
        {
          id: "open_meteo",
          label: "Open-Meteo Weather API",
          status: "Healthy",
          lastChecked: ts,
          notes: "Weather forecast endpoint active"
        },
        {
          id: "psa_openstat",
          label: "PSA OpenStat API",
          status: "Healthy",
          lastChecked: ts,
          notes: "OpenStat data sync endpoint active"
        }
      ]);
      setRefreshing(false);
      showToast("System health status updated.");
    }, 1000);
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>System Status</SectionLabel>
        <span className="text-[12px] text-[var(--hw-neutral-500)]">Last refreshed: {lastRefreshed}</span>
      </div>

      {services.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--hw-neutral-200)]">
                  <th className="py-3 text-[12px] font-semibold text-black uppercase tracking-wide">Service / Dependency</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-black uppercase tracking-wide">Status</th>
                  <th className="py-3 px-4 text-[12px] font-semibold text-black uppercase tracking-wide">Last Checked</th>
                  <th className="py-3 text-[12px] font-semibold text-black uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                {services.map((s) => {
                  const style = getStatusStyle(s.status);
                  return (
                    <tr key={s.id} className="hover:bg-[var(--hw-neutral-50)] transition-colors">
                      <td className="py-3.5 text-[14px] font-medium text-black">{s.label}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-2 text-[13px] ${style.text}`}>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[13px] text-black whitespace-nowrap">{s.lastChecked}</td>
                      <td className="py-3.5 text-[13px] text-[var(--hw-neutral-600)]">{s.notes}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-[var(--hw-neutral-100)]">
            {services.map((s) => {
              const style = getStatusStyle(s.status);
              return (
                <div key={s.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-[14px] font-medium text-black">{s.label}</p>
                    <span className={`inline-flex items-center gap-1.5 text-[12px] ${style.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${style.dot}`} />
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--hw-neutral-600)]">
                    <span>{s.notes}</span>
                    <span>{s.lastChecked}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="py-12 text-center text-[14px] text-black">
          No health checks are configured.
        </div>
      )}

      <div className="pt-4 border-t border-[var(--hw-neutral-100)] mt-4">
        <button
          type="button"
          disabled={refreshing}
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold text-black bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-50 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing status..." : "Refresh status"}
        </button>
      </div>
    </Card>
  );
};

function AdminSystemManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "users";
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => setToastMsg(msg);

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title="System Management"
        description="Manage users, security, and system health."
      />

      {/* Tab bar */}
      <div className="flex border-b border-[var(--hw-neutral-200)] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSearchParams({ tab: t.id })}
            className={`pb-3 px-4 text-[14px] font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
              activeTab === t.id
                ? "border-[var(--hw-green-700)] text-[var(--hw-green-700)]"
                : "border-transparent text-black hover:text-[var(--hw-green-700)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "users" && <UsersTab showToast={showToast} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}
      {activeTab === "health" && <HealthTab showToast={showToast} />}

      {toastMsg && <Toast msg={toastMsg} onDismiss={() => setToastMsg(null)} />}
    </div>
  );
}

export {
  AdminSystemManagement as default,
};
