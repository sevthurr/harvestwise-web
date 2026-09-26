import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { authApi } from "../../../../services/api";
import { resolveMediaUrl } from "../../api";
import { AvatarCropper } from "./AvatarCropper";

const MAX_BYTES = 5 * 1024 * 1024;

const ProfileAvatar = ({ initials, src, alt = "Profile" }) => {
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
      // Backend returns the stored location (Cloudinary URL or /media path).
      setAvatarSrc(resolveMediaUrl(res?.profile_picture_path));
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return <div className="relative flex-shrink-0 group">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--hw-green-700)] flex items-center justify-center">
        {avatarSrc
          ? <img src={avatarSrc} alt={alt} className="w-full h-full object-cover" />
          : <span className="text-white text-[22px] font-bold select-none">{initials}</span>}
      </div>
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
