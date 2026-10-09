import { useState } from "react";
import { resolveMediaUrl } from "../../api";

/**
 * Presentational avatar circle: the uploaded picture when there is one,
 * otherwise the user's initials on the brand-green background.
 *
 * `src` is the raw stored value (`user.profile_picture_path`), so callers never
 * pre-resolve it. resolveMediaUrl returns null for the legacy "/media/..."
 * rows written before the local-disk backend was removed — those fall back to
 * initials here with no extra branching at the call site.
 *
 * A failed load also falls back to initials instead of leaving a broken image
 * icon: the asset may have been deleted from Cloudinary, or the device may be
 * offline with nothing cached. Only the URL that actually failed is remembered,
 * so replacing the picture (every upload yields a new Cloudinary URL) retries
 * the image instead of staying stuck on initials.
 */
const UserAvatar = ({
  src,
  initials = "",
  alt = "Profile",
  className = "w-7 h-7",
  textClassName = "text-xs",
}) => {
  const url = resolveMediaUrl(src);
  const [failedUrl, setFailedUrl] = useState(null);
  const showImage = Boolean(url) && failedUrl !== url;

  return (
    <div
      className={`rounded-full overflow-hidden bg-[var(--hw-green-700)] flex items-center justify-center flex-shrink-0 ${className}`}
    >
      {showImage ? (
        <img
          src={url}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setFailedUrl(url)}
        />
      ) : (
        <span className={`text-white font-bold select-none ${textClassName}`}>{initials}</span>
      )}
    </div>
  );
};

export {
  UserAvatar
};