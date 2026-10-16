"use client";
import type { CSSProperties } from "react";
// shadcn/ui Base Progress composition, scoped styles instead of a global reset.
import { Progress as ProgressPrimitive } from "@base-ui/react/progress";
import styles from "./body-controls.module.css";
export function Progress({
  className,
  value,
  children,
  ...props
}: ProgressPrimitive.Root.Props) {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const fraction =
    value == null || max <= min
      ? 0
      : Math.max(0, Math.min(1, (value - min) / (max - min)));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      value={value}
      className={[styles.progress, className].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
      <ProgressPrimitive.Track
        data-slot="progress-track"
        className={styles.track}
      >
        <ProgressPrimitive.Indicator
          data-slot="progress-indicator"
          className={styles.indicator}
          style={
            {
              width: "100%",
              "--progress-translate": `${(fraction - 1) * 100}%`,
            } as CSSProperties
          }
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}
