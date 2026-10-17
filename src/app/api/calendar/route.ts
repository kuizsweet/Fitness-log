import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { dateSchema } from "@/lib/domain";
import { TRAINING_FROM, TRAINING_TO } from "@/lib/training-queries";
export async function GET(request: Request) {
  try {
    const { db } = await context();
    const date = dateSchema
      .refine((d) => d >= TRAINING_FROM && d <= TRAINING_TO)
      .parse(new URL(request.url).searchParams.get("date"));
    const result = await db.rpc("calendar_day_state", { p_date: date });
    check(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const input = z
      .object({
        owner_id: z.uuid(),
        date: dateSchema.refine(
          (d) => d >= TRAINING_FROM && d <= TRAINING_TO,
          "日期超出范围",
        ),
        mode: z.enum(["rest", "strength", "cardio", "mixed"]),
        version: z.string().regex(/^[a-f0-9]{32}$/),
      })
      .parse(await request.json());
    if (input.owner_id !== user.id)
      throw new ApiError("登录账号已变更，请重新加载", 401);
    const result = await db.rpc("set_calendar_training", {
      p_date: input.date,
      p_mode: input.mode,
      p_expected: input.version,
    });
    check(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
