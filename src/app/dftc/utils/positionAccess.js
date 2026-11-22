const PRIVILEGED_POSITIONS = new Set(["acting section head", "division chief"]);

function normalizedPositions(user) {
  const staff = user?.staff_profile || user?.staffProfile || {};
  return [user?.position, user?.position_title, user?.position_name, staff.position_name, staff.position_title]
    .map((position) => String(position ?? "").trim().toLowerCase())
    .filter(Boolean);
}

export function isPrivilegedDftcPosition(user) {
  if (!user) return false;
  return normalizedPositions(user).some((position) =>
    PRIVILEGED_POSITIONS.has(position) ||
    position.includes("acting section head") ||
    position.includes("section head") ||
    position.includes("division chief") ||
    position.includes("chief")
  );
}

export function isReviewerStaff(staff) {
  if (!staff) return false;
  const role = String(staff.role || staff.position_title || staff.position_name || staff.position || "").trim().toLowerCase();
  return (
    PRIVILEGED_POSITIONS.has(role) ||
    role.includes("acting section head") ||
    role.includes("section head") ||
    role.includes("division chief") ||
    role.includes("chief")
  );
}
