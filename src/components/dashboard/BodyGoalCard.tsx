"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import {
  bodyProgress,
  emptyGoal,
  parseBodyInput,
  type BodyGoal,
  type BodyMeasurement,
  type BodyMetric,
  type BodyOverview,
  type GoalField,
} from "@/lib/body-goals";
import { GoalEditor } from "@/lib/goal-editor";
import { MeasurementEditor } from "@/lib/measurement-editor";
import { goalDraftStorage } from "@/lib/goal-drafts";
import { useResource } from "../resource";
import { useResourceUser } from "../ResourceProvider";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "../ui/popover";
import grid from "./Dashboard.module.css";
import styles from "./BodyGoalCard.module.css";

const editors = new Map<string, GoalEditor>();
const measurementEditors = new Map<string, MeasurementEditor>();
function draftStorage(user: string) {
  try {
    return goalDraftStorage(localStorage, sessionStorage, user, () =>
      crypto.randomUUID(),
    );
  } catch {
    const unavailable = () => {
      throw new Error("本地草稿存储不可用");
    };
    return { read: unavailable, write: unavailable };
  }
}
export function BodyGoalCard() {
  const source = useResource<BodyOverview>("body", true);
  const reload = source.reload;
  const user = useResourceUser();
  const client = useQueryClient();
  const [editor, setEditor] = useState<GoalEditor | null>(null);
  const [measurementEditor, setMeasurementEditor] =
    useState<MeasurementEditor | null>(null);
  useEffect(() => {
    let instance = editors.get(user);
    if (!instance) {
      instance = new GoalEditor(
        draftStorage(user),
        async (flight) =>
          api<BodyGoal>(
            "body",
            {
              metric: flight.metric,
              mutation_id: flight.mutation_id,
              changes: flight.changes,
              expected_start: flight.expected_start,
              expected_target: flight.expected_target,
              owner_id: user,
            },
            "PATCH",
            { signal: AbortSignal.timeout(15000) },
          ),
        (goal) => {
          client.setQueryData<BodyOverview>(["body"], (old) => ({
            ...old,
            goals: [
              ...(old?.goals ?? []).filter((g) => g.metric !== goal.metric),
              goal,
            ],
            measurements: old?.measurements ?? [],
            confirmedGoals: [
              ...(old?.confirmedGoals ?? old?.goals ?? []).filter(
                (g) => g.metric !== goal.metric,
              ),
              goal,
            ],
          }));
        },
        () => crypto.randomUUID(),
      );
      editors.set(user, instance);
    }
    let readings = measurementEditors.get(user);
    if (!readings) {
      readings = new MeasurementEditor(
        draftStorage(`measurements:${user}`),
        (flight) =>
          api<BodyMeasurement>(
            "body",
            {
              id: flight.id,
              metric: flight.metric,
              value: flight.value,
              expected_value: flight.expected_value,
              owner_id: user,
            },
            "POST",
            { signal: AbortSignal.timeout(15000) },
          ),
        (m) =>
          client.setQueryData<BodyOverview>(["body"], (old) => ({
            ...old,
            goals: old?.goals ?? [],
            measurements: [
              ...(old?.measurements ?? []).filter((x) => x.metric !== m.metric),
              m,
            ],
            confirmedMeasurements: [
              ...(old?.confirmedMeasurements ?? old?.measurements ?? []).filter(
                (x) => x.metric !== m.metric,
              ),
              m,
            ],
          })),
        () => crypto.randomUUID(),
      );
      measurementEditors.set(user, readings);
    }
    setMeasurementEditor(readings);
    setEditor(instance);
    void instance.flush();
    void readings.flush();
    const resume = () => {
      if (document.visibilityState === "visible") {
        void instance.flush();
        void readings.flush();
        reload();
      }
    };
    const online = () => {
      void instance.flush();
      void readings.flush();
      reload();
    };
    const storage = (event: StorageEvent) => {
      if (event.key?.startsWith(`kuiz-body-draft:measurements:${user}:`))
        readings.otherTabChanged();
      if (event.key?.startsWith(`kuiz-body-draft:${user}:`))
        instance.otherTabChanged();
    };
    window.addEventListener("online", online);
    window.addEventListener("focus", resume);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", resume);
    return () => {
      void instance.flush();
      void readings.flush();
      window.removeEventListener("online", online);
      window.removeEventListener("focus", resume);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [user, client, reload]);
  useEffect(() => {
    if (source.data && editor) {
      editor.receive(source.data.confirmedGoals ?? source.data.goals);
      measurementEditor?.receive(
        source.data.confirmedMeasurements ?? source.data.measurements,
      );
      if (
        process.env.NODE_ENV === "development" &&
        !document.documentElement.dataset.kuizBodyReady
      ) {
        document.documentElement.dataset.kuizBodyReady = String(
          Math.round(performance.now()),
        );
        try {
          const loginStart = Number(sessionStorage.getItem("kuiz-login-start"));
          if (loginStart && Date.now() - loginStart < 30 * 60_000)
            document.documentElement.dataset.kuizLoginBodyMs = String(
              Date.now() - loginStart,
            );
        } catch {
          /* Optional local diagnostics must not break the page. */
        }
      }
    }
  }, [source.data, editor, measurementEditor]);
  return (
    <GoalView
      editor={editor}
      measurementEditor={measurementEditor}
      source={source}
    />
  );
}
const emptyState = { goals: [], drafts: {}, error: "", conflict: false };
const emptyMeasurements = {
  measurements: [],
  drafts: {},
  error: "",
  conflict: false,
};
const noSubscribe = () => () => {};
const getEmpty = () => emptyState;
const getEmptyMeasurements = () => emptyMeasurements;
function GoalView({
  editor,
  measurementEditor,
  source,
}: {
  editor: GoalEditor | null;
  measurementEditor: MeasurementEditor | null;
  source: ReturnType<typeof useResource<BodyOverview>>;
}) {
  const cache = useQueryClient();
  const user = useResourceUser();
  const cardRef = useRef<HTMLElement>(null);
  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [open, setOpen] = useState(false);
  const [metric, setMetric] = useState<BodyMetric>("weight");
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const measure = () =>
      setCardSize({ width: card.clientWidth, height: card.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      const remembered = localStorage.getItem(`kuiz-body-metric:${user}`);
      if (remembered === "weight" || remembered === "body_fat")
        setMetric(remembered);
    } catch {
      /* Optional display preference. */
    }
  }, [user]);
  const state = useSyncExternalStore(
    editor?.subscribe ?? noSubscribe,
    editor?.getSnapshot ?? getEmpty,
    getEmpty,
  );
  const readingState = useSyncExternalStore(
    measurementEditor?.subscribe ?? noSubscribe,
    measurementEditor?.getSnapshot ?? getEmptyMeasurements,
    getEmptyMeasurements,
  );
  function goalFor(m: BodyMetric) {
    return (
      state.goals.find((g) => g.metric === m) ??
      source.data?.goals.find((g) => g.metric === m) ??
      emptyGoal(m)
    );
  }
  function endpoint(m: BodyMetric, field: GoalField) {
    const draft = state.drafts[m]?.[field];
    return draft ? parseBodyInput(m, draft.text) : goalFor(m)[field];
  }
  function reading(m: BodyMetric) {
    const draft = readingState.drafts[m];
    return draft
      ? parseBodyInput(m, draft.text)
      : (source.data?.measurements.find((x) => x.metric === m)?.value ?? null);
  }
  const start = endpoint(metric, "start_value");
  const target = endpoint(metric, "target_value");
  const current = reading(metric);
  const progress = bodyProgress(start ?? null, target ?? null, current ?? null);
  const unit = metric === "weight" ? "kg" : "%";
  const name = metric === "weight" ? "体重" : "体脂率";
  const error = state.error || readingState.error || source.error;
  function field(m: BodyMetric, kind: GoalField | "current", label: string) {
    const draft =
      kind === "current" ? readingState.drafts[m] : state.drafts[m]?.[kind];
    const saved =
      kind === "current"
        ? source.data?.measurements.find((x) => x.metric === m)?.value
        : goalFor(m)[kind];
    const text = draft?.text ?? saved?.toString() ?? "";
    const parsed = parseBodyInput(m, text);
    const invalid =
      parsed === undefined ||
      (kind === "current" && Boolean(draft) && parsed === null);
    const errorId = `body-${m}-${kind}-error`;
    return (
      <label className={styles.dataField}>
        <span>{label}</span>
        <span className={styles.inputFrame}>
          <input
            data-slot="body-goal-input"
            aria-label={label}
            inputMode="decimal"
            value={text}
            placeholder="—"
            maxLength={7}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            disabled={!editor || !measurementEditor || !source.data}
            onChange={(e) => {
              const next = e.target.value;
              const value = parseBodyInput(m, next);
              if (kind === "current") {
                measurementEditor?.edit(m, next);
                if (value == null) return;
                cache.setQueryData<BodyOverview>(["body"], (old) =>
                  old
                    ? {
                        ...old,
                        confirmedMeasurements:
                          old.confirmedMeasurements ?? old.measurements,
                        measurements: [
                          ...old.measurements.filter((x) => x.metric !== m),
                          {
                            id: `pending-${m}`,
                            metric: m,
                            value,
                            measured_at: new Date().toISOString(),
                            source: "manual",
                            source_record_id: null,
                          },
                        ],
                      }
                    : old,
                );
              } else {
                editor?.edit(m, kind, next);
                if (value === undefined) return;
                cache.setQueryData<BodyOverview>(["body"], (old) =>
                  old
                    ? {
                        ...old,
                        confirmedGoals: old.confirmedGoals ?? old.goals,
                        goals: [
                          ...old.goals.filter((g) => g.metric !== m),
                          {
                            ...(old.goals.find((g) => g.metric === m) ??
                              emptyGoal(m)),
                            [kind]: value,
                          },
                        ],
                      }
                    : old,
                );
              }
            }}
            onBlur={() => {
              void editor?.flush();
              void measurementEditor?.flush();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          <span aria-hidden="true">{m === "weight" ? "kg" : "%"}</span>
        </span>
        {invalid && (
          <small id={errorId} role="alert">
            输入有效数值
          </small>
        )}
      </label>
    );
  }
  function display(value: number | null | undefined, label: string) {
    return (
      <span
        className={styles.endpoint}
        aria-label={`${label}${name} ${value ?? "未设置"}${value == null ? "" : unit}`}
      >
        <span>{value ?? "—"}</span>
        {value != null && <span className={styles.unit}>{unit}</span>}
      </span>
    );
  }
  return (
    <section
      ref={cardRef}
      className={`${grid.card} ${grid.bodyGoals} ${styles.card}`}
      aria-label={`${name}目标`}
      data-popover-open={open || undefined}
    >
      <div className={styles.toolbar}>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              void editor?.flush();
              void measurementEditor?.flush();
            }
          }}
        >
          <PopoverTrigger
            render={
              <Button className={`${styles.control} ${styles.dataTrigger}`} />
            }
            disabled={!source.data || !cardSize.width}
          >
            数据
          </PopoverTrigger>
          <PopoverContent
            container={cardRef}
            className={styles.dataPopup}
            align="start"
            style={
              {
                "--body-card-width": `${Math.max(0, cardSize.width - 16)}px`,
                "--body-card-height": `${Math.max(0, cardSize.height - 16)}px`,
              } as CSSProperties
            }
          >
            <PopoverTitle className={styles.srOnly}>身体数据</PopoverTitle>
            <div className={styles.dataGrid}>
              <fieldset className={styles.dataGroup}>
                <legend className={styles.srOnly}>体脂</legend>
                {field("body_fat", "start_value", "起始体脂")}
                {field("body_fat", "current", "目前体脂")}
                {field("body_fat", "target_value", "目标体脂")}
              </fieldset>
              <fieldset className={styles.dataGroup}>
                <legend className={styles.srOnly}>体重</legend>
                {field("weight", "start_value", "起始体重")}
                {field("weight", "current", "目前体重")}
                {field("weight", "target_value", "目标体重")}
              </fieldset>
            </div>
          </PopoverContent>
        </Popover>
        <div
          className={styles.percentage}
          aria-label={
            progress === null
              ? "暂无可计算进度"
              : `完成 ${Math.round(progress)}%`
          }
        >
          {progress !== null && (
            <>
              {Math.round(progress)}
              <span>%</span>
            </>
          )}
        </div>
        <Button
          className={`${styles.control} ${styles.toggle}`}
          onClick={() => {
            const next = metric === "weight" ? "body_fat" : "weight";
            setMetric(next);
            try {
              localStorage.setItem(`kuiz-body-metric:${user}`, next);
            } catch {
              /* Optional preference. */
            }
          }}
          aria-label={`切换为${metric === "weight" ? "体脂率" : "体重"}`}
        >
          {metric === "weight" ? "体脂" : "体重"}
        </Button>
      </div>
      <div className={styles.scale}>
        <Progress
          value={progress}
          aria-label={`${name}目标进度`}
          aria-valuetext={
            progress === null
              ? "缺少起始、目标或测量记录"
              : `${Math.round(progress)}%`
          }
        />
        <div className={styles.endpoints}>
          {display(start, "起始")}
          {display(target, "目标")}
        </div>
      </div>
      {current != null && (
        <p className={styles.current}>
          当前 {current} {unit}
        </p>
      )}
      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <Button
            onClick={async () => {
              try {
                const latest = await api<BodyOverview>("body");
                await editor?.retry(latest.goals);
                await measurementEditor?.retry(latest.measurements);
                source.reload();
              } catch {
                source.reload();
              }
            }}
          >
            重试
          </Button>
        </div>
      )}
    </section>
  );
}
