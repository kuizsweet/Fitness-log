import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
import { dateSchema } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const p = new URL(request.url).searchParams;
    const id = z.uuid().parse(p.get("exercise"));
    const before = dateSchema.parse(p.get("before"));
    const result = await db
      .from("workout_sessions")
      .select(
        "training_date, workout_exercises!inner(exercise_name,workout_sets(*))",
      )
      .eq("workout_exercises.exercise_id", id)
      .is("deleted_at", null)
      .lt("training_date", before)
      .order("training_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    check(result.error);
    const records =
      result.data?.flatMap((s) =>
        s.workout_exercises.map((ex) => ({
          ...ex,
          workout_sessions: { training_date: s.training_date },
        })),
      ) ?? [];
    return json(records);
  } catch (e) {
    return failure(e);
  }
}
