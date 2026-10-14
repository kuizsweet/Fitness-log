import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Session,
  WorkoutExercise,
  WorkoutSet,
  Meal,
  MealPhoto,
} from "./domain";
import { check } from "./api";
import { allRows } from "./pagination";
export async function sessionsQuery(
  db: SupabaseClient,
  from: string,
  to: string,
  deleted = false,
  states?: Session["status"][],
): Promise<Session[]> {
  let query = db
    .from("workout_sessions")
    .select("*")
    .gte("training_date", from)
    .lte("training_date", to)
    .order("training_date")
    .order("created_at")
    .order("id");
  if (states) query = query.in("status", states);
  query = deleted
    ? query.not("deleted_at", "is", null)
    : query.is("deleted_at", null);
  const sessions = (await allRows(query)) as Omit<Session, "exercises">[];
  if (!sessions.length) return [];
  const exercises: (Omit<WorkoutExercise, "sets"> & {
    session_id: string;
    position: number;
  })[] = [];
  for (let start = 0; start < sessions.length; start += 100)
    exercises.push(
      ...((await allRows(
        db
          .from("workout_exercises")
          .select("*")
          .in(
            "session_id",
            sessions.slice(start, start + 100).map((s) => s.id),
          )
          .order("position")
          .order("id"),
      )) as typeof exercises),
    );
  const sets: (WorkoutSet & {
    workout_exercise_id: string;
    position: number;
  })[] = [];
  for (let start = 0; start < exercises.length; start += 100)
    sets.push(
      ...((await allRows(
        db
          .from("workout_sets")
          .select("*")
          .in(
            "workout_exercise_id",
            exercises.slice(start, start + 100).map((e) => e.id),
          )
          .order("position")
          .order("id"),
      )) as typeof sets),
    );
  return sessions.map((s) => ({
    ...s,
    exercises: exercises
      .filter((e) => e.session_id === s.id)
      .map((e) => ({
        ...e,
        sets: sets.filter((st) => st.workout_exercise_id === e.id),
      })),
  }));
}
export async function mealsQuery(
  db: SupabaseClient,
  from: string,
  to: string,
): Promise<Meal[]> {
  const roots = await db
    .from("meal_entries")
    .select("*")
    .gte("meal_date", from)
    .lte("meal_date", to);
  check(roots.error);
  const meals = roots.data as Omit<Meal, "photos">[];
  if (!meals.length) return [];
  const result = await allRows(
    db
      .from("meal_photos")
      .select("*")
      .in(
        "meal_id",
        meals.map((m) => m.id),
      )
      .order("created_at")
      .order("id"),
  );
  const photos = await Promise.all(
    (result as MealPhoto[]).map(async (p) => {
      const signed = await db.storage
        .from("meal-photos")
        .createSignedUrl(p.storage_path, 600);
      check(signed.error);
      return { ...p, url: signed.data?.signedUrl };
    }),
  );
  return meals.map((m) => ({
    ...m,
    photos: photos.filter((p) => p.meal_id === m.id),
  }));
}
