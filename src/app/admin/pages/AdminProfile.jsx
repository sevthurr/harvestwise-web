import { useNavigate } from "react-router";
import { Phone, Mail, Check, AlertCircle } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";

function extractRoleName(role, fallback = "Admin") {
  if (!role) return fallback;
  if (typeof role === "string") return role;
  if (typeof role === "object") {
    return role.role_name || role.name || role.roleName || fallback;
  }
  return fallback;
}

function getInitials(firstName, lastName) {
  const f = typeof firstName === "string" ? firstName.trim() : "";
  const l = typeof lastName === "string" ? lastName.trim() : "";
  if (f && l) {
    return `${f.charAt(0)}${l.charAt(0)}`.toUpperCase();
  }
  if (f) {
    return f.charAt(0).toUpperCase();
  }
  return "HA";
}

function formatFullName(first, middle, last, suffix) {
  const parts = [];
  if (typeof first === "string" && first.trim()) parts.push(first.trim());
  if (typeof middle === "string" && middle.trim()) parts.push(middle.trim());
  if (typeof last === "string" && last.trim()) parts.push(last.trim());
  if (typeof suffix === "string" && suffix.trim() && suffix !== "None" && suffix !== "—") {
    parts.push(suffix.trim());
  }
  return parts.length > 0 ? parts.join(" ") : "HarvestWise Admin";
}

function AdminProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const staff = user?.staff_profile || user?.staffProfile || {};
  const firstName = staff?.first_name || staff?.firstName || user?.first_name || user?.firstName || "";
  const lastName = staff?.last_name || staff?.lastName || user?.last_name || user?.lastName || "";
  const middleName = staff?.middle_name || staff?.middleName || user?.middle_name || user?.middleName || "";
  const suffix = staff?.suffix || user?.suffix || "";

  const phone = typeof user?.phone === "string" ? user.phone : "";
  const email = typeof user?.email === "string" ? user.email : "";

  const rawRole = user?.role_name || user?.role || user?.roleName || user?.roles;
  const roleName = extractRoleName(rawRole, "Admin");

  const lastLogin = typeof user?.lastLogin === "string" ? user.lastLogin : typeof user?.last_login === "string" ? user.last_login : "-";

  const initials = getInitials(firstName, lastName);
  const displayName = formatFullName(firstName, middleName, lastName, suffix);

  const phoneVerified = Boolean(user?.phone_verified_at || user?.phoneVerifiedAt || user?.phoneVerified);
  const emailVerified = Boolean(
    user?.email_verified_at ||
    user?.emailVerifiedAt ||
    user?.emailVerified ||
    (email && user?.email_verified !== false && user?.emailVerified !== false)
  );

  const isActiveValue = user?.is_active !== undefined ? user.is_active : user?.isActive;
  const accountStatus = isActiveValue !== undefined ? (isActiveValue ? "Active" : "Inactive") : "Active";

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-5">
      <PageHeader
        title="Profile"
        description="Your admin account and access information."
      />

      {/* ── Card 1: Profile Header ── */}
      <Card>
        <div className="relative flex items-start gap-4">
          <ProfileAvatar initials={initials} src={user?.profilePictureUrl || user?.profile_picture_path} />

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[20px] font-bold text-[var(--hw-neutral-900)] leading-snug">{displayName}</p>
            <p className="text-[14px] text-[var(--hw-neutral-600)]">{roleName}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/admin/settings?tab=account")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>
      </Card>

      {/* ── Card 2: Personal Information ── */}
      <Card>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
          <Field label="First Name" value={firstName || "-"} />
          <Field label="Last Name" value={lastName || "-"} />
          <Field label="Middle Name" value={middleName || "—"} />
          <Field label="Suffix" value={suffix && suffix !== "None" ? suffix : "—"} />

          {/* Phone Number */}
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Phone Number</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--hw-neutral-500)] flex-shrink-0" />
              <span className="text-[14px] text-[var(--hw-neutral-900)] font-medium">
                {phone || "-"}
              </span>
            </div>
            {!phone ? (
              <p className="text-[12px] text-[var(--hw-neutral-500)]">No phone number</p>
            ) : phoneVerified ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                <p className="text-[12px] font-medium">Verified</p>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <p className="text-[12px] font-medium">Not verified</p>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1">
            <p className="text-[12px] font-semibold text-[var(--hw-neutral-700)] uppercase tracking-wide">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[var(--hw-neutral-500)] flex-shrink-0" />
              <span className="text-[14px] text-[var(--hw-neutral-900)] font-medium truncate">
                {email || "-"}
              </span>
            </div>
            {!email ? (
              <p className="text-[12px] text-[var(--hw-neutral-500)]">No email address</p>
            ) : emailVerified ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <Check className="w-3.5 h-3.5" />
                <p className="text-[12px] font-medium">Verified</p>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <p className="text-[12px] font-medium">Not verified</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Card 3: Work / Access Information ── */}
      <Card>
        <SectionTitle>Work / Access Information</SectionTitle>
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          {[
            { label: "Role", value: roleName },
            { label: "Account status", value: accountStatus },
            { label: "Last login", value: lastLogin }
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <span className="text-[14px] font-medium text-[var(--hw-neutral-600)]">{row.label}</span>
              <span className="text-[14px] font-semibold text-[var(--hw-neutral-900)]">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export { AdminProfile as default };
