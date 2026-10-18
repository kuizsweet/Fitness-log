import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
import { dateSchema, type Meal, type MealPhoto } from "@/lib/domain";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const params = new URL(request.url).searchParams;
    const offset = z.coerce
      .number()
      .int()
      .min(0)
      .max(100000)
      .parse(params.get("offset") ?? 0);
    const date = params.has("date")
      ? dateSchema.parse(params.get("date"))
      : undefined;
    let query = db
      .from("meal_photos")
      .select("*,meal:meal_entries!inner(id,meal_date,meal_type,notes)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 24);
    if (date) query = query.eq("meal.meal_date", date);
    const result = await query;
    check(result.error);
    const rows = result.data as unknown as (MealPhoto & {
      meal: Pick<Meal, "id" | "meal_date" | "meal_type" | "notes" | "calories">;
    })[];
    const photos = await Promise.all(
      rows.slice(0, 24).map(async (photo) => {
        const signed = await db.storage
          .from("meal-photos")
          .createSignedUrl(photo.storage_path, 600);
        check(signed.error);
        return { ...photo, url: signed.data?.signedUrl };
      }),
    );
    return json({ photos, nextOffset: rows.length > 24 ? offset + 24 : null });
  } catch (error) {
    return failure(error);
  }
}
