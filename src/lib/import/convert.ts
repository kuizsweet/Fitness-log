import {
  emptyWeight,
  newSet,
  newSession,
  type Session,
  type Weight,
} from "../domain";
import type { ImportRow } from "./parser";
export function importSessions(rows: ImportRow[]): Session[] {
  const sessions = new Map<string, Session>();
  for (const row of rows) {
    const sheet = row.source.slice(0, row.source.lastIndexOf(":"));
    const key = `${sheet}:${row.date}:${row.kind}`;
    let session = sessions.get(key);
    if (!session) {
      session = newSession(row.date);
      session.status = row.kind === "planned" ? "planned" : "completed";
      sessions.set(key, session);
    }
    let exercise = session.exercises.find(
      (e) => e.exercise_name === row.exercise && e.notes === row.equipment,
    );
    if (!exercise) {
      exercise = {
        id: crypto.randomUUID(),
        exercise_id: null,
        equipment_id: null,
        exercise_name: row.exercise,
        muscle_group: "",
        equipment_snapshot: null,
        notes: row.equipment,
        sets: [],
      };
      session.exercises.push(exercise);
    }
    for (let i = 0; i < row.sets; i++) {
      const set = newSet(row.unit, row.mode);
      const weight: Weight = {
        ...emptyWeight(row.unit, row.mode),
        value: row.weight,
      };
      set.weight =
        row.kind === "planned" ? emptyWeight(row.unit, row.mode) : weight;
      set.planned_weight = row.kind === "planned" ? weight : null;
      set.reps = row.reps;
      set.role = row.role;
      set.tags = row.tags;
      set.notes = `${row.notes}${row.notes ? "\n" : ""}来源 ${row.source}`;
      set.completed = row.kind === "actual";
      exercise.sets.push(set);
    }
  }
  return [...sessions.values()];
}
