"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = React.createContext<ThemeContextValue | undefined>(
  undefined
);

const STORAGE_KEY = "theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
}) {
  // Lazily read the real values on first render instead of defaulting to
  // "light" and correcting later in an effect — the blocking script in
  // <head> (see app/layout.tsx) already set the DOM class before paint, so
  // this just needs to agree with it immediately rather than causing a
  // second, visible flip once React takes over.
  const [theme, setThemeState] = React.useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    return savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
      ? savedTheme
      : defaultTheme;
  });
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(getSystemTheme);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const updateSystemTheme = () => setSystemTheme(getSystemTheme());

    mediaQuery.addEventListener("change", updateSystemTheme);
    return () => mediaQuery.removeEventListener("change", updateSystemTheme);
  }, []);

  React.useEffect(() => {
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");

    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage failures.
    }
  }, [systemTheme, theme]);

  const value = React.useMemo<ThemeContextValue>(() => {
    const resolvedTheme = theme === "system" ? systemTheme : theme;
    return {
      theme,
      resolvedTheme,
      setTheme: setThemeState,
    };
  }, [systemTheme, theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
