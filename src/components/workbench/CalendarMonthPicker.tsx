"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import styles from "./TrainingWorkbench.module.css";

function RollingValue({
  value,
  min,
  max,
  label,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const reduced = useReducedMotion();
  const host = useRef<HTMLSpanElement>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const drag = useRef<{ y: number; value: number } | null>(null);
  const [direction, setDirection] = useState(1);
  const previous = useRef(value);
  const step = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next));
    if (bounded !== latest.current.value) {
      setDirection(bounded > latest.current.value ? 1 : -1);
      latest.current.onChange(bounded);
    }
  };
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let total = 0;
    let last = 0;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const now = performance.now();
      if (now - last > 180) total = 0;
      last = now;
      total += event.deltaY * (event.deltaMode === 1 ? 16 : 1);
      if (Math.abs(total) >= 36) {
        const d = total > 0 ? 1 : -1;
        total = 0;
        const next = Math.max(min, Math.min(max, latest.current.value + d));
        setDirection(d);
        latest.current.onChange(next);
      }
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [min, max]);
  const incoming =
    value === previous.current ? direction : value > previous.current ? 1 : -1;
  useEffect(() => {
    previous.current = value;
  }, [value]);
  return (
    <span
      ref={host}
      className={styles.rollingDate}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          step(value + (e.key === "ArrowUp" ? 1 : -1));
        } else if (e.key === "Home") {
          e.preventDefault();
          step(min);
        } else if (e.key === "End") {
          e.preventDefault();
          step(max);
        }
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { y: e.clientY, value };
      }}
      onPointerMove={(e) => {
        const start = drag.current;
        if (start) step(start.value + Math.trunc((start.y - e.clientY) / 18));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onLostPointerCapture={() => {
        drag.current = null;
      }}
    >
      {String(value)
        .split("")
        .map((digit, index) => (
          <span className={styles.rollingDigit} key={index}>
            <AnimatePresence initial={false} custom={incoming}>
              <motion.span
                custom={incoming}
                key={digit}
                exit={
                  reduced
                    ? undefined
                    : { transform: `translateY(${-incoming * 100}%)` }
                }
                initial={
                  reduced
                    ? false
                    : { transform: `translateY(${incoming * 100}%)` }
                }
                animate={{ transform: "translateY(0%)" }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.2 }}
              >
                {digit}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}
export function CalendarMonthPicker({
  year,
  month,
  onChange,
}: {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}) {
  return (
    <div className={styles.monthRoller}>
      <RollingValue
        value={year}
        min={2020}
        max={2030}
        label="年份"
        onChange={(value) => onChange(value, month)}
      />
      <span>年</span>
      <RollingValue
        value={month}
        min={1}
        max={12}
        label="月份"
        onChange={(value) => onChange(year, value)}
      />
      <span>月</span>
    </div>
  );
}
