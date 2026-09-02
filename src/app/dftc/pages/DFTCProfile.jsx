import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, Check, Loader2 } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";
import { apiGet, parseResponse } from "../../global/api";

function formatDateTime(isoStr) {
  if (!isoStr) return "—";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${timeStr}`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + `, ${timeStr}`;
  } catch {
    return isoStr;
  }
}

function DFTCProfile() {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();

  const { data: meData, isLoading } = useQuery({
    queryKey: ["auth-me-profile"],
    queryFn: async () => {
      try {
        const res = await apiGet("/auth/me");
        return parseResponse(res);
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000
  });

  const user = meData || authUser;
  const staff = user?.staff_profile || user?.staffProfile || {};

  const firstName = staff.first_name || user?.first_name || "";
  const lastName = staff.last_name || user?.last_name || "";
  const middleName = staff.middle_name || null;
  const suffix = staff.suffix || null;

  const fullName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ") || user?.name || user?.username || "—";

  const initials = (firstName || lastName)
    ? `${(firstName[0] || "").toUpperCase()}${(lastName[0] || "").toUpperCase()}`
    : (user?.username ? user.username.slice(0, 2).toUpperCase() : "—");

  const phone = user?.phone || "—";
  const isPhoneVerified = !!user?.phone_verified_at;
  const email = user?.email || "—";
  const isEmailVerified = !!user?.email_verified_at;
  const roleName = user?.role?.role_name || user?.role || "DFTC";
  const position = staff.position_title || user?.position || "—";
  const accountStatus = user?.is_active === false ? "Inactive" : "Active";
  const lastLogin = formatDateTime(user?.last_login_at || user?.last_login || user?.created_at);

  if (isLoading && !user) {
    return (
      <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
        <PageHeader title="Profile" description="Your account and submission overview." />
        <Card>
          <div className="py-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--hw-green-700)]" />
            <p className="text-[14px] text-[var(--hw-neutral-500)] mt-2">Loading profile...</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-8 lg:px-10 py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-4">
      <PageHeader
        title="Profile"
        description="Your account and submission overview."
      />

      {/* ── Card 1: Profile Header ── */}
      <Card>
        <div className="relative flex items-start gap-4">
          <ProfileAvatar initials={initials} />

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[20px] font-bold text-black leading-snug">{fullName}</p>
            <p className="text-[14px] text-black">{roleName}</p>
            <p className="text-[13px] text-black mt-0.5">Davao Food Terminal Complex</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/dftc/settings?tab=account")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0 cursor-pointer"
          >
            Edit Profile
          </button>
        </div>
      </Card>

      {/* ── Card 2: Personal Information ── */}
      <Card>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="First Name" value={firstName || "—"} />
          <Field label="Last Name" value={lastName || "—"} />
          <Field label="Middle Name" value={middleName || "—"} />
          <Field label="Suffix" value={suffix || "—"} />

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Phone Number</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[15px] text-black">{phone}</span>
            </div>
            {phone !== "—" ? (
              isPhoneVerified ? (
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <p className="text-[12px] text-emerald-600">Verified</p>
                </div>
              ) : (
                <p className="text-[12px] text-[var(--hw-neutral-500)]">Not verified</p>
              )
            ) : null}
          </div>

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[15px] text-black truncate">{email}</span>
            </div>
            {email !== "—" ? (
              isEmailVerified ? (
                <div className="flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-500" />
                  <p className="text-[12px] text-emerald-600">Verified</p>
                </div>
              ) : (
                <p className="text-[12px] text-[var(--hw-neutral-500)]">Not verified</p>
              )
            ) : null}
          </div>

          <div className="col-span-2 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Role</p>
            <p className="text-[15px] text-black">{roleName}</p>
          </div>

          <div className="col-span-2 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Position</p>
            <p className="text-[15px] text-black">{position}</p>
          </div>
        </div>
      </Card>

      {/* ── Card 3: Work Information ── */}
      <Card>
        <SectionTitle>Work Information</SectionTitle>
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          {[
            { label: "Organization", value: "Davao Food Terminal Complex" },
            { label: "Account status", value: accountStatus },
            { label: "Last login", value: lastLogin }
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-3">
              <span className="text-[14px] font-semibold text-black">{row.label}</span>
              <span className="text-[14px] text-black">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export { DFTCProfile as default };
