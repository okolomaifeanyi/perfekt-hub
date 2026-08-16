// Reuses the existing `relationship` column (already on `users`, already
// shown on the About block) rather than adding a new marital_status column
// — it was free text with no input UI anywhere, so nothing already stored
// there conflicts with switching it to a fixed set of options.
export const MARITAL_STATUS_OPTIONS = [
  "Single",
  "In a relationship",
  "Engaged",
  "Married",
  "Divorced",
  "Widowed",
  "It's complicated",
];

// The one value Suggested Match excludes candidates for — kept as a named
// export so the filter and the option list can never silently drift apart.
export const MARRIED_STATUS = "Married";
