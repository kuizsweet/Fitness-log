"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { ChecklistItem } from "@/lib/items-checklist";
import styles from "./ItemsChecklist.module.css";
const springOf = (tune: number) => ({
  k: 0.08 + (tune / 100) * 0.16,

  d: 0.62 + (tune / 100) * 0.2,
});

function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (
        Math.abs(target - cur.current) < 0.02 &&
        Math.abs(vel.current) < 0.02
      ) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [target, tune, instant]);

  return at;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const ROW = 40,
  BOX = 18,
  DRIFT = [-5, 4, -2, 5, -3];
export function ChecklistRows({
  items,
  allDone,
  spare,
  onToggle,
  onDelete,
}: {
  items: ChecklistItem[];
  allDone: boolean;
  spare: boolean;
  onToggle: (id: string, on: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(272);
  const [runs, setRuns] = useState<Record<string, number>>({});
  const [line, setLine] = useState(20);
  const [fell, setFell] = useState(false);
  const still = Boolean(useReducedMotion());
  const measure = useCallback((id: string, px: number, tall: number) => {
    setRuns((v) => (v[id] === px ? v : { ...v, [id]: px }));
    setLine((v) => (v === tall ? v : tall));
  }, []);
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => setWidth(el.clientWidth);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setFell(allDone);
    if (!allDone) return;
    // End the visual demonstration without resetting the user's actual items.
    const timer = setTimeout(() => setFell(false), 3000);
    return () => clearTimeout(timer);
  }, [allDone]);
  const body = Math.max(BOX, line),
    inset = (ROW - body) / 2,
    mid = width / 2;
  const leans = items.map(() => 0);
  for (let i = items.length - 2; i >= 0; i--) {
    const over = Math.max(
      0,
      (runs[items[i].id] ?? 0) - (runs[items[i + 1].id] ?? 0),
    );
    leans[i] = clamp(leans[i + 1] + 6 * (1 - Math.exp(-over / 40)), 0, 6);
  }
  const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);
  const touch =
    1 +
    Math.max(
      0,
      ...leans.slice(1).map((below, i) => {
        const ink = Math.max(
          runs[items[i].id] ?? mid,
          runs[items[i + 1].id] ?? mid,
        );
        return Math.max(0, (ink - mid) * (sin(leans[i]) - sin(below)));
      }),
    );
  const floor = ROW * (items.length + (spare ? 1 : 0));
  const seat = floor - inset - body;
  const drops = items.map((_, i) =>
    Math.max(0, seat - (items.length - 1 - i) * (body + touch) - i * ROW),
  );
  const longest = Math.max(...drops, 1);
  return (
    <div
      ref={root}
      className={styles.list}
      role="list"
      aria-label="物品清单"
      data-heap={(fell && !still) || undefined}
    >
      {items.map((item, i) => (
        <FallingRow
          key={item.id}
          item={item}
          fell={fell && !still}
          still={still}
          drop={drops[i]}
          secs={0.46 * Math.sqrt(drops[i] / longest)}
          inset={inset}
          drift={DRIFT[i % DRIFT.length]}
          tilt={leans[i]}
          layer={fell ? items.length - i : undefined}
          onRun={measure}
          onToggle={onToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
function FallingRow({
  item,
  fell,
  still,
  drop,
  secs,
  inset,
  drift,
  tilt,
  layer,
  onRun,
  onToggle,
  onDelete,
}: {
  item: ChecklistItem;
  fell: boolean;
  still: boolean;
  drop: number;
  secs: number;
  inset: number;
  drift: number;
  tilt: number;
  layer?: number;
  onRun: (id: string, px: number, tall: number) => void;
  onToggle: (id: string, on: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const say = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = say.current;
    if (el) onRun(item.id, el.offsetLeft + el.offsetWidth, el.offsetHeight);
  }, [item.id, item.text, onRun]);
  const t = useSpring(item.completed ? 1 : 0, 50, still),
    held = clamp(t, 0, 1),
    cut = clamp((held - 0.12) / 0.72, 0, 1);
  const up = Math.min(8, drop * 0.22);
  return (
    <motion.div
      role="listitem"
      className={styles.row}
      data-checklist-id={item.id}
      data-fell={fell || undefined}
      style={{ zIndex: layer, "--slip": `${inset}px` } as CSSProperties}
      initial={false}
      animate={
        fell
          ? { y: [0, drop, drop - up, drop], x: drift, rotate: tilt }
          : { y: 0, x: 0, rotate: 0 }
      }
      transition={
        fell
          ? {
              y: {
                duration: secs,
                times: [0, 0.66, 0.84, 1],
                ease: ["easeIn", "easeOut", "easeIn"],
              },
              x: { duration: secs, ease: "easeIn" },
              rotate: { duration: secs, ease: "easeIn" },
            }
          : { type: "spring", stiffness: 380, damping: 34, mass: 0.9 }
      }
    >
      <button
        type="button"
        role="checkbox"
        aria-label={`已准备：${item.text}`}
        aria-checked={item.completed}
        className={styles.taskToggle}
        onClick={() => onToggle(item.id, !item.completed)}
      >
        <span className={styles.springBox} aria-hidden>
          <span
            className={styles.springFill}
            style={{ transform: `scale(${t.toFixed(4)})` }}
          />
          <svg className={styles.springTick} viewBox="0 0 24 24">
            <path
              d="M6 12.4 L10.3 16.7 L18 7.6"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - held}
            />
          </svg>
        </span>
        <span ref={say} className={styles.springSay}>
          <span style={{ opacity: 1 - 0.58 * held }}>{item.text}</span>
          <span
            className={styles.springRule}
            aria-hidden
            style={{ transform: `scaleX(${cut.toFixed(4)})` }}
          />
        </span>
      </button>
      <button
        type="button"
        className={styles.remove}
        aria-label={`删除：${item.text}`}
        onClick={() => onDelete(item.id)}
      >
        <X aria-hidden />
      </button>
    </motion.div>
  );
}
