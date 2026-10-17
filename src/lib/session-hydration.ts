import type { Session, WorkoutExercise, WorkoutSet } from "./domain";
// Full exports already fetched these rows. Hydrate them without another query
// per recorded date; interactive readers use the bounded training-read module.
type ExerciseRow = Omit<WorkoutExercise, "sets"> & {
  session_id: string;
  position: number;
};
type SetRow = WorkoutSet & { workout_exercise_id: string; position: number };
export function hydrateSessions(
  sessions: Omit<Session, "exercises">[],
  exercises: ExerciseRow[],
  sets: SetRow[],
): Session[] {
  const setMap = new Map<string, SetRow[]>();
  for (const set of sets) {
    const list = setMap.get(set.workout_exercise_id) ?? [];
    list.push(set);
    setMap.set(set.workout_exercise_id, list);
  }
  const exerciseMap = new Map<string, ExerciseRow[]>();
  for (const exercise of exercises) {
    const list = exerciseMap.get(exercise.session_id) ?? [];
    list.push(exercise);
    exerciseMap.set(exercise.session_id, list);
  }
  return sessions.map((s) => ({
    ...s,
    exercises: (exerciseMap.get(s.id) ?? [])
      .toSorted((a, b) => a.position - b.position)
      .map((e) => ({
        ...e,
        sets: (setMap.get(e.id) ?? []).toSorted(
          (a, b) => a.position - b.position,
        ),
      })),
  }));
}
