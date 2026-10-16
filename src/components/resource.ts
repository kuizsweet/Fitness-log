"use client";
import { useCallback, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
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
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const query = useQuery<T>({
    queryKey: [path],
    queryFn: () => api<T>(path),
    enabled: enabled && hydrated,
    // Existing editors must not be refetched/unmounted on window focus.
    // Dashboard readers opt in through their existing explicit listeners.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    ...(path.startsWith("sessions?id=") ? { gcTime: 0, staleTime: 0 } : {}),
  });
  const reload = useCallback(() => {
    void client.invalidateQueries(
      { queryKey: [path], exact: true },
      { cancelRefetch: false },
    );
  }, [client, path]);
  return {
    data: hydrated ? (query.data ?? null) : null,
    error: hydrated ? (query.error?.message ?? "") : "",
    loading: enabled && (!hydrated || (query.isPending && query.isFetching)),
    reload,
  };
}
