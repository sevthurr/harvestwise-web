import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { authApi } from "../../../../services/api";
const ProfileAvatar = ({ initials, src }) => {
  const fileRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(src || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await authApi.uploadProfilePicture(file);
      setAvatarSrc(res?.profile_picture_path || URL.createObjectURL(file));
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return <div className="relative flex-shrink-0 group">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--hw-green-700)] flex items-center justify-center">
        {avatarSrc ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-[22px] font-bold select-none">{initials}</span>}
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
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>;
};
export {
  ProfileAvatar
};
