"use client";

import * as React from "react";
import { Flag, Pause, Play, RotateCcw } from "lucide-react";
import styles from "./stopwatch.module.css";
import { stopwatchElapsed } from "@/lib/stopwatch-clock";
import { Button as BaseButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => false,
  );
}
const motionSnapshot = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function subscribeMotion(listener: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
function Button({
  variant,
  className,
  ...props
}: React.ComponentProps<typeof BaseButton> & { variant?: string }) {
  return (
    <BaseButton
      {...props}
      data-watch-variant={variant}
      className={cn(styles.button, className)}
    />
  );
}
function Badge({
  variant,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      {...props}
      data-variant={variant}
      className={cn(styles.badge, className)}
    />
  );
}

/** The newest lap row settles in from above. Hoisted via React 19's <style href>. */
const LAP_KEYFRAMES = `@keyframes zy-lap-in{from{opacity:0;transform:translateY(-0.4em)}to{opacity:1;transform:translateY(0)}}`;

/** Fractional digits per precision. Also the repaint quantum: 10 ** (3 - digits) ms. */
const DIGITS = {
  centiseconds: 2,
  milliseconds: 3,
  seconds: 0,
  tenths: 1,
} as const;

export type StopwatchPrecision = keyof typeof DIGITS;

export interface StopwatchLap {
  /** 1-based, in the order recorded. Never reused before a reset. */
  index: number;
  /** This lap on its own: split minus the previous split. */
  lapMs: number;
  /** Total elapsed at the instant the lap was recorded. */
  splitMs: number;
}

/**
 * The one clock this component trusts.
 *
 * `performance.now()` is monotonic: it cannot jump backwards when the OS syncs
 * with NTP, crosses a DST boundary, or the user drags the system clock — all of
 * which `Date.now()` can do mid-run. It is also why elapsed time is *read* from
 * the clock rather than accumulated tick by tick: a `setInterval(…, 10)` is
 * clamped to ≥1s and coalesced while the tab is hidden, so anything that adds a
 * fixed delta per tick loses minutes in a background tab. Subtracting two clock
 * reads is right on the first frame after the tab wakes up.
 *
 * `Date.now()` is the last-resort fallback (ancient or exotic runtimes); lap
 * deltas are clamped at zero below so even a backwards jump cannot produce a
 * negative lap.
 */
function readClock(): number {
  return typeof performance !== "undefined" &&
    typeof performance.now === "function"
    ? performance.now()
    : Date.now();
}

const pad = (value: number, length = 2) => String(value).padStart(length, "0");

/**
 * `MM:SS.cc`, growing an hours segment only once there is an hour to show.
 * Truncates instead of rounding, so the readout never displays time that has
 * not happened yet. Laps and splits are truncated separately, so the lap column
 * can trail the split column by up to one display step per lap.
 */
export function formatElapsed(ms: number, digits = 2): string {
  const total = Math.max(0, Math.floor(ms));
  const hours = Math.floor(total / 3_600_000);
  const minutes = Math.floor(total / 60_000) % 60;
  const seconds = Math.floor(total / 1000) % 60;
  const head =
    hours > 0
      ? `${hours}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(minutes)}:${pad(seconds)}`;
  if (digits <= 0) return head;
  const fraction = Math.floor((total % 1000) / 10 ** (3 - digits));
  return `${head}.${pad(fraction, digits)}`;
}

/** Spoken form for assistive tech: "1 minute 23 seconds" reads far better than "01:23.45". */
function speakElapsed(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  const seconds = total % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}小时`);
  if (minutes > 0) parts.push(`${minutes}分`);
  parts.push(`${seconds}秒`);
  return parts.join(" ");
}

export interface StopwatchProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "onReset"
> {
  /** How much of the fraction the readout shows — and how often it repaints. Default "centiseconds". */
  precision?: StopwatchPrecision;
  /** Paint the Lap button and the lap list. Default true. */
  showLaps?: boolean;
  /** Start ticking on mount. Default false. */
  autoStart?: boolean;
  /** Elapsed milliseconds to resume from, e.g. a session restored from storage. Default 0. */
  defaultElapsedMs?: number;
  /** Lap *durations* in ms, oldest first; splits are derived by accumulation. Default none. */
  defaultLaps?: number[];
  /** Accessible name of the widget. Default "Stopwatch". */
  label?: string;
  /** Fires on every real run/pause transition — never on a refused activation. */
  onRunningChange?: (running: boolean) => void;
  /** Fires once per recorded lap, with the lap and split already computed. */
  onLap?: (lap: StopwatchLap) => void;
  /** Fires when the watch actually went back to zero. */
  onReset?: () => void;
}

/**
 * A count-up stopwatch: start / pause / resume, reset, and lap recording with
 * both per-lap and cumulative times.
 *
 * Three decisions carry the whole component:
 *
 * 1. **The clock is read, never accumulated.** Every frame recomputes
 *    `base + (performance.now() - startedAt)`, so a throttled or fully
 *    suspended background tab costs nothing: the first frame after the tab
 *    becomes visible again already shows the correct time.
 * 2. **Timing lives in refs, React state only mirrors it for painting.** Every
 *    mutation reads and writes those refs synchronously inside the handler, so
 *    a double activation cannot re-stamp the start time or record two laps from
 *    one stale `elapsed`.
 * 3. **Unavailable controls are refused, not disabled.** Lap while paused and
 *    Reset at zero carry `aria-disabled` plus a guard in the handler — the
 *    native attribute would blur the very button the reader is standing on the
 *    moment the watch stops.
 */
export const Stopwatch = React.forwardRef<HTMLDivElement, StopwatchProps>(
  (
    {
      autoStart = false,
      className,
      defaultElapsedMs = 0,
      defaultLaps,
      label = "计时器",
      onLap,
      onReset,
      onRunningChange,
      precision = "centiseconds",
      showLaps = true,
      ...props
    },
    ref,
  ) => {
    const digits = DIGITS[precision];
    const step = 10 ** (3 - digits);
    const reduced = usePrefersReducedMotion();

    // Seeded exactly once: restoring a session must not re-run every render.
    const [seed] = React.useState(() => {
      const seeded: StopwatchLap[] = [];
      let split = 0;
      for (const duration of defaultLaps ?? []) {
        const lapMs = Math.max(0, Math.floor(duration));
        split += lapMs;
        seeded.push({ index: seeded.length + 1, lapMs, splitMs: split });
      }
      // Degenerate input: elapsed can never be behind the laps it already contains.
      return {
        elapsed: Math.max(Math.floor(Math.max(0, defaultElapsedMs)), split),
        laps: seeded,
      };
    });

    const [elapsed, setElapsed] = React.useState(seed.elapsed);
    const [laps, setLaps] = React.useState(seed.laps);
    const [running, setRunning] = React.useState(autoStart);
    const [announcement, setAnnouncement] = React.useState("");

    const runningRef = React.useRef(autoStart);
    /** Milliseconds banked by every finished run. */
    const baseRef = React.useRef(seed.elapsed);
    /** Clock reading at the current run's start; null whenever the watch is stopped. */
    const startedAtRef = React.useRef<number | null>(null);
    const lastSplitRef = React.useRef(
      seed.laps.length > 0 ? seed.laps[seed.laps.length - 1].splitMs : 0,
    );
    const lapCountRef = React.useRef(seed.laps.length);

    const readElapsed = React.useCallback(() => {
      const startedAt = startedAtRef.current;
      if (!runningRef.current || startedAt === null) return baseRef.current;
      return stopwatchElapsed(baseRef.current, startedAt, readClock());
    }, []);

    // autoStart stamps the clock here, not in render: the server has no clock and
    // render must stay pure. Declared above the frame loop so it runs first.
    React.useEffect(() => {
      if (runningRef.current && startedAtRef.current === null)
        startedAtRef.current = readClock();
    }, []);

    React.useEffect(() => {
      if (!running) return;
      let frame = 0;
      const tick = () => {
        const next = readElapsed();
        // Bail out when the visible digits would not change: at
        // precision="seconds" that is one re-render per second instead of sixty.
        setElapsed((prev) =>
          Math.floor(prev / step) === Math.floor(next / step) ? prev : next,
        );
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, [readElapsed, running, step]);

    const start = () => {
      // Synchronous ref guard. A second activation in the same frame (a fast
      // double click, or Space reaching both the button and the widget) would
      // otherwise re-stamp startedAt and silently drop the time in between.
      if (runningRef.current) return;
      const resumed = baseRef.current > 0;
      runningRef.current = true;
      startedAtRef.current = readClock();
      setRunning(true);
      setAnnouncement(resumed ? "已继续计时" : "已开始计时");
      onRunningChange?.(true);
    };

    const pause = () => {
      if (!runningRef.current) return;
      // Read before flipping the flag — readElapsed() returns the banked value once
      // the watch is stopped, so the order here is the difference between banking
      // the real time and banking the previous total.
      const total = readElapsed();
      runningRef.current = false;
      startedAtRef.current = null;
      baseRef.current = total;
      setRunning(false);
      setElapsed(total);
      setAnnouncement(`已暂停，已计时${speakElapsed(total)}`);
      onRunningChange?.(false);
    };

    const toggle = () => {
      if (runningRef.current) pause();
      else start();
    };

    const recordLap = () => {
      // Refusal, not a crash: a lap needs a running clock to slice.
      if (!runningRef.current) return;
      const split = readElapsed();
      const previous = lastSplitRef.current;
      // Written synchronously, before any setState: two clicks inside one frame
      // produce two honest (tiny) laps instead of two copies of the same one.
      lastSplitRef.current = split;
      const index = lapCountRef.current + 1;
      lapCountRef.current = index;
      const entry: StopwatchLap = {
        index,
        lapMs: Math.max(0, split - previous),
        splitMs: split,
      };
      setLaps((prev) => [...prev, entry]);
      setElapsed(split);
      setAnnouncement(`已记录第${index}段，用时${speakElapsed(entry.lapMs)}`);
      onLap?.(entry);
    };

    const reset = () => {
      const wasRunning = runningRef.current;
      // Nothing to zero: refuse silently rather than firing onReset for a no-op.
      if (!wasRunning && baseRef.current === 0 && lapCountRef.current === 0)
        return;
      runningRef.current = false;
      startedAtRef.current = null;
      baseRef.current = 0;
      lastSplitRef.current = 0;
      lapCountRef.current = 0;
      setRunning(false);
      setElapsed(0);
      setLaps([]);
      setAnnouncement("已归零");
      if (wasRunning) onRunningChange?.(false);
      onReset?.();
    };

    const lapTimes = laps.map((lap) => lap.lapMs);
    // One lap is neither fastest nor slowest, and a field of identical laps has no
    // outlier either — marking both ends of a tie is noise, so mark nothing.
    const fastest = laps.length > 1 ? Math.min(...lapTimes) : null;
    const slowest = laps.length > 1 ? Math.max(...lapTimes) : null;
    const marked = fastest !== null && slowest !== null && fastest !== slowest;

    const lastSplit = laps.length > 0 ? laps[laps.length - 1].splitMs : 0;
    // Can go momentarily negative between a lap and the next frame; the formatter clamps.
    const currentLapMs = elapsed - lastSplit;
    const resettable = running || elapsed > 0 || laps.length > 0;
    const status = running ? "计时中" : elapsed > 0 ? "已暂停" : "准备就绪";
    const ordered = laps.slice().reverse();

    const inert =
      "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-background aria-disabled:hover:text-foreground dark:aria-disabled:hover:bg-input/30";

    return (
      <div
        aria-label={label}
        className={cn(
          styles.watch,
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        ref={ref}
        role="group"
        {...props}
      >
        <style href="zyeon-stopwatch" precedence="medium">
          {LAP_KEYFRAMES}
        </style>

        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn(
                "size-2 shrink-0 rounded-full",
                running
                  ? "animate-pulse bg-primary motion-reduce:animate-none"
                  : elapsed > 0
                    ? "bg-muted-foreground"
                    : "bg-muted-foreground/40",
              )}
            />
            {status}
          </span>
          {showLaps && laps.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">
              {`第 ${laps.length + 1} 段`} ·{" "}
              {formatElapsed(currentLapMs, digits)}
            </span>
          )}
        </div>

        {/* role="timer" is a live region, and a value that changes sixty times a
            second must never be announced — aria-live="off" keeps it readable on
            demand instead. The digits are decorative; the sr-only text is the value. */}
        <div aria-live="off" className="flex items-baseline" role="timer">
          <span
            aria-hidden="true"
            className="font-mono text-4xl font-semibold tabular-nums tracking-tight"
          >
            {formatElapsed(elapsed, digits)}
          </span>
          <span className="sr-only">已计时{speakElapsed(elapsed)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            className="min-w-24"
            onClick={toggle}
            type="button"
            variant={running ? "outline" : "default"}
          >
            {running ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            {running ? "暂停" : elapsed > 0 ? "继续" : "开始"}
          </Button>

          {showLaps && (
            <Button
              aria-disabled={!running || undefined}
              // Only overridden while refused, and the override keeps the visible
              // word first so the accessible name still contains the label.
              aria-label={running ? undefined : "分段（计时停止时不可用）"}
              className={inert}
              onClick={recordLap}
              type="button"
              variant="outline"
            >
              <Flag aria-hidden="true" />
              {"分段"}
            </Button>
          )}

          <Button
            aria-disabled={!resettable || undefined}
            aria-label={resettable ? undefined : "重置（已经归零）"}
            className={inert}
            onClick={reset}
            type="button"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            {"重置"}
          </Button>
        </div>

        {showLaps && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
              <span className="shrink-0">
                {laps.length === 0 ? "暂无分段" : `${laps.length} 段`}
              </span>
              {laps.length > 0 && (
                <>
                  <span className="ml-auto min-w-[8ch] text-right">
                    {"分段"}
                  </span>
                  <span className="min-w-[8ch] text-right">{"累计"}</span>
                </>
              )}
            </div>

            {laps.length > 0 && (
              <ol className="flex list-none flex-col">
                {ordered.map((lap) => (
                  <li
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm odd:bg-muted/50"
                    key={lap.index}
                    // Only rows recorded during this session animate, and only when
                    // motion is welcome (`seed` never changes, so its length is the
                    // count that was already on screen at first paint). The value
                    // lands either way.
                    style={
                      reduced || lap.index <= seed.laps.length
                        ? undefined
                        : { animation: "zy-lap-in 220ms ease-out" }
                    }
                  >
                    <span className="shrink-0 text-muted-foreground">
                      {`第 ${lap.index} 段`}
                    </span>
                    {marked && lap.lapMs === fastest && (
                      <Badge
                        className="border-primary/40 text-primary"
                        variant="outline"
                      >
                        {"最快"}
                      </Badge>
                    )}
                    {marked && lap.lapMs === slowest && (
                      <Badge variant="destructive">{"最慢"}</Badge>
                    )}
                    <span className="ml-auto min-w-[8ch] text-right font-medium tabular-nums">
                      {formatElapsed(lap.lapMs, digits)}
                    </span>
                    <span className="min-w-[8ch] text-right text-xs tabular-nums text-muted-foreground">
                      {formatElapsed(lap.splitMs, digits)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Transitions get announced; the ticking value never does. */}
        <span aria-atomic="true" className="sr-only" role="status">
          {announcement}
        </span>
      </div>
    );
  },
);

Stopwatch.displayName = "Stopwatch";

export default Stopwatch;
