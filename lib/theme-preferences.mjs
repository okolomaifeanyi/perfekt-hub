export const THEME_PREFERENCES = ["light", "dark", "system"];

export function isThemePreference(value) {
  return THEME_PREFERENCES.includes(value);
}

export function normalizeThemePreference(value, fallback = "system") {
  return isThemePreference(value) ? value : fallback;
}

export function getThemePreferenceLabel(theme) {
  switch (normalizeThemePreference(theme)) {
    case "light":
      return "Light";
    case "dark":
      return "Dark";
    default:
      return "System";
  }
}

export function getThemePreferenceDescription(theme) {
  switch (normalizeThemePreference(theme)) {
    case "light":
      return "Always use light mode.";
    case "dark":
      return "Always use dark mode.";
    default:
      return "Match your device preference automatically.";
  }
}
