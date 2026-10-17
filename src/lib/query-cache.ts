"use client";
import { QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { today, type Profile, type Session } from "./domain";
import { calendarMonth } from "./calendar";
import { resourceKey, setResourceOwner } from "./resource-keys";
import { trainingDate, trainingPaths } from "./training-queries";
let current: { user: string; client: QueryClient } | undefined;
export function userQueryClient(user: string) {
  if (typeof window === "undefined") return new QueryClient();
  setResourceOwner(user);
  if (current?.user !== user) {
    current?.client.clear();
    current = {
      user,
      client: new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
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
  setResourceOwner("");
}
// A day/list response already contains the full record tree. Reuse it when
// opening the editor instead of requesting the same session again by ID.
export function primeTrainingDetails(
  client: QueryClient,
  user: string,
  path: string,
  data: unknown,
) {
  const [resource, search] = path.split("?");
  const params = new URLSearchParams(search);
  if (
    resource !== "sessions" ||
    params.has("id") ||
    params.get("view") === "calendar" ||
    !Array.isArray(data)
  )
    return;
  for (const row of data as Session[]) {
    if (!row.id || !Array.isArray(row.exercises) || row.deleted_at) continue;
    const key = resourceKey(user, trainingPaths.detail(row.id));
    const existing = client.getQueryData<Session[]>(key)?.[0];
    if (!existing || existing.revision <= row.revision)
      client.setQueryData(key, [row]);
  }
}
export function resourceQuery<T>(
  client: QueryClient,
  user: string,
  path: string,
) {
  return {
    queryKey: resourceKey(user, path),
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const data = await api<T>(path, undefined, "GET", { signal });
      signal.throwIfAborted();
      primeTrainingDetails(client, user, path, data);
      return data;
    },
  };
}
// Prefetch only after completed authentication. API checks and RLS stay authoritative.
export function prefetchDashboard(user: string) {
  const client = userQueryClient(user);
  const prefetch = (path: string) =>
    client.prefetchQuery(resourceQuery(client, user, path));
  void prefetch("checkins");
  void prefetch("body");
  void client
    .fetchQuery(resourceQuery<Profile>(client, user, "profile"))
    .then((profile) => {
      const date = trainingDate(today(profile.timezone)),
        month = calendarMonth(date);
      void prefetch(trainingPaths.calendar(month.from, month.to));
      void prefetch(trainingPaths.day(date));
      void prefetch(trainingPaths.nextPlan(date));
    })
    .catch(() => {
      /* The mounted query exposes recoverable errors. */
    });
}
