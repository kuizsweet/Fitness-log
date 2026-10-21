"use client";
import { useEffect, useRef } from "react";
import { JellyController } from "@/vendor/lens/jelly";

/** The same interruptible, drag-to-select spring used by MobileDock. */
export function useDockSegments(
  value: string,
  onSelect: (value: string) => void,
) {
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);
  const host = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const controller = useRef<JellyController | null>(null);
  useEffect(() => {
    const root = host.current!,
      lens = indicator.current!;
    const physics = new JellyController(root, null);
    controller.current = physics;
    const align = (snap = false) => {
      const selected = root.querySelector<HTMLElement>(
        '[aria-selected="true"], [aria-pressed="true"]',
      );
      if (!selected) return;
      lens.style.width = `${selected.offsetWidth}px`;
      physics.target(lens, selected.offsetLeft, 0, { snap });
    };
    physics.register(lens, {
      source: root,
      mode: "segment",
      segments: () => [...root.querySelectorAll<HTMLButtonElement>("button")],
      onCommit: (button) => {
        const next = button.dataset.dockValue;
        if (next) select.current(next);
        root.querySelectorAll('button').forEach((item) => item.blur());
      },
    });
    // Radix activates a tab on pointer-down. Lens restores the gesture's
    // original position on a tap release, so reconcile with the current tab.
    const settle = (event: Event) => {
      const phase = (event as CustomEvent<{ phase: string }>).detail.phase;
      if (phase === "end" || phase === "cancel") align();
    };
    root.addEventListener("lg:gesture", settle);
    const resize = new ResizeObserver(() => align(true));
    resize.observe(root);
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => {
      physics.reduced = preference.matches;
      physics.cancel(true);
      align(true);
    };
    preference.addEventListener("change", reduce);
    align(true);
    return () => {
      root.removeEventListener("lg:gesture", settle);
      resize.disconnect();
      preference.removeEventListener("change", reduce);
      physics.destroy();
      controller.current = null;
    };
  }, []);
  useEffect(() => {
    const selected = host.current?.querySelector<HTMLElement>(
      '[aria-selected="true"], [aria-pressed="true"]',
    );
    if (selected && indicator.current) {
      indicator.current.style.width = `${selected.offsetWidth}px`;
      controller.current?.target(indicator.current, selected.offsetLeft, 0);
    }
  }, [value]);
  return { host, indicator };
}
