import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ChevronLeft, ChevronDown, Inbox } from "lucide-react";
import {
  Card,
  SectionLabel,
  FieldLabel,
  GreenBtn,
  GhostBtn,
  Toast,
  Modal,
  inputCls,
  SUFFIX_OPTIONS
} from "../../global/components/ui/hw-ui";
import { adminApi } from "../../../services/api";

const EditForm = ({ user, onSave, onCancel }) => {
  const [form, setForm] = useState({
    firstName: user?.first_name || "",
    middleName: user?.middle_name || "",
    lastName: user?.last_name || "",
    suffix: user?.suffix || "None",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.roleName || "Farmer",
    status: user?.is_active ? "Active" : "Inactive",
    position: user?.position || ""
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = () => {
    onSave({
      ...user,
      first_name: form.firstName,
      middle_name: form.middleName || null,
      last_name: form.lastName,
      suffix: form.suffix === "None" ? null : form.suffix,
      email: form.email || null,
      phone: form.phone || null,
      roleName: form.role,
      is_active: form.status === "Active",
      name: `${form.firstName} ${form.lastName}`.trim(),
      position: form.position
    });
  };

  return (
    <Card>
      <SectionLabel>Edit Account</SectionLabel>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="ud-fn">First Name</FieldLabel>
            <input id="ud-fn" type="text" value={form.firstName} onChange={set("firstName")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="ud-ln">Last Name</FieldLabel>
            <input id="ud-ln" type="text" value={form.lastName} onChange={set("lastName")} className={inputCls} />
          </div>
          <div>
            <FieldLabel htmlFor="ud-mn" optional>
              Middle Name
            </FieldLabel>
            <input
              id="ud-mn"
              type="text"
              value={form.middleName}
              onChange={set("middleName")}
              placeholder="Optional"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel htmlFor="ud-sfx" optional>
              Suffix
            </FieldLabel>
            <div className="relative">
              <select id="ud-sfx" value={form.suffix} onChange={set("suffix")} className={`${inputCls} appearance-none pr-9`}>
                {SUFFIX_OPTIONS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
        </div>

        <div>
          <FieldLabel htmlFor="ud-ph">Phone Number</FieldLabel>
          <input id="ud-ph" type="tel" value={form.phone} onChange={set("phone")} className={inputCls} />
        </div>

        <div>
          <FieldLabel htmlFor="ud-em">Email</FieldLabel>
          <input id="ud-em" type="email" value={form.email} onChange={set("email")} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel htmlFor="ud-role">Role</FieldLabel>
            <div className="relative">
              <select id="ud-role" value={form.role} onChange={set("role")} className={`${inputCls} appearance-none pr-9`}>
                {["Farmer", "DFTC"].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black pointer-events-none" />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="ud-status">Status</FieldLabel>
            <div className="relative">
              <select id="ud-status" value={form.status} onChange={set("status")} className={`${inputCls} appearance-none pr-9`}>
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
            <FieldLabel htmlFor="ud-pos" optional>
              Position
            </FieldLabel>
            <input
              id="ud-pos"
              type="text"
              value={form.position}
              onChange={set("position")}
              placeholder="e.g. Market Monitoring Staff"
              className={inputCls}
            />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
          <GreenBtn onClick={handleSave}>Save changes</GreenBtn>
        </div>
      </div>
    </Card>
  );
};

function AdminUserDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [disableModal, setDisableModal] = useState(false);
  const [enableModal, setEnableModal] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    adminApi
      .getUser(userId)
      .then((u) => {
        if (!active) return;
        setUser({
          ...u,
          roleName: u.role?.role_name,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim(),
        });
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-16 max-w-[1440px] mx-auto text-center space-y-3">
        <p className="text-[15px] font-semibold text-black">Loading user account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-16 max-w-[1440px] mx-auto text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-[var(--hw-neutral-100)] border border-[var(--hw-neutral-200)] flex items-center justify-center text-[var(--hw-neutral-400)] mx-auto">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-[15px] font-semibold text-black">User account not found.</p>
        <p className="text-[13px] text-[var(--hw-neutral-500)]">The requested user record does not exist or has been removed.</p>
        <button
          type="button"
          onClick={() => navigate("/admin/system")}
          className="inline-flex items-center gap-1.5 text-[var(--hw-green-700)] text-[13px] font-semibold hover:underline cursor-pointer pt-2"
        >
          ← Back to User Accounts
        </button>
      </div>
    );
  }

  const handleSaveEdit = async (updated) => {
    try {
      await adminApi.updateUser(userId, {
        first_name: updated.first_name,
        last_name: updated.last_name,
        middle_name: updated.middle_name,
        suffix: updated.suffix,
        email: updated.email,
        phone: updated.phone,
        role: updated.roleName,
        is_active: updated.is_active,
      });
      setUser(updated);
      setEditing(false);
      showToast("User account updated successfully.");
    } catch (err) {
      showToast(err.message || "Failed to update user.");
    }
  };

  const handleDisable = async () => {
    try {
      await adminApi.updateUser(userId, { is_active: false });
      setUser((u) => (u ? { ...u, is_active: false, status: "Inactive" } : u));
      setDisableModal(false);
      showToast("Account disabled successfully.");
    } catch (err) {
      showToast(err.message || "Failed to disable account.");
      setDisableModal(false);
    }
  };

  const handleEnable = async () => {
    try {
      await adminApi.updateUser(userId, { is_active: true });
      setUser((u) => (u ? { ...u, is_active: true, status: "Active" } : u));
      setEnableModal(false);
      showToast("Account enabled successfully.");
    } catch (err) {
      showToast(err.message || "Failed to enable account.");
      setEnableModal(false);
    }
  };

  const infoRow = (label, value) => (
    <div key={label} className="flex items-start justify-between py-3 gap-4">
      <span className="text-[14px] font-semibold text-black flex-shrink-0">{label}</span>
      <span className="text-[14px] text-black text-right">{value || "—"}</span>
    </div>
  );

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate("/admin/system")}
        className="flex items-center gap-1.5 text-[14px] text-black hover:text-[var(--hw-green-700)] transition-colors cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to User Accounts
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-black">{user.name || "User Details"}</h1>
          <p className="text-[15px] text-black mt-0.5">
            {user.roleName || "-"} · {user.is_active ? "Active" : "Inactive"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {!editing && <GhostBtn onClick={() => setEditing(true)}>Edit</GhostBtn>}
          {user.is_active ? (
            <button
              type="button"
              onClick={() => setDisableModal(true)}
              className="h-11 px-5 flex items-center text-[14px] font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
            >
              Disable account
            </button>
          ) : (
            <GreenBtn onClick={() => setEnableModal(true)}>Enable account</GreenBtn>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && <EditForm user={user} onSave={handleSaveEdit} onCancel={() => setEditing(false)} />}

      {/* Account Information */}
      {!editing && (
        <Card>
          <SectionLabel>Account Information</SectionLabel>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {infoRow("First Name", user.first_name || "-")}
            {infoRow("Middle Name", user.middle_name || "—")}
            {infoRow("Last Name", user.last_name || "-")}
            {infoRow("Suffix", user.suffix && user.suffix !== "None" ? user.suffix : "—")}
            {infoRow("Email", user.email || "-")}
            {infoRow("Phone Number", user.phone || "-")}
            {infoRow("Role", user.roleName || "-")}
            {infoRow("Status", user.is_active ? "Active" : "Inactive")}
          </div>
        </Card>
      )}

      {/* Access Information */}
      {!editing && (
        <Card>
          <SectionLabel>Access Information</SectionLabel>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {infoRow("Role", user.roleName || "-")}
            {infoRow("Account status", user.is_active ? "Active" : "Inactive")}
            {infoRow("Date created", user.created_at ? new Date(user.created_at).toLocaleDateString("en-PH") : "-")}
          </div>
        </Card>
      )}

      {/* Role-specific Information */}
      {!editing && user.roleName === "Farmer" && (
        <Card>
          <SectionLabel>Farm Information</SectionLabel>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {infoRow("Farm size", user.farmSize || "—")}
          </div>
        </Card>
      )}

      {!editing && user.roleName === "DFTC" && (
        <Card>
          <SectionLabel>DFTC Information</SectionLabel>
          <div className="divide-y divide-[var(--hw-neutral-100)]">
            {infoRow("Organization", "Davao Food Terminal Complex")}
            {infoRow("Position", user.position || "—")}
          </div>
        </Card>
      )}

      {/* Disable modal */}
      {disableModal && (
        <Modal title="Disable account?" onClose={() => setDisableModal(false)}>
          <p className="text-[14px] text-black mb-5">
            This user will no longer be able to access HarvestWise until the account is enabled again.
          </p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setDisableModal(false)}>Cancel</GhostBtn>
            <button
              type="button"
              onClick={handleDisable}
              className="h-11 px-5 flex items-center bg-red-600 text-white text-[14px] font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              Disable account
            </button>
          </div>
        </Modal>
      )}

      {/* Enable modal */}
      {enableModal && (
        <Modal title="Enable account?" onClose={() => setEnableModal(false)}>
          <p className="text-[14px] text-black mb-5">This user will be able to access HarvestWise again.</p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setEnableModal(false)}>Cancel</GhostBtn>
            <GreenBtn onClick={handleEnable}>Enable account</GreenBtn>
          </div>
        </Modal>
      )}

      {toast && <Toast msg={toast} onDismiss={() => setToast("")} />}
    </div>
  );
}

export { AdminUserDetails as default };
