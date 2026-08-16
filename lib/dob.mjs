// dob is stored as "August 16, 2000" (see CompleteProfileModal's formatDate)
// — native Date parsing handles that format fine, so this is just a single
// place for every dob-derived calculation instead of each caller
// reimplementing (and, twice, silently breaking) its own parsing. Two real
// call sites (getSuggestedMatches, follow/actions.ts) used to split on "-"
// and parseInt the result, which is an ISO-date assumption dob never
// actually uses — every age came back NaN -> null, and age-based match
// ranking was a silent no-op.
export function parseDob(dob) {
  if (!dob) return null;
  const parsed = new Date(dob);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateAge(dob, now = new Date()) {
  const birthDate = parseDob(dob);
  if (!birthDate) return null;

  let age = now.getFullYear() - birthDate.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() >= birthDate.getDate());

  return hasHadBirthdayThisYear ? age : age - 1;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// This year's occurrence if it hasn't passed yet, otherwise next year's —
// used both for "days until your next birthday" reminders and for deciding
// whether today is the day to create/celebrate someone's birthday event.
export function getNextBirthdayDate(dob, now = new Date()) {
  const birthDate = parseDob(dob);
  if (!birthDate) return null;

  const next = new Date(now);
  next.setMonth(birthDate.getMonth(), birthDate.getDate());
  next.setHours(0, 0, 0, 0);

  if (next < startOfDay(now)) {
    next.setFullYear(now.getFullYear() + 1);
  }

  return next;
}

export function isBirthdayToday(dob, now = new Date()) {
  const birthDate = parseDob(dob);
  if (!birthDate) return false;
  return birthDate.getMonth() === now.getMonth() && birthDate.getDate() === now.getDate();
}
