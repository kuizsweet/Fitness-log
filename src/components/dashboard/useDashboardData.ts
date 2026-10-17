"use client";
import { useEffect, useState } from "react";
import { useResource } from "../resource";
import { today, type Profile, type Session, type Meal } from "@/lib/domain";
import { calendarMonth } from "@/lib/calendar";
import {
  DAY_PAGE_SIZE,
  trainingDate,
  trainingPaths,
  type CalendarTraining,
} from "@/lib/training-queries";

export function useDashboardData(initialDate?: string) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const [page, setPage] = useState({ date: "", index: 0 });
  const [mealsEnabled, setMealsEnabled] = useState(false);
  const date = trainingDate(picked || today(profile.data?.timezone));
  const dayPage = page.date === date ? page.index : 0;
  const month = calendarMonth(date);
  const sessions = useResource<Session[]>(
    trainingPaths.day(date, dayPage),
    true,
    Boolean(picked || profile.data),
  );
  const calendar = useResource<CalendarTraining[]>(
    trainingPaths.calendar(month.from, month.to),
    true,
    Boolean(picked || profile.data),
  );
  const meals = useResource<Meal[]>(`meals?date=${date}`, true, mealsEnabled);
  const records = sessions.data?.slice(0, DAY_PAGE_SIZE) ?? [];
  const hasMore = (sessions.data?.length ?? 0) > DAY_PAGE_SIZE;
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
        if (
          loginStart >= performance.timeOrigin &&
          Date.now() - loginStart < 30 * 60_000
        )
          document.documentElement.dataset.kuizLoginMs = String(
            Date.now() - loginStart,
          );
      } catch {
        /* Optional local diagnostics must not break the page. */
      }
    }
  }, [profile.data, sessions.data]);
  const refreshMeals = meals.reload;
  useEffect(() => {
    const changed = (event: Event) => {
      const resource = (event as CustomEvent<{ resource: string }>).detail
        .resource;
      if (["meals", "photos"].includes(resource)) refreshMeals();
    };
    window.addEventListener("fitness-data-change", changed);
    return () => {
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [refreshMeals]);
  return {
    profile,
    date,
    sessions,
    calendar,
    meals,
    records,
    dayPage,
    hasMore,
    setDayPage: (index: number) => setPage({ date, index }),
    setPicked,
    setMealsEnabled,
  };
}
export type DashboardData = ReturnType<typeof useDashboardData>;
