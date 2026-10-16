"use client";
import { QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { today, type Profile } from "./domain";
import { calendarMonth } from "./calendar";
let current: { user: string; client: QueryClient } | undefined;
export function userQueryClient(user: string) {
  if (typeof window === "undefined") return new QueryClient();
  if (current?.user !== user) {
    current?.client.clear();
    current = {
      user,
      client: new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 15 * 60_000,
            retry: false,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
    };
  }
  return current.client;
}
export function clearUserCache() {
  current?.client.clear();
  try {
    if (current) sessionStorage.removeItem(`kuiz-cache:${current.user}`);
  } catch {
    /* In-memory cache is already cleared. */
  }
  current = undefined;
}
// Prefetch only after completed authentication. API checks and RLS stay authoritative.
export function prefetchDashboard(user: string) {
  const client = userQueryClient(user);
  const prefetch = (path: string) =>
    client.prefetchQuery({ queryKey: [path], queryFn: () => api(path) });
  void prefetch("checkins");
  void prefetch("body");
  void client
    .fetchQuery<Profile>({
      queryKey: ["profile"],
      queryFn: () => api("profile"),
    })
    .then((profile) => {
      const date = today(profile.timezone),
        month = calendarMonth(date);
      void prefetch(`sessions?from=${month.from}&to=${month.to}`);
      void prefetch(`sessions?planned=1&from=${date}`);
    })
    .catch(() => {
      /* The mounted query exposes recoverable errors. */
    });
}
