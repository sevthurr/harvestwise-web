import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Mail, Loader2 } from "lucide-react";
import { useAuth } from "../../global/contexts/AuthContext";
import { useLanguage } from "../../global/contexts/LanguageContext";
import { PageHeader } from "../../global/components/shared/PageHeader";
import { CommodityIllustration, getCommodityIconKey } from "../../global/components/shared/CommodityIllustrations";
import { Card, SectionTitle, Field } from "../../global/components/ui/hw-ui";
import { ProfileAvatar } from "../../global/components/profile/ProfileAvatar";
import { toCamelCase } from "../../global/utils/apiTransforms";
import { fetchFarmerProfile } from "../../global/hooks/useFarmerPrefetch";
import { Skeleton, SkeletonFormCard } from "../components/shared/FarmerSkeletons";

function FarmerProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Shared farmer profile query (persisted to IndexedDB by the offline layer)
  const { data: rawProfile, isLoading: loading } = useQuery({
    queryKey: ["farmer", "profile"],
    queryFn: fetchFarmerProfile,
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  const profile = useMemo(() => (rawProfile ? toCamelCase(rawProfile) : null), [rawProfile]);

  // Compute display details from real profile / user data (no mock strings)
  const firstName = profile?.firstName || user?.firstName || "";
  const lastName = profile?.lastName || user?.lastName || "";
  const middleName = profile?.middleName || user?.middleName || "";
  const suffix = profile?.suffix || user?.suffix || "";

  const nameParts = [firstName, middleName, lastName, suffix].filter(Boolean);
  const fullName = nameParts.length > 0 ? nameParts.join(" ") : user?.name || t("farmer.navigation.farmer_role", {}, "Farmer");

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
  const purokSitio = profile?.purokSitio || profile?.purok_sitio || "";
  const street = profile?.street || "";

  const locationParts = [street, purokSitio, barangay, district, city].filter(Boolean);
  const locationDisplay = locationParts.length > 0 ? locationParts.join(", ") : "—";

  const preferredCrops = profile?.preferredCrops || [];

  if (loading) {
    return (
      <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-4">
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
    <div className="px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 pb-24 md:pb-8 max-w-[1440px] mx-auto space-y-3 sm:space-y-4">
      <PageHeader
        title={t("farmer.profile.title", {}, "Profile")}
        description={t("farmer.profile.subtitle", {}, "Your personal and farm information.")}
      />

      {/* ── Section 1: Profile Header ── */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex items-center xs:items-start gap-3 sm:gap-4 min-w-0 flex-1">
            <ProfileAvatar initials={initials} src={user?.profile_picture_path} alt={fullName} />

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-[17px] xs:text-[19px] sm:text-[20px] font-bold text-black leading-snug break-words">{fullName}</p>
              <p className="text-[13px] sm:text-[14px] text-[var(--hw-neutral-600)]">{t("farmer.navigation.farmer_role", {}, "Farmer")}</p>
              <div className="flex items-start gap-1.5 mt-1 sm:mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--hw-neutral-600)] flex-shrink-0 mt-0.5" />
                <span className="text-[12px] sm:text-[13px] text-black break-words leading-snug">{locationDisplay}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=account")}
            className="text-[12px] sm:text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline flex-shrink-0 whitespace-nowrap pt-0.5"
          >
            {t("farmer.profile.edit_in_settings", {}, "Edit Profile")}
          </button>
        </div>
      </Card>

      {/* ── Section 2: Personal Information ── */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <SectionTitle className="mb-0 text-[14px] sm:text-[16px] font-bold">{t("farmer.settings.personal_info", {}, "Personal Information")}</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=account")}
            className="text-[12px] sm:text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline whitespace-nowrap"
          >
            {t("common.edit", {}, "Edit")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-3.5 sm:gap-x-6 gap-y-3.5 sm:gap-y-5">
          <Field label={t("farmer.settings.first_name", {}, "First Name")} value={firstName || "—"} />
          <Field label={t("farmer.settings.last_name", {}, "Last Name")} value={lastName || "—"} />
          <Field label={t("farmer.settings.middle_name", {}, "Middle Name")} value={middleName || "—"} />
          <Field label="Suffix" value={suffix || "—"} />

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">{t("farmer.settings.phone_number", {}, "Phone Number")}</p>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
              <span className="text-[14px] sm:text-[15px] font-medium text-black break-words">{phone}</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 space-y-0.5">
            <p className="text-[11px] sm:text-[12px] font-semibold text-[var(--hw-neutral-600)] uppercase tracking-wide">{t("farmer.settings.email_address", {}, "Email")}</p>
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-3.5 h-3.5 text-[var(--hw-neutral-700)] flex-shrink-0" />
              <span className="text-[14px] sm:text-[15px] font-medium text-black truncate">{email}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Section 3: Farm Profile ── */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <SectionTitle className="mb-0 text-[14px] sm:text-[16px] font-bold">{t("farmer.settings.farm_location", {}, "Farm Location")}</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=farm")}
            className="text-[12px] sm:text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline whitespace-nowrap"
          >
            {t("common.edit", {}, "Edit")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-3.5 sm:gap-x-6 gap-y-3 sm:gap-y-4">
          <Field label={t("onboarding.barangay", {}, "Barangay")} value={barangay || "—"} />
          <Field label={t("onboarding.district", {}, "District")} value={district || "—"} />
          <Field label={t("onboarding.city", {}, "City")} value={city || "—"} />
          {purokSitio ? <Field label={t("onboarding.purok_sitio", {}, "Purok / Sitio")} value={purokSitio} /> : null}
          {street ? <Field label={t("onboarding.street", {}, "Street")} value={street} /> : null}
        </div>
      </Card>

      {/* ── Section 4: Crop Preferences ── */}
      <Card className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <SectionTitle className="mb-0 text-[14px] sm:text-[16px] font-bold">{t("farmer.settings.preferred_crops", {}, "Preferred Crops")}</SectionTitle>
          <button
            type="button"
            onClick={() => navigate("/farmer/settings?tab=farm")}
            className="text-[12px] sm:text-[13px] font-semibold text-[var(--hw-green-700)] hover:underline whitespace-nowrap"
          >
            {t("common.edit", {}, "Edit")}
          </button>
        </div>
        {preferredCrops.length === 0 ? (
          <p className="text-[13px] sm:text-[14px] text-[var(--hw-neutral-500)] italic py-1">No preferred crops selected.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
            {preferredCrops.map((crop) => {
              const name = crop.commodityName || crop.name || "Crop";
              const variety = crop.varietyName || "Default";
              const iconKey = getCommodityIconKey(crop.commodityId, null, name);
              return (
                <div key={crop.id || crop.commodityId || name} className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--hw-neutral-50)] border border-[var(--hw-neutral-100)]">
                  <CommodityIllustration commodityId={iconKey || crop.commodityId} className="w-8 h-8 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] sm:text-[15px] font-medium text-black truncate">{name}</p>
                    <p className="text-[12px] sm:text-[13px] text-[var(--hw-neutral-600)] truncate">{variety}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export { FarmerProfile as default };
