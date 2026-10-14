"use client";
import { useState } from "react";
import Link from "next/link";
import { useResource } from "./resource";
import { api } from "@/lib/client";
import {
  shiftDate,
  today,
  weightText,
  type Session,
  type Profile,
} from "@/lib/domain";
import { Feedback } from "./Feedback";
export function History() {
  const profile = useResource<Profile>("profile");
  const day = today(profile.data?.timezone);
  const [pickedFrom, setFrom] = useState("");
  const [pickedTo, setTo] = useState("");
  const from = pickedFrom || shiftDate(day, -30);
  const to = pickedTo || day;
  const [exercise, setExercise] = useState("");
  const [muscle, setMuscle] = useState("");
  const [deleted, setDeleted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const sessions = useResource<Session[]>(
    `sessions?from=${from}&to=${to}&deleted=${deleted ? "1" : "0"}`,
  );
  const exerciseNames = [
    ...new Set(
      sessions.data?.flatMap((s) => s.exercises.map((e) => e.exercise_name)),
    ),
  ];
  const muscleNames = [
    ...new Set(
      sessions.data
        ?.flatMap((s) => s.exercises.map((e) => e.muscle_group))
        .filter(Boolean),
    ),
  ];
  const visible =
    sessions.data?.filter(
      (s) =>
        s.exercises.some(
          (e) =>
            (!exercise || e.exercise_name === exercise) &&
            (!muscle || e.muscle_group === muscle),
        ) ||
        (!exercise && !muscle && !s.exercises.length),
    ) ?? [];
  return (
    <>
      <h1>历史查询</h1>
      <div className="row">
        <label>
          开始日期
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
        </label>
        <label>
          结束日期
          <input
            type="date"
            value={to}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </label>
        <label>
          动作
          <select
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
          >
            <option value="">全部动作</option>
            {exerciseNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          肌群
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            <option value="">全部肌群</option>
            {muscleNames.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <input
          type="checkbox"
          checked={deleted}
          onChange={(e) => setDeleted(e.target.checked)}
        />
        查看已删除训练
      </label>
      <Feedback
        error={sessions.error || error}
        loading={sessions.loading || busy}
      />
      {!sessions.loading && !sessions.error && !visible.length && (
        <p>该范围内没有符合条件的记录。</p>
      )}
      {visible.map((s) => (
        <article className="entry" key={s.id}>
          <h2>
            {s.training_date} · {s.status === "planned" ? "计划" : "训练"}
          </h2>
          {s.exercises
            .filter(
              (e) =>
                (!exercise || e.exercise_name === exercise) &&
                (!muscle || e.muscle_group === muscle),
            )
            .map((ex) => (
              <div key={ex.id}>
                <h3>
                  {ex.exercise_name} · {ex.equipment_snapshot?.name ?? ex.notes}
                </h3>
                {ex.sets.map((st, i) => (
                  <p key={st.id}>
                    第 {i + 1} 组 ·{" "}
                    {st.role === "work"
                      ? "正式"
                      : st.role === "warmup"
                        ? "热身"
                        : "补充"}{" "}
                    · {weightText(st.weight)} × {st.reps} 次{" "}
                    {st.tags.join("、")}
                    {st.planned_weight &&
                      ` · 计划 ${weightText(st.planned_weight)}`}
                  </p>
                ))}
              </div>
            ))}
          {deleted ? (
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api(
                    "sessions",
                    { id: s.id, revision: s.revision, restore: true },
                    "PATCH",
                  );
                  sessions.reload();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              恢复训练
            </button>
          ) : (
            <Link href={`/session/${s.id}`}>编辑记录</Link>
          )}
        </article>
      ))}
    </>
  );
}
