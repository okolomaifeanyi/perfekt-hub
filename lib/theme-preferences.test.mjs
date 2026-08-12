import assert from "node:assert/strict";
import test from "node:test";
import {
  getThemePreferenceDescription,
  getThemePreferenceLabel,
  isThemePreference,
  normalizeThemePreference,
} from "./theme-preferences.mjs";

test("normalizeThemePreference falls back to system", () => {
  assert.equal(normalizeThemePreference("light"), "light");
  assert.equal(normalizeThemePreference("invalid"), "system");
});

test("theme preference helpers expose accessible labels", () => {
  assert.equal(isThemePreference("dark"), true);
  assert.equal(isThemePreference("purple"), false);
  assert.equal(getThemePreferenceLabel("system"), "System");
  assert.equal(
    getThemePreferenceDescription("dark"),
    "Always use dark mode."
  );
});
