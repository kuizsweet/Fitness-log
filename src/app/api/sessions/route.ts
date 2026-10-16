import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { dateSchema, sessionSchema } from "@/lib/domain";
import { sessionsQuery } from "@/lib/repository";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const p = new URL(request.url).searchParams;
    if (p.get("active") === "1")
      return json(
        await sessionsQuery(db, "0001-01-01", "9999-12-31", false, [
          "in_progress",
          "paused",
        ]),
      );
    if (p.get("planned") === "1")
      return json(
        await sessionsQuery(
          db,
          p.has("from") ? dateSchema.parse(p.get("from")) : "0001-01-01",
          "9999-12-31",
          false,
          ["planned"],
        ),
      );
    if (p.has("id")) {
      const id = z.uuid().parse(p.get("id"));
      const root = await db
        .from("workout_sessions")
        .select("training_date")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      check(root.error);
      if (!root.data) return json([]);
      const all = await sessionsQuery(
        db,
        root.data.training_date,
        root.data.training_date,
      );
      return json(all.filter((s) => s.id === id));
    }
    const from = dateSchema.parse(p.get("from"));
    const to = dateSchema.parse(p.get("to"));
    if (from > to) throw new ApiError("日期范围无效");
    return json(await sessionsQuery(db, from, to, p.get("deleted") === "1"));
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db } = await context(request);
    const session = sessionSchema.parse(await request.json());
    const result = await db.rpc("save_workout", { payload: session });
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db } = await context(request);
    const data = z
      .object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        restore: z.boolean(),
      })
      .parse(await request.json());
    const result = await db
      .from("workout_sessions")
      .update({ deleted_at: data.restore ? null : new Date().toISOString() })
      .eq("id", data.id)
      .eq("revision", data.revision)
      .select("id,revision")
      .maybeSingle();
    check(result.error);
    if (!result.data) throw new ApiError("记录不存在或已被修改，请刷新", 409);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
