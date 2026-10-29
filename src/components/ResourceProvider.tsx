"use client";
import { createContext, useContext, useLayoutEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { userQueryClient } from "@/lib/query-cache";
import { clearUserCache } from "@/lib/query-cache";
import { browserClient } from "@/lib/supabase/browser";
import { applyResourceChange } from "@/lib/training-cache";
import type { ResourceChange } from "@/lib/resource-keys";
import { WorkbenchSync } from "./WorkbenchSync";
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
    // Retire the old persisted query snapshot; drafts use their own existing store.
    try {
      sessionStorage.removeItem(`kuiz-cache:${user}`);
    } catch {
      /* In-memory caching does not require browser storage. */
    }
    const changed = (event: Event) => {
      void applyResourceChange(
        client,
        user,
        (event as CustomEvent<ResourceChange>).detail,
      );
    };
    window.addEventListener("fitness-data-change", changed);
    const auth = browserClient().auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== user)) {
        clearUserCache();
        window.location.assign("/auth");
      }
    });
    return () => {
      auth.data.subscription.unsubscribe();
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [client, user]);
  return (
    <ResourceUser.Provider value={user}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
      <WorkbenchSync user={user} />
    </ResourceUser.Provider>
  );
}
