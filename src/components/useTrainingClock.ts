"use client";
import { useEffect, useState } from "react";
type Rest = { started: string; setId: string | null };
export function useTrainingClock(
  userId: string | undefined,
  sessionId: string,
) {
  const [now, setNow] = useState<number | null>(null);
  const [rest, setRest] = useState<Rest | null>(null);
  const key = userId ? `kuizfit:rest:${userId}:${sessionId}` : null;
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  useEffect(() => {
    setRest(null);
    if (!key) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          typeof parsed.started === "string" &&
          Number.isFinite(Date.parse(parsed.started)) &&
          (parsed.setId === null || typeof parsed.setId === "string")
        )
          setRest(parsed);
      }
    } catch {
      /* Rest still works when storage is unavailable. */
    }
  }, [key]);
  function updateRest(next: Rest | null) {
    setRest(next);
    if (key)
      try {
        if (next) localStorage.setItem(key, JSON.stringify(next));
        else localStorage.removeItem(key);
      } catch {
        /* In-memory timing remains available. */
      }
  }
  return {
    now,
    rest,
    startRest: (setId: string | null = null) =>
      updateRest({ started: new Date().toISOString(), setId }),
    stopRest: () => updateRest(null),
  };
}
