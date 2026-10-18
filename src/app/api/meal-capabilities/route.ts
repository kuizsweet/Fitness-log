import { context, failure, json } from "@/lib/api";
export async function GET() {
  try {
    const { db } = await context();
    const [photo, meal] = await Promise.all([
      db.from("meal_photos").select("notes").limit(0),
      db.from("meal_entries").select("calories").limit(0),
    ]);
    const missing = new Set(["42703", "PGRST204"]);
    if (photo.error && !missing.has(photo.error.code)) throw photo.error;
    if (meal.error && !missing.has(meal.error.code)) throw meal.error;
    return json({ photoNotes: !photo.error, extendedMeals: !meal.error });
  } catch (error) {
    return failure(error);
  }
}
