import type { SupabaseClient } from "@supabase/supabase-js";
import type { Meal, MealPhoto } from "./domain";
import { check } from "./api";
import { allRows } from "./pagination";
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
