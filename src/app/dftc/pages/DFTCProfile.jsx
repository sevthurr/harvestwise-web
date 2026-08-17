import { useNavigate } from "react-router";
import { Phone, Mail, Check } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";
function DFTCProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.name || "Maria Santos";
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";
  return <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-4">

      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-black">Profile</h1>
        <p className="text-[15px] text-black mt-0.5">Your account and submission overview</p>
      </div>

      {
    /* ── Card 1: Profile Header ── */
  }
      <Card>
        <div className="relative flex items-start gap-4">
          <ProfileAvatar initials={initials} />

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[20px] font-bold text-black leading-snug">{fullName}</p>
            <p className="text-[14px] text-black">DFTC</p>
            <p className="text-[13px] text-black mt-0.5">Davao Food Terminal Complex</p>
          </div>

          <button
    type="button"
    onClick={() => navigate("/dftc/settings?tab=account")}
    className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0"
  >
            Edit Profile
          </button>
        </div>
      </Card>

      {
    /* ── Card 2: Personal Information ── */
  }
      <Card>
        <SectionTitle>Personal Information</SectionTitle>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="First Name" value={firstName} />
          <Field label="Last Name" value={lastName} />
          <Field label="Middle Name" value="—" />
          <Field label="Suffix" value="—" />

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Phone Number</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[15px] text-black">09XX XXX XXXX</span>
            </div>
            <p className="text-[12px] text-black">Not verified</p>
          </div>

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[15px] text-black truncate">{user?.email || "maria@dftc.gov.ph"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <p className="text-[12px] text-emerald-600">Verified</p>
            </div>
          </div>

          <div className="col-span-2 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Role</p>
            <p className="text-[15px] text-black">DFTC</p>
          </div>

          <div className="col-span-2 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Position</p>
            <p className="text-[15px] text-black">Market Monitoring Staff</p>
          </div>
        </div>
      </Card>

      {
    /* ── Card 3: Work Information ── */
  }
      <Card>
        <SectionTitle>Work Information</SectionTitle>
        <div className="divide-y divide-[var(--hw-neutral-100)]">
          {[
    { label: "Organization", value: "Davao Food Terminal Complex" },
    { label: "Account status", value: "Active" },
    { label: "Last login", value: "Today, 8:00 AM" }
  ].map((row) => <div key={row.label} className="flex items-center justify-between py-3">
              <span className="text-[14px] font-semibold text-black">{row.label}</span>
              <span className="text-[14px] text-black">{row.value}</span>
            </div>)}
        </div>
      </Card>

    </div>;
}
export {
  DFTCProfile as default
};
