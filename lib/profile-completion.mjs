// Only fullName + dob are ever required to finish onboarding (see
// CompleteProfileModal) — everything else here is optional polish that
// only affects this percentage, never whether the account can be used.
export const PROFILE_COMPLETION_FIELDS = [
  { key: "fullName", label: "Name" },
  { key: "dob", label: "Date of birth" },
  { key: "photoURL", label: "Profile photo" },
  { key: "gender", label: "Gender" },
  { key: "relationship", label: "Relationship status" },
  { key: "country", label: "Country" },
  { key: "bio", label: "Bio" },
];

function isFilled(value) {
  return typeof value === "string" && value.trim().length > 0;
}

// Pure over a plain object shaped like UserProps — no DB/network access —
// so it can run identically on a freshly-fetched profile row or on live
// form state while the visitor is still typing.
export function getProfileCompletion(profile) {
  const missing = [];
  let filled = 0;

  for (const field of PROFILE_COMPLETION_FIELDS) {
    if (isFilled(profile?.[field.key])) {
      filled += 1;
    } else {
      missing.push(field);
    }
  }

  const percent = Math.round((filled / PROFILE_COMPLETION_FIELDS.length) * 100);
  return { percent, missing, isComplete: missing.length === 0 };
}
