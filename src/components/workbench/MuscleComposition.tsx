"use client";
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Pie, PieChart, type PieLabelRenderProps } from "recharts";
import { ChartContainer, type ChartConfig } from "../ui/chart";
import {
  planMuscleDistribution,
  type PlanExercise,
} from "@/lib/training-workbench";
import styles from "./MuscleComposition.module.css";
const EMPTY: PlanExercise[] = [];
const regions: Record<string, string[]> = {
  胸: ["上胸", "中胸", "下胸", "综合", "未细分"],
  背: ["背阔肌", "中背", "下背", "斜方肌", "未细分"],
  肩: ["三角肌", "前束", "中束", "后束", "未细分"],
  手臂: ["肱二头肌", "肱三头肌", "前臂", "未细分"],
  下肢: ["股四头肌", "腘绳肌", "臀肌", "小腿", "内收肌", "外展肌", "未细分"],
  核心: ["腹肌", "未细分"],
};
function subscribeReduced(change: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
}
export const MuscleComposition = memo(function MuscleComposition({
  exercises = EMPTY,
  preferredFamily,
  editing,
}: {
  exercises?: PlanExercise[];
  preferredFamily: string;
  editing: number;
}) {
  const distribution = useMemo(
    () => planMuscleDistribution(exercises),
    [exercises],
  );
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ left: 12, bottom: 12 });
  function toggle() {
    if (expanded) {
      setPosition({ left: 12, bottom: 12 });
      setExpanded(false);
      return;
    }
    const parent = panelRef.current?.parentElement;
    if (parent) {
      const box = parent.getBoundingClientRect();
      const width = Math.min(220, box.width - 24),
        height = Math.min(220, box.height - 24);
      const notes = Array.from(parent.querySelectorAll("article")).map((node) =>
        node.getBoundingClientRect(),
      );
      const candidates = [
        { left: 12, bottom: 12 },
        ...notes.map((rect) => ({
          left: 12,
          bottom: box.bottom - rect.top + 10,
        })),
        { left: 12, bottom: box.height - height - 12 },
        { left: Math.max(12, box.width - width - 12), bottom: 12 },
      ];
      const available = candidates.find(
        (pos) =>
          pos.bottom >= 12 &&
          pos.bottom + height <= box.height - 12 &&
          !notes.some(
            (rect) =>
              box.left + pos.left < rect.right + 8 &&
              box.left + pos.left + width > rect.left - 8 &&
              box.bottom - pos.bottom - height < rect.bottom + 8 &&
              box.bottom - pos.bottom > rect.top - 8,
          ),
      );
      setPosition(available ?? { left: 12, bottom: 12 });
    }
    setExpanded(true);
  }
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
  useEffect(() => {
    if (editing) {
      setExpanded(false);
      setPosition({ left: 12, bottom: 12 });
    }
  }, [editing]);
  const families = Object.keys(distribution);
  const family = families.includes(preferredFamily)
    ? preferredFamily
    : (families[0] ?? "");
  const { data, total, config } = useMemo(() => {
    const counts = distribution[family] ?? {};
    const labels = [
      ...new Set([...(regions[family] ?? []), ...Object.keys(counts)]),
    ];
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const data = labels.map((name, i) => ({
      name,
      sets: counts[name] ?? 0,
      fill: `var(--muscle-blue-${(i % 7) + 1})`,
      percentage: total ? ((counts[name] ?? 0) / total) * 100 : 0,
    }));
    const config = { sets: { label: "组数" } } satisfies ChartConfig;
    return { data, total, config };
  }, [distribution, family]);
  function sectorLabel(props: PieLabelRenderProps) {
    const item = data[Number(props.index)];
    if (!item?.sets) return null;
    const angle = (-Number(props.midAngle) * Math.PI) / 180;
    const radius =
      Number(props.outerRadius) * (item.percentage < 15 ? 0.77 : 0.58);
    const x = Number(props.cx) + Math.cos(angle) * radius;
    const y = Number(props.cy) + Math.sin(angle) * radius;
    return (
      <text
        className={styles.sectorLabel}
        fill={
          Number(props.index) % 7 === 3 || Number(props.index) % 7 === 4
            ? "#ecf3fa"
            : "#142638"
        }
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={item.percentage < 10 ? 8 : 11}
      >
        <tspan x={x} dy="-1.1em">
          {item.name}
        </tspan>
        <tspan x={x} dy="1.2em">
          {item.sets}组
        </tspan>
        <tspan x={x} dy="1.2em">
          {Math.round(item.percentage)}%
        </tspan>
      </text>
    );
  }
  return (
    <section
      ref={panelRef}
      style={position}
      className={styles.panel}
      data-expanded={expanded || undefined}
      role="button"
      tabIndex={0}
      aria-label={
        total
          ? (expanded ? "收起肌群饼图" : "展开肌群饼图") +
            "：" +
            family +
            "，" +
            data
              .filter((item) => item.sets)
              .map(
                (item) =>
                  item.name +
                  item.sets +
                  "组" +
                  Math.round(item.percentage) +
                  "%",
              )
              .join("，")
          : "肌群饼图，暂无训练组数"
      }
      aria-expanded={expanded}
      onClick={toggle}
      onKeyDown={(event) => {
        if (
          event.target === event.currentTarget &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          toggle();
        }
      }}
    >
      <div className={styles.chartFrame} aria-hidden="true">
        <ChartContainer
          config={config}
          className={styles.chart}
          initialDimension={{ width: 300, height: 300 }}
        >
          <PieChart>
            <Pie
              data={data}
              dataKey="sets"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={0}
              outerRadius={145}
              stroke="var(--shell-bg)"
              strokeWidth={1}
              label={sectorLabel}
              labelLine={false}
              isAnimationActive={!reduced}
              animationDuration={300}
              animationEasing="ease-in-out"
            />
          </PieChart>
        </ChartContainer>
        <div className={styles.empty} data-visible={!total || undefined} />
      </div>
    </section>
  );
});
