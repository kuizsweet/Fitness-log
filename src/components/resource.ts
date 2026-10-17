"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { resourceKey } from "@/lib/resource-keys";
import { resourceQuery } from "@/lib/query-cache";
import { useResourceUser } from "./ResourceProvider";
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function useResource<T>(
  path: string,
  retainOnReload = false,
  enabled = true,
) {
  void retainOnReload; // Legacy call contract; cached content now survives revalidation.
  const client = useQueryClient();
  const user = useResourceUser();
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const query = useQuery<T>({
    ...resourceQuery<T>(client, user, path),
    enabled: enabled && hydrated && Boolean(user),
    // Readers revalidate only when stale; session editors keep their draft intact.
    refetchOnWindowFocus: !path.startsWith("sessions?id="),
    refetchOnReconnect: !path.startsWith("sessions?id="),
  });
  const reload = useCallback(() => {
    void client.invalidateQueries(
      { queryKey: resourceKey(user, path), exact: true },
      { cancelRefetch: false },
    );
  }, [client, user, path]);
  return {
    data: hydrated ? (query.data ?? null) : null,
    error: hydrated ? (query.error?.message ?? "") : "",
    loading: enabled && (!hydrated || (query.isPending && query.isFetching)),
    reload,
  };
}
