"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
export type Language = "zh-CN" | "en";
const LanguageContext = createContext({
  language: "zh-CN" as Language,
  setLanguage: (language: Language) => {
    void language;
  },
});
const KEY = "kuizfit-language";
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, update] = useState<Language>("zh-CN");
  const setLanguage = useCallback((next: Language) => {
    update(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Keep the active in-memory preference. */
    }
  }, []);
  useEffect(() => {
    try {
      update(localStorage.getItem(KEY) === "en" ? "en" : "zh-CN");
    } catch {
      /* Use Chinese by default. */
    }
    const sync = (event: StorageEvent) => {
      if (event.key === KEY) update(event.newValue === "en" ? "en" : "zh-CN");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const value = useMemo(
    () => ({ language, setLanguage }),
    [language, setLanguage],
  );
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
export const useLanguage = () => useContext(LanguageContext);
