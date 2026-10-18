import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
import { dateSchema } from "@/lib/domain";
import { mealsQuery } from "@/lib/repository";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const p = new URL(request.url).searchParams;
    const date = dateSchema.parse(p.get("date"));
    return json(await mealsQuery(db, date, date));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const meal = z
      .object({
        meal_date: dateSchema,
        meal_type: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        calories: z.number().int().min(0).max(20000).nullable().optional(),
        notes: z.string().max(4000),
      })
      .parse(await request.json());
    const result = await db
      .from("meal_entries")
      .upsert(
        { ...meal, user_id: user.id },
        { onConflict: "user_id,meal_date,meal_type" },
      )
      .select()
      .single();
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
