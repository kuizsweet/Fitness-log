"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/client";
export function useResource<T>(path: string) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    version: number;
    data: T | null;
    error: string;
  } | null>(null);
  useEffect(() => {
    let cancelled = false;
    api<T>(path)
      .then((d) => {
        if (!cancelled) {
          setResult({ path, version, data: d, error: "" });
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setResult({ path, version, data: null, error: e.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [path, version]);
  const reload = useCallback(() => {
    setVersion((v) => v + 1);
  }, []);
  const current =
    result?.path === path && result.version === version ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    loading: current === null,
    reload,
  };
}
