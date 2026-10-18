import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { authApi } from "../../../../services/api";
import { resolveMediaUrl } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { AvatarCropper } from "./AvatarCropper";
import { UserAvatar } from "./UserAvatar";

const MAX_BYTES = 5 * 1024 * 1024;

const ProfileAvatar = ({ initials, src, alt = "Profile" }) => {
  const { refreshUser, patchUser } = useAuth();
  const fileRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(() => resolveMediaUrl(src));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState(null);

  const resetInput = () => {
    if (fileRef.current) fileRef.current.value = "";
  };

  // Picking a file only opens the cropper — nothing is uploaded until confirmed.
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError("Image is larger than 5MB.");
      resetInput();
      return;
    }
    setError("");
    setPendingFile(file);
  };

  const handleCancelCrop = () => {
    setPendingFile(null);
    resetInput();
  };

  const handleConfirmCrop = async (cropped) => {
    setPendingFile(null);
    resetInput();
    setUploading(true);
    setError("");
    try {
      const res = await authApi.uploadProfilePicture(cropped);
      // Cloudinary is the only backend, so this is always an absolute HTTPS URL.
      const stored = res?.profile_picture_path ?? null;
      setAvatarSrc(resolveMediaUrl(stored));

      // Write the path into the shared user object directly. The upload
      // response already carries it, and every avatar in the app — the topnav
      // circle in all three role layouts included — reads it from there, so
      // making them wait on the refreshUser() round-trip below meant the new
      // picture stayed invisible everywhere except this circle whenever that
      // request was slow, failed, or answered from a stale cache.
      if (stored) await patchUser({ profile_picture_path: stored });

      // Still refresh, so the session snapshot, IndexedDB cache, and anything
      // the server derived line up with what was just stored. This is
      // reconciliation, not the update path: failure here is not an upload
      // failure — the picture is already stored — so it must not surface an
      // error over a successful save.
      try {
        await refreshUser();
      } catch {
        /* keep the locally-set avatar; the next sign-in picks it up */
      }
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return <div className="relative flex-shrink-0 group">
      <UserAvatar
        src={avatarSrc}
        initials={initials}
        alt={alt}
        className="w-16 h-16"
        textClassName="text-[22px]"
      />
      <button
    type="button"
    onClick={() => fileRef.current?.click()}
    disabled={uploading}
    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    aria-label="Change profile photo"
  >
        <Camera className="w-5 h-5 text-white" />
      </button>
      {uploading && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-[var(--hw-green-700)] bg-white rounded-full px-1.5 py-0.5 border border-[var(--hw-neutral-200)] whitespace-nowrap">Uploading…</span>}
      {error && <span className="absolute -bottom-4 left-0 text-[10px] text-red-600 font-medium whitespace-nowrap">{error}</span>}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleChange} />
      {pendingFile && (
        <AvatarCropper
          file={pendingFile}
          onCancel={handleCancelCrop}
          onConfirm={handleConfirmCrop}
        />
      )}
    </div>;
};

export {
  ProfileAvatar
};
