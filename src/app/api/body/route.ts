import { context, check, failure, json, ApiError } from "@/lib/api";
import { bodyGoalPatch, bodyMeasurementWrite } from "@/lib/body-goals";

export async function GET() {
  try {
    const { db } = await context();
    const result = await db.rpc("body_overview");
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const { db, user } = await context(request);
    const raw = await request.json();
    if (raw.owner_id !== user.id)
      throw new ApiError("登录账号已变更，请重新登录原账号后重试", 401);
    const changes = { ...raw };
    delete changes.owner_id;
    const payload = bodyGoalPatch.parse(changes);
    const result = await db.rpc("save_body_goal", { payload });
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}

export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const raw = await request.json();
    if (raw.owner_id !== user.id)
      throw new ApiError("登录账号已变更，请重新登录原账号后重试", 401);
    const { owner_id: _owner, ...changes } = raw;
    void _owner;
    const payload = bodyMeasurementWrite.parse(changes);
    const result = await db.rpc("save_body_measurement", { payload });
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
