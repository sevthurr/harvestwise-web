const PRIVILEGED_POSITIONS = new Set(["acting section head", "division chief"]);

function normalizedPositions(user) {
  const staff = user?.staff_profile || user?.staffProfile || {};
  return [user?.position, staff.position_name, staff.position_title]
    .map((position) => String(position ?? "").trim().toLowerCase())
    .filter(Boolean);
}

export function isPrivilegedDftcPosition(user) {
  return normalizedPositions(user).some((position) => PRIVILEGED_POSITIONS.has(position));
}
