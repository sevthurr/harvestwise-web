import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Search, Plus, RefreshCw, ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { PHONE_MAX_LENGTH, sanitizePhoneInput } from "../../global/phoneInput";
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
import { formatDateTime, formatDisplayLabel, formatPersonName } from "../../global/utils/apiTransforms";


const TABS = [
  { id: "users", label: "User Accounts" },
  { id: "removal-requests", label: "Account Requests" },
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
    role: "DFTC",
    position: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = form.firstName.trim() && form.lastName.trim() && form.email.trim();

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
        is_active: true,
        position: form.position || null
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
              maxLength={PHONE_MAX_LENGTH}
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }))}
            />
          </div>
          <div>
            <FieldLabel htmlFor="au-email">Email</FieldLabel>
            <input
              id="au-email"
              type="email"
              required
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
            <input
              id="au-role"
              type="text"
              value="DFTC"
              disabled
              readOnly
              className={`${inputCls} bg-[var(--hw-neutral-100)] text-[var(--hw-neutral-400)] cursor-not-allowed`}
            />
          </div>
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
  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get("highlight");
  const [highlightedUser, setHighlightedUser] = useState(highlightParam);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);

  // 3-second temporary highlight timer (matching DFTC pattern)
  useEffect(() => {
    if (!highlightParam) return;
    setHighlightedUser(highlightParam);
    const timer = setTimeout(() => {
      setHighlightedUser(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightParam]);

  const { data: usersRes, isLoading: loading } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => adminApi.listUsers({ page_size: 100 }),
    // Last-login timestamps change outside this page when an account signs in.
    // Do not keep the user list fresh for five minutes or it will show stale
    // login times after returning to User Accounts.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const users = usersRes?.items || [];

  // Smooth scroll to highlighted user
  useEffect(() => {
    if (!highlightedUser || loading) return;
    const t = setTimeout(() => {
      const hl = highlightedUser.toLowerCase();
      const el =
        document.getElementById(`user-row-${hl}`) ||
        document.querySelector(`[data-user-row*="${hl}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [highlightedUser, loading, users]);

  const createUser = async (payload) => {
    // The API generates a unique cryptographically secure temporary password
    // and passes that same value to the welcome-email flow.
    const created = await adminApi.createUser(payload);
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
    <div className="space-y-3.5 sm:space-y-4">
      {/* Control bar: Search, Role filters, Add User button */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--hw-neutral-400)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9.5 pl-9 pr-3.5 text-[13px] text-black bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-200)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--hw-green-700)]/20 focus:border-[var(--hw-green-700)] transition text-[var(--hw-neutral-800)] placeholder:text-[var(--hw-neutral-400)]"
          />
        </div>

        {/* Role Filters + Add User */}
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {["All", "Farmer", "DFTC"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`h-8.5 px-3 text-[12px] sm:text-[13px] font-medium rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  roleFilter === r
                    ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)] shadow-xs"
                    : "bg-white text-[var(--hw-neutral-700)] border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 h-8.5 px-3 sm:px-3.5 text-[12px] sm:text-[13px] font-medium bg-[var(--hw-green-700)] text-white rounded-xl hover:bg-[var(--hw-green-800)] transition-colors shadow-xs cursor-pointer shrink-0 ml-auto sm:ml-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2.5 md:hidden">
        {filtered.map((u) => {
          const hl = (highlightedUser || "").toLowerCase();
          const fullName = formatPersonName(`${u.first_name || ""} ${u.last_name || ""}`) || "-";
          const userMatcher = `${u.id} ${u.email || ""} ${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
          const isHighlighted = Boolean(
            hl &&
            (userMatcher.includes(hl) ||
             u.id.toLowerCase() === hl ||
             (u.email && u.email.toLowerCase() === hl))
          );
          const initials = `${(u.first_name?.[0] || "").toUpperCase()}${(u.last_name?.[0] || "").toUpperCase()}` || "U";

          return (
            <button
              key={u.id}
              id={`user-card-${u.id.toLowerCase()}`}
              data-user-row={userMatcher}
              type="button"
              onClick={() => navigate(`/admin/system/user/${u.id}`)}
              className={`w-full text-left rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-3 sm:p-3.5 transition-colors duration-300 cursor-pointer ${
                isHighlighted
                  ? "bg-emerald-50/70"
                  : "bg-white hover:bg-[var(--hw-neutral-50)]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--hw-green-50)] border border-[var(--hw-green-200)] text-[var(--hw-green-800)] flex items-center justify-center font-bold text-[12px] shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <p className="text-[14px] font-bold text-[var(--hw-neutral-900)] truncate">
                      {fullName}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold shrink-0 ${u.is_active ? "text-emerald-700" : "text-[var(--hw-neutral-500)]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? "bg-emerald-500" : "bg-[var(--hw-neutral-400)]"}`} />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-[var(--hw-neutral-600)] mt-0.5 truncate">
                    <span className="font-medium text-[var(--hw-green-800)] bg-[var(--hw-green-50)] px-1.5 py-0.5 rounded text-[11px]">
                      {u.role?.role_name || "-"}
                    </span>
                    {u.email && u.email !== "-" && (
                      <>
                        <span className="text-[var(--hw-neutral-300)]">·</span>
                        <span className="truncate">{u.email}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)] shrink-0 self-center" />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl border border-[var(--hw-neutral-200)] p-8 text-center space-y-1.5">
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
              {filtered.map((u) => {
                const hl = (highlightedUser || "").toLowerCase();
                const userMatcher = `${u.id} ${u.email || ""} ${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
                const isHighlighted = Boolean(
                  hl &&
                  (userMatcher.includes(hl) ||
                   u.id.toLowerCase() === hl ||
                   (u.email && u.email.toLowerCase() === hl))
                );

                return (
                  <tr
                    key={u.id}
                    id={`user-row-${u.id.toLowerCase()}`}
                    data-user-row={userMatcher}
                    onClick={() => navigate(`/admin/system/user/${u.id}`)}
                    className={`transition-colors duration-500 cursor-pointer ${
                      isHighlighted
                        ? "bg-emerald-50/70 font-medium"
                        : "hover:bg-[var(--hw-neutral-50)]"
                    }`}
                  >
                    <td className="px-5 py-3.5 text-[13px] font-semibold text-black whitespace-nowrap">{formatPersonName(`${u.first_name || ""} ${u.last_name || ""}`) || "-"}</td>
                    <td className="px-5 py-3.5 text-[13px] text-black">{u.email || "-"}</td>
                    <td className="px-5 py-3.5 text-[13px] text-black font-medium">{u.role?.role_name || "-"}</td>
                    <td className="px-5 py-3.5 text-[13px] text-black">{u.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">{u.last_login ? formatDateTime(u.last_login) : "-"}</td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="w-4 h-4 text-[var(--hw-neutral-400)]" />
                    </td>
                  </tr>
                );
              })}
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

const REMOVAL_STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  submitted: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-600)] border-[var(--hw-neutral-200)]",
  fulfilled: "bg-[var(--hw-neutral-50)] text-[var(--hw-neutral-600)] border-[var(--hw-neutral-200)]"
};

const REMOVAL_STATUS_LABELS = {
  pending: "Pending",
  submitted: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  fulfilled: "Fulfilled"
};

const removalStatusBadge = (status) => (
  <span
    className={`inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
      REMOVAL_STATUS_STYLES[status] || REMOVAL_STATUS_STYLES.pending
    }`}
  >
    {REMOVAL_STATUS_LABELS[status] || status || "-"}
  </span>
);

function formatRemovalDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Account removal requests awaiting SuperAdmin review. A request is a *request*:
 * approving it marks the review outcome, the team still performs the removal.
 */
const AccountRequestsTab = ({ showToast }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const requestId = searchParams.get("request_id");
  const [filter, setFilter] = useState(requestId ? null : "pending");
  const targetRequestRef = useRef(null);
  // { request, status } for the confirm dialog, or null when closed.
  const [confirm, setConfirm] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: requestsRes, isLoading } = useQuery({
    queryKey: ["adminRemovalRequests", filter],
    queryFn: () =>
      adminApi.listRemovalRequests({
        status: filter || undefined,
        page_size: 100
      })
  });

  // Shares the UsersTab cache, so requester names resolve without a second route.
  const { data: usersRes } = useQuery({
    queryKey: ["adminUsers"],
    queryFn: () => adminApi.listUsers({ page_size: 100 }),
    staleTime: 1000 * 60 * 5
  });

  const requests = requestsRes?.items || [];
  const usersById = new Map((usersRes?.items || []).map((u) => [u.id, u]));

  const displayUser = (userId) => {
    if (!userId) return "-";
    const u = usersById.get(userId);
    if (!u) return userId;
    return formatPersonName(`${u.first_name || ""} ${u.last_name || ""}`) || u.email || userId;
  };

  const roleOf = (userId) => usersById.get(userId)?.role?.role_name || "-";

  const isOpen = (status) => status === "pending" || status === "submitted";

  useEffect(() => {
    if (requestId && requests.some((request) => request.id === requestId)) {
      targetRequestRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [requestId, requests]);

  const review = async () => {
    if (!confirm) return;
    setSubmitting(true);
    try {
      await adminApi.reviewRemovalRequest(confirm.request.id, { status: confirm.status });
      await queryClient.invalidateQueries({ queryKey: ["adminRemovalRequests"] });
      showToast(
        confirm.status === "approved"
          ? "Account removal request approved."
          : "Account removal request rejected."
      );
      setConfirm(null);
    } catch (err) {
      showToast(err?.message || "Could not update the removal request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const reviewButtons = (r, isMobile = false) => (
    <div className={`flex items-center gap-2 ${isMobile ? "w-full pt-1" : ""}`}>
      <button
        type="button"
        disabled={!isOpen(r.status)}
        onClick={() => setConfirm({ request: r, status: "approved" })}
        className={`${isMobile ? "flex-1 h-9" : "h-8 px-3"} text-[12px] font-semibold text-[var(--hw-green-800)] border border-[var(--hw-green-700)] rounded-lg hover:bg-[var(--hw-green-50)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
      >
        Approve
      </button>
      <button
        type="button"
        disabled={!isOpen(r.status)}
        onClick={() => setConfirm({ request: r, status: "rejected" })}
        className={`${isMobile ? "flex-1 h-9" : "h-8 px-3"} text-[12px] font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors`}
      >
        Reject
      </button>
    </div>
  );

  const emptyMessage = isLoading ? "Loading requests..." : "No account removal requests.";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: "pending", label: "Pending" },
          { id: "approved", label: "Approved" },
          { id: "rejected", label: "Rejected" },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter((current) => current === f.id ? null : f.id)}
            className={`h-9 px-3.5 text-[13px] font-medium rounded-xl border transition-colors cursor-pointer ${
              filter === f.id
                ? "bg-[var(--hw-green-700)] text-white border-[var(--hw-green-700)]"
                : "bg-white text-black border-[var(--hw-neutral-200)] hover:bg-[var(--hw-neutral-50)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {requests.map((r) => (
          <div
            key={r.id}
            ref={r.id === requestId ? targetRequestRef : undefined}
            className={`bg-white rounded-2xl border shadow-[0_1px_6px_rgba(0,0,0,0.06)] p-4 space-y-2 ${
              r.id === requestId
                ? "border-[var(--hw-green-700)] ring-2 ring-[var(--hw-green-100)]"
                : "border-[var(--hw-neutral-200)]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <button
                  type="button"
                  disabled={!r.user_id}
                  onClick={() => navigate(`/admin/system/user/${r.user_id}`)}
                  className="text-[15px] font-semibold text-black truncate disabled:text-[var(--hw-neutral-500)]"
                >
                  {displayUser(r.user_id)}
                </button>
                <p className="text-[12px] text-[var(--hw-neutral-600)]">{roleOf(r.user_id)}</p>
              </div>
              {removalStatusBadge(r.status)}
            </div>
            <p className="text-[13px] text-black">{r.reason || "-"}</p>
            <p className="text-[12px] text-[var(--hw-neutral-600)]">Requested {formatRemovalDate(r.requested_at)}</p>
            {r.reviewed_at && (
              <p className="text-[12px] text-[var(--hw-neutral-600)]">
                Reviewed by {displayUser(r.reviewed_by_user_id)} on {formatRemovalDate(r.reviewed_at)}
              </p>
            )}
            {reviewButtons(r, true)}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] p-8 text-center space-y-1.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] flex items-center justify-center text-[var(--hw-neutral-400)] mx-auto mb-2">
              <Inbox className="w-5 h-5" />
            </div>
            <p className="text-[14px] font-semibold text-black">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[0_1px_6px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--hw-neutral-100)] bg-[var(--hw-neutral-50)]">
                {["Requester", "Role", "Reason", "Requested", "Status", "Reviewed By", "Reviewed At", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-[12px] font-semibold text-black uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hw-neutral-100)]">
              {requests.map((r) => (
                <tr
                  key={r.id}
                  ref={r.id === requestId ? targetRequestRef : undefined}
                  className={`hover:bg-[var(--hw-neutral-50)] transition-colors ${
                    r.id === requestId ? "bg-[var(--hw-green-50)]" : ""
                  }`}
                >
                  <td className="px-5 py-3.5 text-[13px] font-semibold text-black whitespace-nowrap">
                    {r.user_id ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/system/user/${r.user_id}`)}
                        className="text-black hover:text-[var(--hw-green-700)] hover:underline cursor-pointer"
                      >
                        {displayUser(r.user_id)}
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">{roleOf(r.user_id)}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black max-w-[260px]">{r.reason || "-"}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">{formatRemovalDate(r.requested_at)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{removalStatusBadge(r.status)}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">{displayUser(r.reviewed_by_user_id)}</td>
                  <td className="px-5 py-3.5 text-[13px] text-black whitespace-nowrap">{formatRemovalDate(r.reviewed_at)}</td>
                  <td className="px-5 py-3.5 whitespace-nowrap">{reviewButtons(r)}</td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-1.5 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)]">
                        <Inbox className="w-5 h-5" />
                      </div>
                      <p className="text-[14px] font-semibold text-black">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {confirm && (
        <Modal
          title={confirm.status === "approved" ? "Approve removal request?" : "Reject removal request?"}
          onClose={() => {
            if (!submitting) setConfirm(null);
          }}
        >
          <p className="text-[14px] text-black mb-5 leading-relaxed">
            {confirm.status === "approved"
              ? `The account removal request from ${displayUser(confirm.request.user_id)} will be marked as approved. The HarvestWise team still carries out the removal.`
              : `The account removal request from ${displayUser(confirm.request.user_id)} will be marked as rejected. The account stays active.`}
          </p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setConfirm(null)}>Cancel</GhostBtn>
            {confirm.status === "approved" ? (
              <GreenBtn disabled={submitting} onClick={review}>
                {submitting ? "Updating..." : "Approve request"}
              </GreenBtn>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={review}
                className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {submitting ? "Updating..." : "Reject request"}
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

const SecurityTab = ({ showToast }) => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { data: securityData, isLoading, isError } = useQuery({
    queryKey: ["adminSystemSecurity"],
    queryFn: adminApi.getSystemSecurity,
    staleTime: 0,
    refetchOnMount: "always",
  });
  useEffect(() => {
    if (securityData) setSettings(securityData);
  }, [securityData]);

  const save = async () => {
    setSaving(true);
    try {
      const saved = await adminApi.updateSystemSecurity(settings);
      setSettings(saved);
      queryClient.setQueryData(["adminSystemSecurity"], saved);
      showToast("System security settings saved.");
    } catch {
      showToast("Failed to save system security settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (isError) {
    return <Card><p className="text-[14px] text-rose-700">Unable to load security settings.</p></Card>;
  }
  if (isLoading || !settings) {
    return <Card><p className="text-[14px] text-black">Loading security settings...</p></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>Password Policy</SectionLabel>
        <div className="space-y-4">
          <div>
            <FieldLabel htmlFor="sec-minlen">Minimum password length</FieldLabel>
            <input id="sec-minlen" type="number" min={8} max={128} value={settings.min_password_length}
              onChange={(e) => setSettings({ ...settings, min_password_length: Number(e.target.value) })} className={inputCls} />
          </div>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {["require_uppercase", "require_number", "require_special"].map((field) => (
              <div key={field} className="flex items-center justify-between py-3">
                <p className="text-[14px] font-semibold text-black">
                  {field === "require_uppercase" ? "Require uppercase letter" : field === "require_number" ? "Require number" : "Require special character"}
                </p>
                <Toggle on={settings[field]} onChange={(value) => setSettings({ ...settings, [field]: value })} />
              </div>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <SectionLabel>Login Attempt Limit</SectionLabel>
        <div className="space-y-4">
          <div><FieldLabel htmlFor="sec-fail">Failed attempt limit</FieldLabel>
            <input id="sec-fail" type="number" min={3} max={20} value={settings.failed_attempt_limit}
              onChange={(e) => setSettings({ ...settings, failed_attempt_limit: Number(e.target.value) })} className={inputCls} /></div>
          <div><FieldLabel htmlFor="sec-lock">Lockout duration (minutes)</FieldLabel>
            <input id="sec-lock" type="number" min={1} max={1440} value={settings.lockout_minutes}
              onChange={(e) => setSettings({ ...settings, lockout_minutes: Number(e.target.value) })} className={inputCls} /></div>
          <GreenBtn disabled={saving} onClick={save}>{saving ? "Saving..." : "Save security settings"}</GreenBtn>
        </div>
      </Card>
      <Card><p className="text-[13px] text-black">Two-factor authentication and session timeout remain managed by the existing authentication flows and are not configurable here yet.</p></Card>
    </div>
  );
};



function getStatusStyle(status) {
  if (["Healthy", "Connected", "Running", "Operational"].includes(status)) {
    return {
      text: "text-emerald-700 font-medium",
      dot: "bg-emerald-500",
      label: "Healthy"
    };
  }
  if (["Attention Required", "Warning", "Degraded"].includes(status)) {
    return {
      text: "text-amber-700 font-medium",
      dot: "bg-amber-500",
      label: status
    };
  }
  if (status === "Unknown") {
    return {
      text: "text-slate-600 font-medium",
      dot: "bg-slate-400",
      label: "Unknown"
    };
  }
  return {
    text: "text-rose-600 font-medium",
    dot: "bg-rose-500",
    label: "Disconnected"
  };
}

const DEFAULT_CORE_SERVICES = [
  {
    id: "postgres",
    label: "PostgreSQL Database",
    status: "Checking...",
    last_updated: "-",
    notes: "Checking database connectivity..."
  },
  {
    id: "fastapi",
    label: "FastAPI Backend Service",
    status: "Checking...",
    last_updated: "-",
    notes: "Checking backend operational status..."
  },
  {
    id: "open_meteo",
    label: "Open-Meteo Weather API",
    status: "Checking...",
    last_updated: "-",
    notes: "Checking weather forecast endpoint..."
  },
  {
    id: "psa_openstat",
    label: "PSA OpenStat API",
    status: "Checking...",
    last_updated: "-",
    notes: "Checking OpenStat data sync endpoint..."
  }
];

const HealthTab = ({ showToast }) => {
  const navigate = useNavigate();
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const {
    data: healthData,
    isLoading,
    isFetching,
    isError,
    error
  } = useQuery({
    queryKey: ["adminSystemHealth"],
    queryFn: () => adminApi.getSystemHealth(),
    staleTime: 15000,
    refetchInterval: 60000
  });

  const isBusy = manualRefreshing || isFetching;

  const handleRefresh = async () => {
    if (isBusy) return;
    setManualRefreshing(true);
    try {
      const fresh = await adminApi.getSystemHealth({ refresh: "true" });
      queryClient.setQueryData(["adminSystemHealth"], fresh);
      showToast("System health status updated.");
    } catch {
      showToast("Failed to refresh system health.");
    } finally {
      setManualRefreshing(false);
    }
  };

  let services = DEFAULT_CORE_SERVICES;
  let lastRefreshed = "-";

  if (healthData?.items) {
    services = healthData.items;
    lastRefreshed = healthData.last_updated || "-";
  } else if (isError) {
    lastRefreshed = "Failed to update";
    services = [
      {
        id: "postgres",
        label: "PostgreSQL Database",
        status: "Disconnected",
        last_updated: "Unavailable",
        notes: "Cannot verify database connection while backend API is unreachable."
      },
      {
        id: "fastapi",
        label: "FastAPI Backend Service",
        status: "Disconnected",
        last_updated: "Unavailable",
        notes: error?.message || "FastAPI backend server is unreachable or offline."
      },
      {
        id: "open_meteo",
        label: "Open-Meteo Weather API",
        status: "Unknown",
        last_updated: "Unavailable",
        notes: "Upstream could not be verified: the backend API was unreachable, so no verdict was obtained."
      },
      {
        id: "psa_openstat",
        label: "PSA OpenStat API",
        status: "Unknown",
        last_updated: "Unavailable",
        notes: "Upstream could not be verified: the backend API was unreachable, so no verdict was obtained."
      }
    ];
  }

  const attentionSources = healthData?.sources_requiring_attention || [];

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>System Status</SectionLabel>
          <span className="text-[12px] text-[var(--hw-neutral-500)]">
            Last refreshed: {lastRefreshed}
          </span>
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
                    <th className="py-3 px-4 text-[12px] font-semibold text-black uppercase tracking-wide">Last Updated</th>
                    <th className="py-3 text-[12px] font-semibold text-black uppercase tracking-wide">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--hw-neutral-100)]">
                  {services.map((s) => {
                    const isChecking = isLoading && !healthData && !isError;
                    const style = isChecking
                      ? { text: "text-[var(--hw-neutral-500)] font-medium", dot: "bg-amber-400 animate-pulse", label: "Checking..." }
                      : getStatusStyle(s.status);
                    return (
                      <tr key={s.id}>
                        <td className="py-3.5 text-[14px] font-medium text-black">{s.label}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-2 text-[13px] ${style.text}`}>
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                            {style.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-black whitespace-nowrap">{s.last_updated || s.lastChecked || "-"}</td>
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
                const isChecking = isLoading && !healthData && !isError;
                const style = isChecking
                  ? { text: "text-[var(--hw-neutral-500)] font-medium", dot: "bg-amber-400 animate-pulse", label: "Checking..." }
                  : getStatusStyle(s.status);
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
                      <span className="pr-2">{s.notes}</span>
                      <span className="whitespace-nowrap flex-shrink-0">{s.last_updated || s.lastChecked || "-"}</span>
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
            disabled={isBusy}
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 h-10 px-4 text-[13px] font-semibold text-black bg-white border border-[var(--hw-neutral-200)] rounded-xl hover:bg-[var(--hw-neutral-50)] disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? "animate-spin" : ""}`} />
            {isBusy ? "Refreshing status..." : "Refresh status"}
          </button>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SectionLabel>Sources Requiring Attention</SectionLabel>
            {attentionSources.length > 0 && (
              <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                {attentionSources.length} {attentionSources.length === 1 ? "alert" : "alerts"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/data-sources")}
            className="text-[12px] font-medium text-[var(--hw-green-700)] hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            Data Sources Catalog →
          </button>
        </div>

        {attentionSources.length === 0 ? (
          <div className="py-5 px-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-semibold text-emerald-900">All data sources and feeds are healthy</p>
              <p className="text-[12px] text-emerald-700">No active sync failures, connection timeouts, or pending reviews detected.</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] rounded-xl overflow-hidden">
            {attentionSources.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(s.id ? `/admin/data-sources/${s.id}` : "/admin/data-sources")}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--hw-neutral-50)] transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                    <p className="text-[13px] font-semibold text-black">{formatDisplayLabel(s.source_name)}</p>
                    <span className="text-[11px] text-[var(--hw-neutral-600)] px-1.5 py-0.5 rounded bg-[var(--hw-neutral-100)]">
                      {s.source_type || s.ingestion_method}
                    </span>
                  </div>
                  <p className="text-[12px] text-rose-700 mt-1 pl-4">{s.reason}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(s.id ? `/admin/data-sources/${s.id}` : "/admin/data-sources");
                  }}
                  className="text-[12px] font-semibold text-[var(--hw-green-700)] hover:text-[var(--hw-green-800)] px-3 py-1.5 rounded-lg border border-[var(--hw-neutral-200)] bg-white whitespace-nowrap flex-shrink-0 cursor-pointer"
                >
                  Inspect →
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

function AdminSystemManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "users";
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (message, type = "success") => setToastMsg({ message, type });

  return (
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4 sm:space-y-5">
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
      {activeTab === "removal-requests" && <AccountRequestsTab showToast={showToast} />}
      {activeTab === "security" && <SecurityTab showToast={showToast} />}
      {activeTab === "health" && <HealthTab showToast={showToast} />}

      {toastMsg && <Toast message={toastMsg.message} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
    </div>
  );
}

export {
  AdminSystemManagement as default,
};
