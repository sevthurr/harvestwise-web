import { useNavigate } from "react-router";
import { MapPin, Phone, Mail, Check, Navigation, ShoppingBag } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { CommodityIllustration } from "../components/market/CommodityIllustrations";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";
const FARM = {
  city: "Davao City",
  district: "Marilog",
  barangay: "Buda",
  farmSize: "1,500 sq m",
  locationMode: "auto"
};
const CROPS = [
  { id: "kamatis", name: "Kamatis", variety: "Diamante Big" },
  { id: "ampalaya", name: "Ampalaya", variety: "Default" },
  { id: "lettuce", name: "Lettuce", variety: "Default" },
  { id: "talong", name: "Talong", variety: "Default" }
];
const SELLING = {
  method: "To a buyer using farmgate price",
  area: "Bangkerohan buyer"
};
function FarmerProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fullName = user?.name || "Juan Dela Cruz";
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const firstName = parts[0] || "";
  const lastName = parts[parts.length - 1] || "";
  return <div className="max-w-2xl mx-auto px-4 py-6 pb-6 md:pb-8 space-y-4">

      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-black">Profile</h1>
        <p className="text-[15px] text-black mt-0.5">Your personal and farm information</p>
      </div>

      {
    /* ── Section 1: Profile Header ── */
  }
      <Card>
        <div className="flex items-start gap-4">
          <ProfileAvatar initials={initials} />

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[20px] font-bold text-black leading-snug">{fullName}</p>
            <p className="text-[14px] text-black">Farmer</p>
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[13px] text-black truncate">
                {FARM.barangay}, {FARM.district} District, {FARM.city}
              </span>
            </div>
          </div>

          <button
    type="button"
    onClick={() => navigate("settings?tab=account")}
    className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0"
  >
            Edit Profile
          </button>
        </div>
      </Card>

      {
    /* ── Section 2: Personal Information ── */
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
              <Phone className="w-3.5 h-3.5 text-black" />
              <span className="text-[15px] text-black">09XX XXX XXXX</span>
            </div>
            <p className="text-[12px] text-black">Not verified</p>
          </div>

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-black" />
              <span className="text-[15px] text-black truncate">{user?.email || "juan@example.com"}</span>
            </div>
            <div className="flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-500" />
              <p className="text-[12px] text-emerald-600">Verified</p>
            </div>
          </div>
        </div>
      </Card>

      {
    /* ── Section 3: Farm Profile ── */
  }
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Farm Profile</SectionTitle>
          <button
    type="button"
    onClick={() => navigate("settings?tab=farm")}
    className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
  >
            Update
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="City" value={FARM.city} />
          <Field label="District" value={FARM.district} />
          <Field label="Barangay" value={FARM.barangay} />
          <Field label="Farm Size" value={FARM.farmSize} />
        </div>
        <div className="mt-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${FARM.locationMode === "auto" ? "bg-emerald-50 text-emerald-700" : "bg-[var(--hw-neutral-100)] text-black"}`}>
            <Navigation className="w-3 h-3" />
            {FARM.locationMode === "auto" ? "Location enabled" : "Manual location"}
          </span>
        </div>
      </Card>

      {
    /* ── Section 4: Crop Preferences ── */
  }
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Crop Preferences</SectionTitle>
          <button
    type="button"
    onClick={() => navigate("settings?tab=farm")}
    className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
  >
            Edit
          </button>
        </div>
        <div className="space-y-3">
          {CROPS.map((crop) => <div key={crop.id} className="flex items-center gap-3">
              <CommodityIllustration commodityId={crop.id} className="w-8 h-8 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-medium text-black">{crop.name}</p>
                <p className="text-[13px] text-black">{crop.variety}</p>
              </div>
            </div>)}
        </div>
      </Card>

      {
    /* ── Section 5: Selling Preference ── */
  }
      <Card>
        <SectionTitle>Selling Preference</SectionTitle>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <ShoppingBag className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Selling method</p>
              <p className="text-[15px] text-black mt-0.5">{SELLING.method}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-black mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Selling area / buyer type</p>
              <p className="text-[15px] text-black mt-0.5">{SELLING.area}</p>
            </div>
          </div>
        </div>
      </Card>

    </div>;
}
export {
  FarmerProfile as default
};
