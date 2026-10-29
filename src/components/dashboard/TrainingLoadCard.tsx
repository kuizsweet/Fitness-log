"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  buildRollingLoad,
  loadGeometry,
  type LoadEntry,
  type LoadPeriod,
} from "@/lib/training-load";
import { NOTE_COLORS } from "@/lib/training-workbench";
import dashboard from "./Dashboard.module.css";
import styles from "./TrainingLoadCard.module.css";
import { useDockSegments } from "../useDockSegments";

const SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };
const EMPTY_ENTRIES: LoadEntry[] = [];
export function TrainingLoadCard({
  date,
  entries,
  weekStart = 1,
}: {
  date: string;
  entries?: LoadEntry[];
  weekStart?: 0 | 1;
}) {
  const [period, setPeriod] = useState<LoadPeriod>("days");
  const dock = useDockSegments(period, (value) => {
    setPeriod(value as LoadPeriod);
    setActive(null);
  });
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(268);
  const [height, setHeight] = useState(80);
  const [entered, setEntered] = useState(false);
  const reduced = useReducedMotion();
  const plot = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const days = useMemo(
    () => buildRollingLoad(date, period, entries ?? EMPTY_ENTRIES, weekStart),
    [date, period, entries, weekStart],
  );
  const upper = Math.max(8, (height - 7) * 0.72);
  const lower = Math.max(7, height - upper - 7);
  const baseline = upper + 3;
  const geometry = useMemo(
    () => loadGeometry(days, upper, lower),
    [days, upper, lower],
  );
  const gap = Math.max(
    1,
    Math.min(6, (width - 3 * days.length) / Math.max(1, days.length - 1)),
  );
  const bar = (width - gap * (days.length - 1)) / days.length;
  const totals = days.reduce(
    (total, day) => ({
      sets: total.sets + day.sets,
      minutes: total.minutes + day.minutes,
    }),
    { sets: 0, minutes: 0 },
  );
  const selected = active === null ? null : days[active];
  const shape = active === null ? null : geometry[active];
  const x = (active ?? 0) * (bar + gap);
  const tipWidth = Math.min(170, width);
  const tipX = Math.max(
    0,
    Math.min(
      width - tipWidth,
      x + bar + 8 + tipWidth <= width ? x + bar + 8 : x - tipWidth - 8,
    ),
  );
  const ringX = useMotionValue(0);
  const ringY = useMotionValue(0);
  const ringHeight = useMotionValue(0);
  const tooltipX = useMotionValue(0);
  const wasActive = useRef(false);
  const top = shape?.top ?? 0;
  const bottom = shape?.bottom ?? 0;
  useEffect(() => {
    if (active === null) {
      wasActive.current = false;
      return;
    }
    const targets = [
      [ringX, x - 3],
      [ringY, baseline - 5 - top],
      [ringHeight, Math.max(10, top + bottom + 10)],
      [tooltipX, tipX],
    ] as const;
    const controls = targets.map(([value, target]) => {
      if (!wasActive.current || reduced) {
        value.set(target);
        return null;
      }
      return animate(value, target, SPRING);
    });
    wasActive.current = true;
    return () => controls.forEach((control) => control?.stop());
  }, [
    active,
    baseline,
    x,
    top,
    bottom,
    tipX,
    reduced,
    ringX,
    ringY,
    ringHeight,
    tooltipX,
  ]);
  useEffect(() => {
    const element = plot.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
      setHeight(entry.contentRect.height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = card.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEntered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const point = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(
      Math.max(
        0,
        Math.min(
          days.length - 1,
          Math.floor(((event.clientX - rect.left) / rect.width) * days.length),
        ),
      ),
    );
  };
  return (
    <section
      ref={card}
      className={`${dashboard.card} ${dashboard.load} ${styles.card}`}
      aria-label="训练负荷"
      data-scrub={selected ? "" : undefined}
    >
      <div className={styles.heading}>
        <div className={styles.figures}>
          <span>
            <strong key={`sets-${totals.sets}`} aria-label={`${totals.sets}`}>
              {`${totals.sets}`.split("").map((digit, i) => (
                <span
                  key={i}
                  className={styles.digit}
                  style={{ "--digit": i } as CSSProperties}
                  aria-hidden="true"
                >
                  {digit}
                </span>
              ))}
            </strong>{" "}
            <small>组 · 力量</small>
          </span>
          <span>
            <strong
              key={`minutes-${totals.minutes}`}
              aria-label={`${totals.minutes}`}
            >
              {`${totals.minutes}`.split("").map((digit, i) => (
                <span
                  key={i}
                  className={styles.digit}
                  style={{ "--digit": i } as CSSProperties}
                  aria-hidden="true"
                >
                  {digit}
                </span>
              ))}
            </strong>{" "}
            <small>分钟 · 有氧</small>
          </span>
        </div>
        <div
          className={styles.switcher}
          ref={dock.host}
          role="group"
          aria-label="训练负荷时间范围"
          data-period={period}
        >
          <span ref={dock.indicator} aria-hidden="true" />
          {(["days", "weeks"] as const).map((value) => (
            <button
              key={value}
              data-dock-value={value}
              type="button"
              aria-pressed={period === value}
              onClick={(event) => {
                if (event.detail > 0) event.currentTarget.blur();
                setPeriod(value);
                setActive(null);
              }}
            >
              {value === "days" ? "30天" : "24周"}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={plot}
        className={styles.plot}
        tabIndex={0}
        role="group"
        aria-label={
          period === "weeks"
            ? `最近24周训练负荷，左右方向键查看${weekStart === 1 ? "周一至周日" : "周日至周六"}的自然周`
            : "每日训练负荷，左右方向键查看日期"
        }
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setActive(null);
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            setActive((index) =>
              Math.max(
                0,
                Math.min(
                  days.length - 1,
                  (index ?? (event.key === "ArrowRight" ? -1 : days.length)) +
                    (event.key === "ArrowRight" ? 1 : -1),
                ),
              ),
            );
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={point}
        onPointerLeave={() => setActive(null)}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
          if (event.pointerType !== "mouse") setActive(null);
        }}
        onPointerCancel={() => setActive(null)}
      >
        <span className={styles.baseline} style={{ top: baseline }} />
        {days.map((day, i) => (
          <div
            className={styles.column}
            key={i}
            data-date={day.date}
            data-on={active === i || undefined}
            style={
              {
                left: i * (bar + gap),
                width: bar,
                "--i": i,
                "--radius": `${Math.min(2.5, bar / 2)}px`,
              } as CSSProperties
            }
          >
            {(["strength", "cardio"] as const).map((direction) => (
              <div
                key={direction}
                className={styles.half}
                data-half={direction}
                style={
                  direction === "strength"
                    ? { top: 0, height: baseline - 2 }
                    : { top: baseline + 3, bottom: 0 }
                }
              >
                {geometry[i][direction].map((segment) => (
                  <span
                    key={`${direction}-${segment.color}`}
                    data-direction={direction}
                    data-value={segment.value}
                    className={styles.segment}
                    style={
                      {
                        "--color": NOTE_COLORS[segment.color],
                        bottom:
                          direction === "strength"
                            ? entered || reduced
                              ? segment.offset
                              : 0
                            : undefined,
                        top:
                          direction === "cardio"
                            ? entered || reduced
                              ? segment.offset
                              : 0
                            : undefined,
                        height: entered || reduced ? segment.height : 0,
                      } as CSSProperties
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
        <motion.span
          aria-hidden="true"
          className={styles.ring}
          initial={false}
          style={{ x: ringX, y: ringY, height: ringHeight, width: bar + 6 }}
        />
        <motion.div
          className={styles.tooltip}
          aria-hidden={!selected}
          initial={false}
          style={{ x: tooltipX, width: tipWidth }}
        >
          {selected && (
            <>
              <div className={styles.tipHeading}>
                <span>
                  {period === "weeks"
                    ? `${selected.date.slice(5).replace("-", "/")}–${selected.end.slice(5).replace("-", "/")}`
                    : selected.date.slice(5).replace("-", "/")}
                </span>
                <b>
                  {selected.sets} 组 · {selected.minutes} 分钟
                </b>
              </div>
              {selected.entries.length ? (
                selected.entries
                  .slice(0, period === "weeks" ? 2 : undefined)
                  .map((entry, i) => (
                    <div className={styles.tipRow} key={`${entry.noteId}-${i}`}>
                      <i style={{ background: NOTE_COLORS[entry.noteColor] }} />
                      <span>{entry.noteTitle}</span>
                      <b>
                        {[
                          entry.strengthSets ? `${entry.strengthSets}组` : "",
                          entry.cardioMinutes ? `${entry.cardioMinutes}分` : "",
                        ]
                          .filter(Boolean)
                          .join(" / ")}
                      </b>
                    </div>
                  ))
              ) : (
                <div className={styles.tipRow}>休息</div>
              )}
            </>
          )}
        </motion.div>
      </div>
      <div className={styles.axis}>
        <span>{days[0].date.slice(5).replace("-", "/")}</span>
        <span>{days.at(-1)!.end.slice(5).replace("-", "/")}</span>
      </div>
      <div className={dashboard.srOnly} aria-live="polite">
        {selected
          ? `${selected.date}，力量${selected.sets}组，有氧${selected.minutes}分钟`
          : ""}
      </div>
    </section>
  );
}
