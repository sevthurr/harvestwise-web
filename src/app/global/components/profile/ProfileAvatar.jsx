import { useRef, useState } from "react";
import { Camera } from "lucide-react";
const ProfileAvatar = ({ initials }) => {
  const fileRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState(null);
  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarSrc(URL.createObjectURL(file));
  };
  return <div className="relative flex-shrink-0 group">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-[var(--hw-green-700)] flex items-center justify-center">
        {avatarSrc ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" /> : <span className="text-white text-[22px] font-bold select-none">{initials}</span>}
      </div>
      <button
    type="button"
    onClick={() => fileRef.current?.click()}
    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    aria-label="Change profile photo"
  >
        <Camera className="w-5 h-5 text-white" />
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>;
};
export {
  ProfileAvatar
};
