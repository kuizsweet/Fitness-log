"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark";
const STORAGE_KEY = "kuizfit-theme";
type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  ready: boolean;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(preference: ThemePreference) {
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.dataset.theme = preference;
  document.documentElement.style.colorScheme = preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setState] = useState<ThemePreference>("dark");
  const [ready, setReady] = useState(false);

  const setPreference = useCallback((next: ThemePreference) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page when storage is unavailable.
    }
    applyTheme(next);
  }, []);

  useEffect(() => {
    const stored = document.documentElement.dataset.themePreference;
    if (stored === "light" || stored === "dark") {
      setState(stored);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyTheme(preference);
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      if (event.newValue === "light" || event.newValue === "dark") {
        setState(event.newValue as ThemePreference);
        applyTheme(event.newValue as ThemePreference);
      }
    };
    window.addEventListener("storage", syncStorage);
    return () => {
      window.removeEventListener("storage", syncStorage);
    };
  }, [preference, ready]);

  const value = useMemo(
    () => ({ preference, setPreference, ready }),
    [preference, setPreference, ready],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value)
    throw new Error("useThemePreference must be used within ThemeProvider");
  return value;
}
