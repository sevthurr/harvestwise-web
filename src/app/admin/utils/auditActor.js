/**
 * auditActor.js
 *
 * Single formatter for how an audit row identifies its actor.
 *
 * The PDF export and the on-screen table must agree, so both read from here
 * instead of each re-deriving the string.
 */

/**
 * Render an actor as "<Full Name> (<USER-ID>)" — for example
 * "Kaye Mayugba (USR-0007)".
 *
 * Falls back to whichever half is known (a deleted user can still leave a
 * dangling user_id), then to "System" for rows with no actor at all — API
 * syncs, weather backfills and cron writes carry a null user_id, and an
 * em dash there would read as missing data rather than a real actor.
 *
 * @param {object} row Audit log row; `actor_name` is resolved by the backend.
 * @return {string}
 */
export function formatActorLabel(row) {
  const id = row?.user_id;
  const name = (row?.actor_name ?? "").trim();
  if (name && id) return `${name} (${id})`;
  return name || id || "System";
}