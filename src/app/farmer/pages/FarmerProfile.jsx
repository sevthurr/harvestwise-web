import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { MapPin, Phone, Mail, Navigation, Loader2 } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";
import { apiGet, parseResponse } from "../../global/api";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { Skeleton, SkeletonFormCard } from "../components/shared/FarmerSkeletons";

function FarmerProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        setLoading(true);
        const res = await apiGet("/farmer/profile");
        if (res.ok && active) {
          const data = await parseResponse(res);
          setProfile(toCamelCase(data));
        }
      } catch (err) {
        console.warn("Failed to load farmer profile:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  // Compute display details from real profile / user data (no mock strings)
  const firstName = profile?.firstName || user?.firstName || "";
  const lastName = profile?.lastName || user?.lastName || "";
  const middleName = profile?.middleName || user?.middleName || "";
  const suffix = profile?.suffix || user?.suffix || "";

  const nameParts = [firstName, middleName, lastName, suffix].filter(Boolean);
  const fullName = nameParts.length > 0 ? nameParts.join(" ") : user?.name || "Farmer";

  const initials = fullName
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "F";

  const phone = profile?.phone || user?.phone || "—";
  const email = profile?.email || user?.email || "—";

  const city = profile?.city || "";
  const district = profile?.district || "";
  const barangay = profile?.barangay || "";
  const farmSize = profile?.farmSize != null ? `${profile.farmSize} sq m` : "—";

  const locationParts = [barangay, district ? `${district} District` : "", city].filter(Boolean);
  const locationDisplay = locationParts.length > 0 ? locationParts.join(", ") : "—";

  const preferredCrops = profile?.preferredCrops || [];
  const primarySellingMethod = profile?.sellingMethods?.[0]?.label || "—";
  const usualSellingArea = profile?.usualSellingAreaOrBuyer || "—";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 pb-6 md:pb-8 space-y-4">
        <div className="space-y-1 mb-2">
          <Skeleton className="h-7 w-32 rounded" />
          <Skeleton className="h-4 w-60 rounded" />
        </div>
        <div className="bg-white rounded-2xl border border-[var(--hw-neutral-200)] shadow-[var(--shadow-xs)] p-4 flex items-center gap-4 animate-pulse">
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </div>
        <SkeletonFormCard />
        <SkeletonFormCard />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-6 md:pb-8 space-y-4">
      <div className="mb-2">
        <h1 className="text-[22px] font-bold text-black">Profile</h1>
        <p className="text-[15px] text-black mt-0.5">Your personal and farm information</p>
      </div>

      {/* ── Section 1: Profile Header ── */}
      <Card>
        <div className="flex items-start gap-4">
          <ProfileAvatar initials={initials} />

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[20px] font-bold text-black leading-snug">{fullName}</p>
            <p className="text-[14px] text-[var(--hw-neutral-600)]">Farmer</p>
            <div className="flex items-center gap-1 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-black flex-shrink-0" />
              <span className="text-[13px] text-black truncate">{locationDisplay}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=account")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0"
          >
            Edit Profile
          </button>
        </div>
      </Card>

      {/* ── Section 2: Personal Information ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Personal Information</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=account")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Field label="First Name" value={firstName || "—"} />
          <Field label="Last Name" value={lastName || "—"} />
          <Field label="Middle Name" value={middleName || "—"} />
          <Field label="Suffix" value={suffix || "—"} />

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Phone Number</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-black" />
              <span className="text-[15px] text-black">{phone}</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[12px] font-semibold text-black uppercase tracking-wide">Email</p>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-black" />
              <span className="text-[15px] text-black truncate">{email}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 3: Farm Profile ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Farm Profile</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=farm")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
          >
            Update
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="City" value={city || "—"} />
          <Field label="District" value={district || "—"} />
          <Field label="Barangay" value={barangay || "—"} />
          <Field label="Farm Size" value={farmSize} />
        </div>
        <div className="mt-4">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-medium ${
            profile?.latitude && profile?.longitude
              ? "bg-emerald-50 text-emerald-700"
              : "bg-[var(--hw-neutral-100)] text-black"
          }`}>
            <Navigation className="w-3 h-3" />
            {profile?.latitude && profile?.longitude ? "Location enabled" : "Manual location"}
          </span>
        </div>
      </Card>

      {/* ── Section 4: Crop Preferences ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Crop Preferences</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=farm")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
          >
            Edit
          </button>
        </div>
        {preferredCrops.length === 0 ? (
          <p className="text-[14px] text-[var(--hw-neutral-500)] italic py-1">No preferred crops selected.</p>
        ) : (
          <div className="space-y-3">
            {preferredCrops.map((crop) => {
              const name = crop.commodityName || crop.name || "Crop";
              const variety = crop.varietyName || "Default";
              const iconKey = getCommodityIconKey(crop.commodityId, null, name);
              return (
                <div key={crop.id || crop.commodityId || name} className="flex items-center gap-3">
                  <CommodityIllustration commodityId={iconKey || crop.commodityId} className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-medium text-black">{name}</p>
                    <p className="text-[13px] text-[var(--hw-neutral-600)]">{variety}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Section 5: Selling Preference ── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle>Selling Preference</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=farm")}
            className="text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline -mt-4"
          >
            Edit
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <Field label="Selling Method" value={primarySellingMethod} />
          <Field label="Usual Selling Area / Buyer" value={usualSellingArea} />
        </div>
      </Card>
    </div>
  );
}

export { FarmerProfile as default };
