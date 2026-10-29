import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { emptyWorkbench, readWorkbench } from "@/lib/training-workbench";

export async function GET() {
  try {
    const { db, user } = await context();
    const result = await db
      .from("training_workbenches")
      .select("state,revision")
      .eq("user_id", user.id)
      .maybeSingle();
    check(result.error);
    return json(result.data ?? { state: emptyWorkbench(), revision: 0 });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const text = await request.text();
    if (new TextEncoder().encode(text).length > 2097152)
      throw new ApiError("计划数据过大，未覆盖已有数据", 413);
    const input = z
      .object({
        owner_id: z.uuid(),
        revision: z.number().int().nonnegative(),
        state: z.record(z.string(), z.unknown()),
      })
      .parse(JSON.parse(text));
    if (input.owner_id !== user.id)
      throw new ApiError("登录账号已变更，请重新加载", 401);
    const state = readWorkbench(JSON.stringify(input.state) ?? null);
    const result = await db.rpc("save_training_workbench", {
      p_state: state,
      p_expected: input.revision,
    });
    check(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
