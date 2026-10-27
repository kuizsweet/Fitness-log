"use client";
import type { Session } from "@/lib/domain";
import { useResource } from "../resource";
import styles from "./TrainingHistory.module.css";

export function TrainingHistory({ date }: { date: string }) {
  const records = useResource<Session[]>(
    `sessions?from=${date}&to=${date}&limit=100`,
  );
  const completed =
    records.data?.filter((session) => session.status === "completed") ?? [];
  return (
    <section className={styles.history} aria-label="实际训练成果">
      {records.loading ? (
        <p>读取中…</p>
      ) : records.error ? (
        <p role="alert">{records.error}</p>
      ) : !completed.length ? (
        <p>暂无训练记录</p>
      ) : (
        completed.map((session) => (
          <article key={session.id} className={styles.record}>
            <h3>{session.notes.split("\n")[0] || "训练记录"}</h3>
            {session.exercises.map((exercise) => (
              <div key={exercise.id} className={styles.exercise}>
                <strong>{exercise.exercise_name}</strong>
                {exercise.sets
                  .filter((set) => set.completed)
                  .map((set, index) => (
                    <div key={set.id} className={styles.set}>
                      <span>{index + 1}</span>
                      <span>
                        {set.weight.mode === "bodyweight"
                          ? "自重"
                          : set.weight.value === null
                            ? "—"
                            : `${set.weight.mode === "assistance" ? "辅助 " : set.weight.mode === "single" && !/肩推|推肩/.test(exercise.exercise_name) ? "单只 " : ""}${set.weight.value * (set.weight.mode === "single" && /肩推|推肩/.test(exercise.exercise_name) ? 2 : 1)} ${set.weight.unit}`}
                      </span>
                      <span>{set.reps} 次</span>
                    </div>
                  ))}
                {exercise.notes && (
                  <small>
                    {/肩推|推肩/.test(exercise.exercise_name)
                      ? exercise.notes
                          .replace(/哑铃单只重量[；;]?|单只重量[；;]?/g, "")
                          .trim()
                      : exercise.notes}
                  </small>
                )}
              </div>
            ))}
          </article>
        ))
      )}
    </section>
  );
}
