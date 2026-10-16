"use client";
import { useEffect, useState } from "react";
import { useResource } from "../resource";
import { today, type Profile, type Session, type Meal } from "@/lib/domain";
import { calendarMonth } from "@/lib/calendar";

export function useDashboardData(initialDate?: string) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const [mealsEnabled, setMealsEnabled] = useState(false);
  const date = picked || today(profile.data?.timezone);
  const month = calendarMonth(date);
  const sessions = useResource<Session[]>(
    `sessions?from=${month.from}&to=${month.to}`,
    true,
    Boolean(profile.data),
  );
  const meals = useResource<Meal[]>(`meals?date=${date}`, true, mealsEnabled);
  const records = sessions.data?.filter((s) => s.training_date === date) ?? [];
  useEffect(() => {
    if (
      process.env.NODE_ENV === "development" &&
      profile.data &&
      sessions.data &&
      !document.documentElement.dataset.kuizCoreReady
    ) {
      document.documentElement.dataset.kuizCoreReady = String(
        Math.round(performance.now()),
      );
      try {
        const loginStart = Number(sessionStorage.getItem("kuiz-login-start"));
        if (loginStart && Date.now() - loginStart < 30 * 60_000)
          document.documentElement.dataset.kuizLoginMs = String(
            Date.now() - loginStart,
          );
      } catch {
        /* Optional local diagnostics must not break the page. */
      }
    }
  }, [profile.data, sessions.data]);
  const refreshSessions = sessions.reload;
  const refreshMeals = meals.reload;
  useEffect(() => {
    const refresh = () => {
      refreshSessions();
      refreshMeals();
    };
    const changed = (event: Event) => {
      const resource = (event as CustomEvent<{ resource: string }>).detail
        .resource;
      if (["sessions", "imports"].includes(resource)) refreshSessions();
      if (["meals", "photos"].includes(resource)) refreshMeals();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("fitness-data-change", changed);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [refreshSessions, refreshMeals]);
  return {
    profile,
    date,
    sessions,
    meals,
    records,
    setPicked,
    setMealsEnabled,
  };
}
export type DashboardData = ReturnType<typeof useDashboardData>;
