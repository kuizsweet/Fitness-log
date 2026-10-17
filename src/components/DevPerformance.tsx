"use client";
import { useEffect } from "react";

// Local measurements only: no identifiers, payloads, tokens or remote telemetry.
export function DevPerformance() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const publish = () => {
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const requests = performance
        .getEntriesByType("resource")
        .filter((e) => new URL(e.name).pathname.startsWith("/api/"))
        .map((e) => ({
          path: new URL(e.name).pathname + new URL(e.name).search,
          start: Math.round(e.startTime),
          ms: Math.round(e.duration),
          status: (e as PerformanceResourceTiming).responseStatus,
        }));
      document.documentElement.dataset.kuizPerformance = JSON.stringify({
        ttfb: Math.round(navigation?.responseStart ?? 0),
        domReady: Math.round(navigation?.domContentLoadedEventEnd ?? 0),
        requests,
      });
    };
    const observer = new PerformanceObserver(publish);
    observer.observe({ type: "resource", buffered: true });
    publish();
    return () => {
      observer.disconnect();
      for (const key of [
        "kuizPerformance",
        "kuizCoreReady",
        "kuizBodyReady",
        "kuizLoginMs",
        "kuizLoginBodyMs",
        "kuizCache",
      ])
        delete document.documentElement.dataset[key];
    };
  }, []);
  return null;
}
