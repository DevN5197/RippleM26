/**
 * Theme & UI display helpers.
 * Handles applying light, dark, and system theme class to document.documentElement
 * and compact-table layout mode.
 */

export type ThemeMode = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "ripple_theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return "system";
}

export function applyTheme(theme: ThemeMode): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore localStorage access restrictions
  }

  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);

  if (isDark) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function applyCompactTables(compact: boolean): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (compact) {
    root.classList.add("compact-tables");
  } else {
    root.classList.remove("compact-tables");
  }
}
