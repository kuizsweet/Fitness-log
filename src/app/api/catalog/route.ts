import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
import { equipmentSchema, exerciseSchema } from "@/lib/domain";
import { allRows } from "@/lib/pagination";
export async function GET() {
  try {
    const { db } = await context();
    const [exercises, equipment] = await Promise.all([
      allRows(db.from("exercises").select("*").order("name").order("id")),
      allRows(db.from("equipment").select("*").order("name").order("id")),
    ]);
    return json({ exercises, equipment });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const input = z
      .object({ kind: z.enum(["exercises", "equipment"]), item: z.unknown() })
      .parse(await request.json());
    const item = (
      input.kind === "exercises" ? exerciseSchema : equipmentSchema
    ).parse(input.item);
    const result = await db
      .from(input.kind)
      .upsert({ ...item, user_id: user.id })
      .select()
      .single();
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
