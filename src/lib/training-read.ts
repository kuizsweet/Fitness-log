import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, WorkoutExercise } from "./domain";
import { trainingRange, type CalendarTraining } from "./training-queries";

export type SessionRead = {
  user: string;
  from?: string;
  to?: string;
  id?: string;
  deleted?: boolean;
  states?: Session["status"][];
  type?: "strength" | "cardio";
  limit?: number;
  offset?: number;
  ascending?: boolean;
};

// One bounded PostgREST request, including only the selected roots' children.
// No date scans, allRows loops, or reads of other sessions on the same day.
export async function readTraining(
  db: SupabaseClient,
  options: SessionRead,
): Promise<Session[]> {
  const range = trainingRange(options.from, options.to);
  if (!options.id && !range) return [];
  const limit = Math.min(101, Math.max(1, options.limit ?? 50));
  const offset = Math.max(0, options.offset ?? 0);
  let query = db
    .from("workout_sessions")
    .select("*,exercises:workout_exercises(*,sets:workout_sets(*))")
    .eq("user_id", options.user);
  if (options.id) query = query.eq("id", options.id);
  else
    query = query
      .gte("training_date", range!.from)
      .lte("training_date", range!.to);
  query = options.deleted
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null);
  if (options.states) query = query.in("status", options.states);
  if (options.type) query = query.eq("training_type", options.type);
  const ascending = options.ascending ?? false;
  const result = await query
    .order("training_date", { ascending })
    .order("created_at", { ascending })
    .order("id", { ascending })
    .range(offset, offset + limit - 1);
  if (result.error) throw new Error(result.error.message);
  type Positioned = Omit<WorkoutExercise, "sets"> & {
    position: number;
    sets: (WorkoutExercise["sets"][number] & { position: number })[];
  };
  return (result.data as unknown as Session[]).map((s) => ({
    ...s,
    exercises: (s.exercises as Positioned[])
      .toSorted((a, b) => a.position - b.position)
      .map((e) => ({
        ...e,
        sets: e.sets.toSorted((a, b) => a.position - b.position),
      })),
  }));
}

export async function readTrainingCalendar(
  db: SupabaseClient,
  from: string,
  to: string,
): Promise<CalendarTraining[]> {
  const range = trainingRange(from, to);
  if (!range) return [];
  const result = await db.rpc("training_calendar", {
    p_from: range.from,
    p_to: range.to,
  });
  if (result.error) throw new Error(result.error.message);
  return result.data ?? [];
}

export async function readExerciseHistory(
  db: SupabaseClient,
  user: string,
  exercise: string,
  before: string,
  equipment: string | null,
) {
  const range = trainingRange(undefined, before);
  if (!range || before <= range.from) return [];
  let query = db
    .from("workout_sessions")
    .select(
      "training_date,workout_exercises!inner(exercise_name,equipment_id,equipment_snapshot,workout_sets!inner(*))",
    )
    .eq("user_id", user)
    .eq("training_type", "strength")
    .eq("workout_exercises.exercise_id", exercise)
    .eq("workout_exercises.workout_sets.completed", true)
    .is("deleted_at", null)
    .neq("status", "planned")
    .gte("training_date", range.from)
    .lte("training_date", range.to)
    .lt("training_date", before)
    .order("training_date", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1);
  if (equipment === "none")
    query = query.is("workout_exercises.equipment_id", null);
  else if (equipment)
    query = query.eq("workout_exercises.equipment_id", equipment);
  const result = await query;
  if (result.error) throw new Error(result.error.message);
  return (
    result.data?.flatMap((s) =>
      s.workout_exercises.map((ex) => ({
        ...ex,
        workout_sessions: { training_date: s.training_date },
      })),
    ) ?? []
  );
}
