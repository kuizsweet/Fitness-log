"use client";
import { useEffect, useRef, useState } from "react";
import { useResourceUser } from "../ResourceProvider";
import { readWorkbench, type PlanNote } from "@/lib/training-workbench";
import { today, type Session } from "@/lib/domain";
import { api } from "@/lib/client";
import {
  beginTraining,
  segmentElapsed,
  pauseTraining,
  adjustTraining,
  completeTrainingSet,
  finishTrainingRest,
  recordTrainingRir,
  readTrainingRun,
  trainingSessions,
  type TrainingRun,
} from "@/lib/training-run";
import { noteTrainingType } from "@/lib/cardio";
import styles from "./TrainingConsoleDemo.module.css";

const kinds = { warmup: "热身组", working: "正式组", backoff: "回退组" };
function time(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function TrainingConsole() {
  const user = useResourceUser();
  return <Console key={user} user={user} />;
}
function Console({ user }: { user: string }) {
  const [plan, setPlan] = useState<PlanNote | null>(null);
  const [cardioPlan, setCardioPlan] = useState<PlanNote | null>(null);
  const [selectedType, setSelectedType] = useState<"strength" | "cardio" | null>(null);
  const [tomorrowPlans, setTomorrowPlans] = useState<PlanNote[]>([]);
  const [run, setRun] = useState<TrainingRun | null>(null);
  const runRef = useRef<TrainingRun | null>(null),
    snapshot = useRef<string | null>(null),
    lastPress = useRef(0);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [now, setNow] = useState(0);
  const [date] = useState(() => today());
  const key = `kuizfit:training-run:v1:${user}:${date}`;
  useEffect(() => {
    function loadPlan() {
      try {
        const source = `kuizfit:workbench:v1:${user}`;
        const state = readWorkbench(
          localStorage.getItem(`${source}:drafts`) ??
            localStorage.getItem(source),
        );
        const assigned = state.notes.filter((note) => state.assignments[date]?.includes(note.id));
        const strengthNotes = state.notes.filter((note) => noteTrainingType(note) === "strength");
        const cardioNotes = state.notes.filter((note) => noteTrainingType(note) === "cardio");
        setPlan(assigned.find(note => noteTrainingType(note) === "strength") ??
          strengthNotes.find(note => /胸.*三头/.test(note.title)) ?? strengthNotes[0] ?? null);
        setCardioPlan(assigned.find(note => noteTrainingType(note) === "cardio") ?? cardioNotes[0] ?? null);
        const tomorrow = new Date(`${date}T00:00:00Z`);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
        const tomorrowDate = tomorrow.toISOString().slice(0, 10);
        setTomorrowPlans(state.notes.filter((note) =>
          state.assignments[tomorrowDate]?.includes(note.id),
        ));
      } catch {
        setError("无法读取训练便签，请到配置页检查。");
      }
    }
    function loadRun() {
      try {
        const raw = localStorage.getItem(key);
        const value = readTrainingRun(raw);
        snapshot.current = raw;
        runRef.current = value;
        setRun(value);
        setNow(Date.now());
        setReady(true);
      } catch {
        setError("训练记录读取失败，未覆盖原记录。");
      }
    }
    loadPlan();
    loadRun();
    const changed = (event: StorageEvent) => {
      if (event.key === key) loadRun();
      else if (event.key?.startsWith(`kuizfit:workbench:v1:${user}`))
        loadPlan();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("focus", loadPlan);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", loadPlan);
    };
  }, [key, user, date]);
  const anchorMs = run?.anchorMs ?? null;
  useEffect(() => {
    if (anchorMs === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 200);
    const visible = () => setNow(Date.now());
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [anchorMs]);
  function commit(next: TrainingRun | null) {
    try {
      if (localStorage.getItem(key) !== snapshot.current)
        throw Error("训练已在其他窗口更新，请刷新后继续。");
      const raw = next ? JSON.stringify(next) : null;
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
      snapshot.current = raw;
      runRef.current = next;
      setRun(next);
      setNow(Date.now());
      setError("");
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，本次操作未生效。");
      return false;
    }
  }
  function change(action: (run: TrainingRun) => TrainingRun) {
    try {
      if (runRef.current) commit(action(runRef.current));
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }
  async function sync(value: TrainingRun) {
    setSaving(true);
    try {
      let revision = value.revision;
      for (const session of trainingSessions(value)) {
        const existing = await api<Session[]>(`sessions?id=${session.id}`);
        const prior = existing[0];
        if (prior && (prior.status !== "completed" || Date.parse(prior.started_at ?? "") !== Date.parse(session.started_at ?? "") ||
          prior.exercises.reduce((sum, e) => sum + e.sets.length, 0) !== session.exercises.reduce((sum, e) => sum + e.sets.length, 0)))
          throw Error("云端记录已有变更，请先核对训练历史。");
        const saved = prior ?? await api<{ id: string; revision: number }>("sessions", session);
        revision = saved.revision;
      }
      const current = runRef.current;
      if (current?.id === value.id)
        commit({ ...current, revision, synced: true });
    } catch (e) {
      setError(
        `已保存在本机，数据库保存失败：${e instanceof Error ? e.message : "请重试"}`,
      );
    } finally {
      setSaving(false);
    }
  }
  function primary() {
    const stamp = Date.now();
    if (stamp - lastPress.current < 350) return;
    lastPress.current = stamp;
    try {
      const current = runRef.current;
      if (!current) return;
      const next =
        current.phase === "working"
          ? completeTrainingSet(current, stamp)
          : finishTrainingRest(current, stamp);
      if (commit(next) && next.phase === "completed") void sync(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    }
  }
  const current = run?.queue[run.cursor],
    previous = run?.logs.at(-1),
    next = run?.queue[(run?.cursor ?? 0) + 1];
  const finished = run?.phase === "completed",
    paused = Boolean(run && run.anchorMs === null && !finished);
  const elapsed = run
    ? finished
      ? run.logs.reduce((sum, log) => sum + log.workMs + log.restMs, 0)
      : segmentElapsed(run, now)
    : 0;
  return (
    <div className={styles.demo} data-idle={!run || undefined}>
      <div className={styles.rest} data-active={Boolean(run) || undefined}>
        {finished && (
          <button
            className={styles.reset}
            disabled={saving}
            onClick={() => {
              const completed = runRef.current;
              if (completed?.phase !== "completed") return;
              try {
                localStorage.setItem(
                  `kuizfit:training-run:archive:v1:${user}:${completed.id}`,
                  JSON.stringify(completed),
                );
                commit(null);
              } catch {
                setError("训练记录保留失败，暂未重置，请重试。");
              }
            }}
          >
            重置
          </button>
        )}
        {run && (
          <span className={styles.badge} data-paused={paused || undefined}>
            {finished
              ? "已完成"
              : paused
                ? "已暂停"
                : run.phase === "resting"
                  ? "休息中"
                  : "训练中"}
          </span>
        )}
        <span className={styles.timerLabel}>
          {!run
            ? "准备开始"
            : finished
              ? "训练与休息总计时"
              : run.phase === "resting"
                ? "组间休息计时"
                : current?.cardio ? "有氧训练计时" : "本组训练计时"}
        </span>
        <strong className={styles.time} role="timer" aria-label="当前计时">
          {time(elapsed)}
        </strong>
        <div className={styles.timerActions} aria-label="计时控制">
          {[-15, -5].map((n) => (
            <button
              key={n}
              disabled={!run || finished}
              onClick={() => change((r) => adjustTraining(r, n, Date.now()))}
            >
              {n} 秒
            </button>
          ))}
          <button
            disabled={!run || finished}
            onClick={() => change((r) => pauseTraining(r, Date.now()))}
          >
            {paused ? "继续" : "暂停"}
          </button>
          {[5, 15].map((n) => (
            <button
              key={n}
              disabled={!run || finished}
              onClick={() => change((r) => adjustTraining(r, n, Date.now()))}
            >
              +{n} 秒
            </button>
          ))}
        </div>
      </div>
      {!run ? (
        <>
          <div className={`${styles.planColumns} ${styles.idlePlans}`}>
            <section>
              <h3 className={styles.planHeading}>力量计划<input type="checkbox" aria-label="选择力量计划" disabled={!plan}
                checked={Boolean(plan && selectedType === "strength")} onChange={(event) => setSelectedType(event.target.checked ? "strength" : null)} /></h3>
              {plan ? (
                <>
                  <strong>{plan.title}</strong>
                  <ol className={styles.planExercises}>
                    {plan.exercises.map((exercise) => (
                      <li key={exercise.id}>{exercise.name}</li>
                    ))}
                  </ol>
                </>
              ) : (
                <span>暂无力量计划</span>
              )}
            </section>
            <section>
              <h3 className={styles.planHeading}>有氧计划<input type="checkbox" aria-label="选择有氧计划" disabled={!cardioPlan}
                checked={Boolean(cardioPlan && selectedType === "cardio")} onChange={(event) => setSelectedType(event.target.checked ? "cardio" : null)} /></h3>
              {cardioPlan ? <><strong>{cardioPlan.title}</strong><ol className={styles.planExercises}>
                {cardioPlan.exercises.map(exercise => <li key={exercise.id}>{exercise.name}</li>)}
              </ol></> : <span>暂无有氧计划</span>}
            </section>
          </div>
          <button
            className={styles.complete}
            disabled={!ready || !(selectedType === "strength" ? plan : selectedType === "cardio" ? cardioPlan : null)}
            onClick={() => {
              const chosen = selectedType === "strength" ? plan : selectedType === "cardio" ? cardioPlan : null;
              if (!chosen) return;
              try {
                commit(beginTraining(chosen, date, Date.now()));
              } catch (e) {
                setError(e instanceof Error ? e.message : "无法开始训练");
              }
            }}
          >
            开始训练
          </button>
        </>
      ) : (
        <>
          {!finished && current && (
            <>
              <div className={styles.exercise}>
                <div>
                  <span>当前动作</span>
                  <strong>{current.name}</strong>
                  {!current.cardio && <span>第 {current.ordinal} / {current.count} 组 · {kinds[current.kind]}</span>}
                </div>

              </div>
              {current.cardio ? null : run.phase === "working" ? (
                <div className={styles.actualFields}>
                  <label>
                    本组重量{" "}
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={0.5}
                      value={current.weight ?? ""}
                      placeholder="kg"
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? null : Number(e.target.value);
                        if (
                          value !== null &&
                          (!Number.isFinite(value) ||
                            value < 0 ||
                            value > 10000)
                        )
                          return;
                        change((r) => ({
                          ...r,
                          queue: r.queue.map((s, i) =>
                            i === r.cursor ? { ...s, weight: value } : s,
                          ),
                        }));
                      }}
                    />{" "}
                    kg
                  </label>
                  <label>
                    次数{" "}
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      step={1}
                      value={current.reps ?? ""}
                      placeholder="次"
                      onChange={(e) => {
                        const value =
                          e.target.value === "" ? null : Number(e.target.value);
                        if (
                          value !== null &&
                          (!Number.isInteger(value) ||
                            value < 0 ||
                            value > 1000)
                        )
                          return;
                        change((r) => ({
                          ...r,
                          queue: r.queue.map((s, i) =>
                            i === r.cursor ? { ...s, reps: value } : s,
                          ),
                        }));
                      }}
                    />{" "}
                    次
                  </label>
                </div>
              ) : (
                <fieldset className={styles.rir}>
                  <legend>上一组距离力竭还有几次？（RIR）</legend>
                  <div className={styles.choices}>
                    {(["0", "1", "2", "3+"] as const).map((value) => (
                      <button
                        key={value}
                        aria-pressed={previous?.rir === value}
                        onClick={() =>
                          change((r) =>
                            recordTrainingRir(
                              r,
                              previous?.rir === value ? null : value,
                            ),
                          )
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                  <p>RIR 0 = 已无法以标准动作再完成一次。</p>
                </fieldset>
              )}
              {run.phase === "resting" && next && (
                <p className={styles.next}>
                  {next.exerciseKey === current.exerciseKey
                    ? `下一组：第 ${next.ordinal} / ${next.count} 组`
                    : `下一动作：${next.name}`}
                </p>
              )}
              <button
                className={`${styles.complete} ${styles.trainingAction}`}
                disabled={saving || (run.phase === "resting" && previous?.rir == null)}
                onClick={primary}
              >
                {run.phase === "working"
                  ? current.cardio ? "完成有氧训练" : "完成本组并开始休息"
                  : next
                    ? next.exerciseKey === current.exerciseKey
                      ? "结束休息，开始下一组"
                      : "结束休息，开始下一个动作"
                    : "结束训练并保存"}
              </button>

            </>
          )}
          {finished && !run.synced && error && (
            <button className={styles.textButton} disabled={saving} onClick={() => void sync(run)}>
              重试保存
            </button>
          )}
          {finished && (
            <div className={styles.planColumns}>
              <section>
                <h3>明日待训 · 力量</h3>
                {tomorrowPlans.length ? tomorrowPlans.map((note) => (
                  <strong key={note.id}>{note.title}</strong>
                )) : <span>暂无力量计划</span>}
              </section>
              <section>
                <h3>有氧训练</h3>
                <span>暂无有氧计划</span>
              </section>
            </div>
          )}
        </>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
