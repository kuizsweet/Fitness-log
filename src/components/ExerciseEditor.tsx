"use client";
import {
  newSet,
  type WorkoutExercise,
  type Equipment,
  type WorkoutSet,
} from "@/lib/domain";
import { repeatSet } from "@/lib/training";
import { useResource } from "./resource";
import { SetEditor } from "./SetEditor";
import { Feedback } from "./Feedback";
import styles from "./Training.module.css";

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
  onComplete,
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
  onComplete?: (id: string, completed: boolean) => void;
}) {
  const history = useResource<History[]>(
    `history?exercise=${ex.exercise_id}&before=${date}&equipment=${ex.equipment_id ?? "none"}`,
    false,
    Boolean(ex.exercise_id),
  );
  const previous = history.data?.find((h) =>
    h.workout_sets.some((s) => s.completed),
  );
  const previousSets =
    previous?.workout_sets
      .filter((s) => s.completed)
      .toSorted((a, b) => a.position - b.position) ?? [];
  function moveSet(index: number, step: number) {
    const sets = [...ex.sets];
    [sets[index], sets[index + step]] = [sets[index + step], sets[index]];
    change({ ...ex, sets });
  }
  return (
    <fieldset className={styles.exercise} disabled={disabled}>
      <legend className={styles.srOnly}>{ex.exercise_name}</legend>
      <div className={styles.exerciseHeader}>
        <div>
          <h2>{ex.exercise_name}</h2>
          <small>
            {ex.muscle_group}
            {ex.equipment_snapshot ? ` · ${ex.equipment_snapshot.name}` : ""}
          </small>
        </div>
        <small>
          {previous
            ? `上次 ${previous.workout_sessions.training_date}`
            : history.loading
              ? "正在读取历史…"
              : "暂无已完成记录"}
        </small>
      </div>
      <Feedback error={history.error} />
      {history.error && <button onClick={history.reload}>重试历史记录</button>}
      <table
        className={styles.table}
        aria-label={`${ex.exercise_name}逐组记录`}
      >
        <thead>
          <tr>
            <th scope="col">组</th>
            <th scope="col">上次</th>
            <th scope="col">重量</th>
            <th scope="col">次数</th>
            <th scope="col">完成</th>
            <th scope="col">设置</th>
          </tr>
        </thead>
        {!ex.sets.length && (
          <tbody>
            <tr>
              <td colSpan={6} className={styles.muted}>
                尚未添加组
              </td>
            </tr>
          </tbody>
        )}
        {ex.sets.map((set, index) => (
          <SetEditor
            key={set.id}
            set={set}
            index={index}
            last={index === ex.sets.length - 1}
            previous={
              previousSets.filter((previous) => previous.role === set.role)[
                ex.sets
                  .slice(0, index)
                  .filter((current) => current.role === set.role).length
              ]
            }
            equipment={ex.equipment_snapshot}
            change={(s) =>
              change({
                ...ex,
                sets: ex.sets.map((st) => (st.id === s.id ? s : st)),
              })
            }
            onComplete={onComplete}
            move={(step) => moveSet(index, step)}
            remove={() => {
              if (confirm("删除这一组？保存训练后生效。"))
                change({ ...ex, sets: ex.sets.filter((s) => s.id !== set.id) });
            }}
          />
        ))}
      </table>
      <div className={styles.exerciseActions}>
        <button
          onClick={() => {
            const set = newSet(
              ex.equipment_snapshot?.unit ?? defaultUnit,
              ex.equipment_snapshot?.rule,
            );
            set.weight.base = ex.equipment_snapshot?.initial_weight ?? null;
            change({ ...ex, sets: [...ex.sets, set] });
          }}
        >
          增加组
        </button>
        <button
          disabled={!ex.sets.length}
          onClick={() =>
            change({ ...ex, sets: [...ex.sets, repeatSet(ex.sets.at(-1)!)] })
          }
        >
          复制上一组
        </button>
        {!!previousSets.length && (
          <button
            onClick={() => {
              if (!ex.sets.length || confirm("用上次已完成的组替换当前组？"))
                change({ ...ex, sets: previousSets.map(repeatSet) });
            }}
          >
            沿用上次
          </button>
        )}
      </div>
      <details className={styles.settings}>
        <summary>动作设置</summary>
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
            <option value="">手动设置计量</option>
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
        {!!ex.sets.length && (
          <small className={styles.muted}>
            更换器材仅影响新组，已有组保留原计量规则。
          </small>
        )}
        <label>
          动作备注
          <textarea
            maxLength={2000}
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
      </details>
    </fieldset>
  );
}
