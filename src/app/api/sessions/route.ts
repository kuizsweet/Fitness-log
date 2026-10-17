import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { dateSchema, sessionSchema } from "@/lib/domain";
import {
  readTraining,
  readTrainingCalendar,
  type SessionRead,
} from "@/lib/training-read";
import { TRAINING_FROM, TRAINING_TO } from "@/lib/training-queries";
export async function GET(request: Request) {
  try {
    const { db, user } = await context();
    const p = new URL(request.url).searchParams;
    if (p.has("id")) {
      const id = z.uuid().parse(p.get("id"));
      return json(await readTraining(db, { user: user.id, id, limit: 1 }));
    }
    const from = dateSchema.parse(p.get("from") ?? TRAINING_FROM);
    const to = dateSchema.parse(p.get("to") ?? TRAINING_TO);
    if (from > to) throw new ApiError("日期范围无效");
    if (p.get("view") === "calendar") {
      if (from.slice(0, 7) !== to.slice(0, 7))
        throw new ApiError("月历仅查询一个月");
      return json(await readTrainingCalendar(db, from, to));
    }
    const options: SessionRead = {
      user: user.id,
      from,
      to,
      deleted: p.get("deleted") === "1",
      limit: z.coerce
        .number()
        .int()
        .min(1)
        .max(101)
        .parse(p.get("limit") ?? 50),
      offset: z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(p.get("offset") ?? 0),
      ascending: p.get("order") === "asc",
      ...(p.has("type")
        ? { type: z.enum(["strength", "cardio"]).parse(p.get("type")) }
        : {}),
    };
    if (p.get("active") === "1") options.states = ["in_progress", "paused"];
    if (p.get("planned") === "1") options.states = ["planned"];
    return json(await readTraining(db, options));
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
