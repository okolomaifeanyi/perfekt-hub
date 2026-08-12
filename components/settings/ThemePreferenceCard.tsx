"use client";

import { useTheme } from "@/components/theme-provider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getThemePreferenceDescription,
  getThemePreferenceLabel,
  normalizeThemePreference,
  THEME_PREFERENCES,
} from "@/lib/theme-preferences.mjs";
import { Laptop, Moon, SunMedium } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

const themeIcons: Record<ThemePreference, typeof SunMedium> = {
  light: SunMedium,
  dark: Moon,
  system: Laptop,
};

const themePreferences = THEME_PREFERENCES as ThemePreference[];

const fieldId = "theme-preference";
const descriptionId = `${fieldId}-description`;

export function ThemePreferenceCard() {
  const { theme, setTheme } = useTheme();
  const currentTheme = normalizeThemePreference(theme);

  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <Label htmlFor={fieldId} className="text-base">
          Appearance
        </Label>
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {getThemePreferenceDescription(currentTheme)}
        </p>
      </div>

      <Select
        value={currentTheme}
        onValueChange={value => setTheme(normalizeThemePreference(value))}
      >
        <SelectTrigger
          id={fieldId}
          aria-describedby={descriptionId}
          className="mt-3 w-full sm:max-w-xs"
        >
          <SelectValue placeholder="Select a theme" />
        </SelectTrigger>
        <SelectContent>
          {themePreferences.map(option => {
            const Icon = themeIcons[option];

            return (
              <SelectItem key={option} value={option}>
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {getThemePreferenceLabel(option)}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </section>
  );
}
