"use client";
import { useEffect, useState } from "react";
import { useResource } from "../resource";
import { today, type Profile, type Session, type Meal } from "@/lib/domain";
import { calendarMonth } from "@/lib/calendar";

export function useDashboardData(initialDate?: string) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const date = picked || today(profile.data?.timezone);
  const month = calendarMonth(date);
  const sessions = useResource<Session[]>(
    `sessions?from=${month.from}&to=${month.to}`,
    true,
  );
  const meals = useResource<Meal[]>(`meals?date=${date}`, true);
  const records = sessions.data?.filter((s) => s.training_date === date) ?? [];
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
    window.addEventListener("fitness-data-change", changed);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [refreshSessions, refreshMeals]);
  return { profile, date, sessions, meals, records, setPicked };
}
export type DashboardData = ReturnType<typeof useDashboardData>;
