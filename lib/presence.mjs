// Nothing marks a user "offline" on disconnect — there's no reliable
// onDisconnect hook for a plain Postgres-backed presence flag the way
// Firebase Realtime DB or a websocket channel would give you. Instead,
// presence is entirely freshness-based: a heartbeat (see
// hooks/usePresenceHeartbeat.ts) refreshes lastSeen every ~45s while a tab
// is open and visible, and status here just reflects how long ago that
// last heartbeat landed. This makes presence self-healing — closing a tab
// (or losing network) just means heartbeats stop, and the user naturally
// ages from "online" to "recently active" to "offline" as lastSeen goes
// stale, with nothing that can get permanently stuck in the wrong state.
//
// The stored `online` boolean is deliberately NOT trusted here for that
// reason — it can only ever be set true by the heartbeat and is never
// reliably unset, so treating it as authoritative would mean anyone who
// ever opened the app shows online forever.
export const ONLINE_WINDOW_MS = 90 * 1000; // ~2x the heartbeat interval
export const RECENTLY_ACTIVE_WINDOW_MS = 15 * 60 * 1000;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getPresenceStatus(user) {
  const lastSeen = toDate(user?.lastSeen);
  if (!lastSeen) return "offline";

  const msSinceSeen = Date.now() - lastSeen.getTime();
  if (!Number.isFinite(msSinceSeen) || msSinceSeen < 0) return "offline";
  if (msSinceSeen <= ONLINE_WINDOW_MS) return "online";
  if (msSinceSeen <= RECENTLY_ACTIVE_WINDOW_MS) return "recently-active";
  return "offline";
}
