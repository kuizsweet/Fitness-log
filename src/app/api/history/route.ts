import { z } from "zod";
import { context, failure, json } from "@/lib/api";
import { dateSchema } from "@/lib/domain";
import { readExerciseHistory } from "@/lib/training-read";
export async function GET(request: Request) {
  try {
    const { db, user } = await context();
    const p = new URL(request.url).searchParams;
    const id = z.uuid().parse(p.get("exercise"));
    const before = dateSchema.parse(p.get("before"));
    const raw = p.get("equipment");
    const equipment = raw && raw !== "none" ? z.uuid().parse(raw) : raw;
    return json(await readExerciseHistory(db, user.id, id, before, equipment));
  } catch (e) {
    return failure(e);
  }
}
