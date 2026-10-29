"use client";
import { useEffect } from "react";
import { api, ApiResponseError } from "@/lib/client";
import { syncWorkbenchOnce, workbenchKey } from "@/lib/workbench-sync";

/** Shared by config and dashboard. No polling when hidden; writes are debounced. */
export function WorkbenchSync({ user }: { user: string }) {
  useEffect(() => {
    let stopped = false,
      running = false,
      pending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    const key = workbenchKey(user);
    const announceError = (message: string) =>
      window.dispatchEvent(
        new CustomEvent("kuizfit-workbench-sync-error", {
          detail: { user, message },
        }),
      );
    async function sync() {
      if (stopped) return;
      if (running) {
        pending = true;
        return;
      }
      running = true;
      try {
        // Short retries only for compare-and-swap races, never for validation conflicts.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const changed = await syncWorkbenchOnce(
              user,
              localStorage,
              () =>
                api("workbench", undefined, "GET", {
                  signal: controller.signal,
                }),
              (snapshot) =>
                api("workbench", { owner_id: user, ...snapshot }, "POST", {
                  signal: controller.signal,
                  notify: false,
                }),
              () => !stopped,
            );
            if (!stopped) {
              announceError("");
              if (changed)
                window.dispatchEvent(
                  new CustomEvent("kuizfit-workbench-applied", {
                    detail: { user },
                  }),
                );
            }
            break;
          } catch (error) {
            if (
              error instanceof ApiResponseError &&
              error.status === 409 &&
              attempt < 2
            )
              continue;
            throw error;
          }
        }
      } catch (error) {
        if (!stopped)
          announceError(
            `计划暂未同步：${error instanceof Error ? error.message : "连接失败，本地计划已保留。"}`,
          );
      } finally {
        running = false;
        if (pending && !stopped) {
          pending = false;
          schedule();
        }
      }
    }
    function schedule() {
      clearTimeout(timer);
      timer = setTimeout(() => void sync(), 650);
    }
    const localChanged = (event: Event) => {
      if ((event as CustomEvent).detail?.user === user) schedule();
    };
    const storageChanged = (event: StorageEvent) => {
      if (event.key === key || event.key === `${key}:drafts`) schedule();
    };
    const wake = () => {
      if (document.visibilityState === "visible") void sync();
    };
    window.addEventListener("kuizfit-workbench-changed", localChanged);
    window.addEventListener("storage", storageChanged);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    const interval = setInterval(wake, 30000);
    void sync();
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("kuizfit-workbench-changed", localChanged);
      window.removeEventListener("storage", storageChanged);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [user]);
  return null;
}
