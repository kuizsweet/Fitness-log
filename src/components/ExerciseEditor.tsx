"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import {
  weightText,
  newSet,
  type WorkoutExercise,
  type Equipment,
  type WorkoutSet,
} from "@/lib/domain";
import { SetEditor } from "./SetEditor";
import { Feedback } from "./Feedback";
type History = {
  exercise_name: string;
  workout_sessions: { training_date: string };
  workout_sets: (WorkoutSet & { position: number })[];
};
export function ExerciseEditor({
  exercise: ex,
  equipment,
  date,
  change,
  remove,
  move,
  first,
  last,
  disabled = false,
  defaultUnit = "kg",
}: {
  exercise: WorkoutExercise;
  equipment: Equipment[];
  date: string;
  change: (e: WorkoutExercise) => void;
  remove: () => void;
  move: (step: number) => void;
  first: boolean;
  last: boolean;
  disabled?: boolean;
  defaultUnit?: "kg" | "lb";
}) {
  const [history, setHistory] = useState<History[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function moveSet(index: number, direction: number) {
    const sets = [...ex.sets];
    [sets[index], sets[index + direction]] = [
      sets[index + direction],
      sets[index],
    ];
    change({ ...ex, sets });
  }
  return (
    <fieldset disabled={disabled}>
      <legend>{ex.exercise_name}</legend>
      <div className="row">
        <label>
          器材
          <select
            value={ex.equipment_id ?? ""}
            onChange={(e) => {
              const selected =
                equipment.find((item) => item.id === e.target.value) ?? null;
              change({
                ...ex,
                equipment_id: selected?.id ?? null,
                equipment_snapshot: selected,
              });
            }}
          >
            <option value="">不关联器材 / 手动确认计量</option>
            {equipment
              .filter(
                (e) => (!e.hidden && !e.deleted_at) || e.id === ex.equipment_id,
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        {ex.equipment_snapshot && (
          <small>历史快照：{ex.equipment_snapshot.name}</small>
        )}
      </div>
      {ex.sets.length > 0 && (
        <small>
          更换器材只影响新组的默认值。已有组保留原始重量规则，请逐组核对。
        </small>
      )}
      {ex.sets.map((set, index) => (
        <SetEditor
          key={set.id}
          set={set}
          index={index}
          last={index === ex.sets.length - 1}
          equipment={ex.equipment_snapshot}
          change={(s) =>
            change({
              ...ex,
              sets: ex.sets.map((st) => (st.id === s.id ? s : st)),
            })
          }
          move={(step) => moveSet(index, step)}
          remove={() => {
            if (confirm("删除这一组？保存训练后生效。"))
              change({ ...ex, sets: ex.sets.filter((s) => s.id !== set.id) });
          }}
        />
      ))}
      <div className="row">
        <button
          onClick={() => {
            const set = newSet(
              ex.equipment_snapshot?.unit ?? defaultUnit,
              ex.equipment_snapshot?.rule,
            );
            if (ex.equipment_snapshot)
              set.weight.base = ex.equipment_snapshot.initial_weight;
            change({ ...ex, sets: [...ex.sets, set] });
          }}
        >
          增加组
        </button>
        <button
          disabled={!ex.sets.length}
          onClick={() => {
            const previous = ex.sets.at(-1)!;
            change({
              ...ex,
              sets: [
                ...ex.sets,
                {
                  ...previous,
                  id: crypto.randomUUID(),
                  tags: [...previous.tags],
                  weight: { ...previous.weight },
                  completed: false,
                  completed_at: null,
                  started_at: null,
                  rest_ends_at: null,
                },
              ],
            });
          }}
        >
          复制上一组
        </button>
        <button
          disabled={busy || !ex.exercise_id}
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              setHistory(
                await api<History[]>(
                  `history?exercise=${ex.exercise_id}&before=${date}`,
                ),
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          查看上次训练
        </button>
      </div>
      {history && (
        <details open>
          <summary>该动作最近记录</summary>
          {history.length ? (
            history.slice(0, 1).map((h, i) => (
              <div key={i}>
                <p>{h.workout_sessions.training_date}</p>
                {h.workout_sets
                  .sort((a, b) => a.position - b.position)
                  .map((s) => (
                    <p key={s.id}>
                      {weightText(s.weight)} × {s.reps} 次 · {s.role}
                    </p>
                  ))}
              </div>
            ))
          ) : (
            <p>当前日期之前没有该动作的记录。</p>
          )}
        </details>
      )}
      <Feedback error={error} loading={busy} />
      <label>
        动作备注
        <textarea
          value={ex.notes}
          onChange={(e) => change({ ...ex, notes: e.target.value })}
        />
      </label>
      <div className="row">
        <button disabled={first} onClick={() => move(-1)}>
          动作上移
        </button>
        <button disabled={last} onClick={() => move(1)}>
          动作下移
        </button>
        <button onClick={remove}>删除动作</button>
      </div>
    </fieldset>
  );
}
