"use client";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import { QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import { userQueryClient } from "@/lib/query-cache";
import { clearUserCache } from "@/lib/query-cache";
import { browserClient } from "@/lib/supabase/browser";
const ResourceUser = createContext("");
export const useResourceUser = () => useContext(ResourceUser);
export function ResourceProvider({
  user,
  children,
}: {
  user: string;
  children: React.ReactNode;
}) {
  const [client] = useState(() => userQueryClient(user));
  useLayoutEffect(() => {
    const key = `kuiz-cache:${user}`;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (saved?.version === 1 && Date.now() - saved.at < 15 * 60_000)
        hydrate(client, saved.state);
      if (process.env.NODE_ENV === "development")
        document.documentElement.dataset.kuizCache = JSON.stringify({
          restored: saved?.state?.queries?.length ?? 0,
        });
    } catch {
      try {
        sessionStorage.removeItem(key);
      } catch {
        /* Storage may be disabled. */
      }
    }
    const persist = () => {
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            at: Date.now(),
            state: dehydrate(client, {
              shouldDehydrateQuery: (q) =>
                q.state.status === "success" &&
                /^(profile|body|checkins|sessions\?)/.test(
                  String(q.queryKey[0]),
                ),
            }),
          }),
        );
      } catch {
        /* In-memory caching still works if browser storage is full. */
      }
    };
    const unsubscribe = client.getQueryCache().subscribe(persist);
    const changed = (event: Event) => {
      const resource = (event as CustomEvent<{ resource: string }>).detail
        .resource;
      void client.invalidateQueries(
        {
          predicate: (q) =>
            String(q.queryKey[0]).split(/[/?]/)[0] === resource ||
            (resource === "imports" &&
              String(q.queryKey[0]).startsWith("sessions")),
          refetchType: "none",
        },
        { cancelRefetch: false },
      );
    };
    window.addEventListener("fitness-data-change", changed);
    const auth = browserClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== user)) {
        unsubscribe();
        clearUserCache();
        window.location.assign("/auth");
      }
    });
    return () => {
      persist();
      unsubscribe();
      auth.data.subscription.unsubscribe();
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [client, user]);
  return (
    <ResourceUser.Provider value={user}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ResourceUser.Provider>
  );
}
