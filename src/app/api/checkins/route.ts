import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";

export async function GET() {
  try {
    const { db } = await context();
    const result = await db.rpc("checkin_dashboard");
    check(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("checkin") }).strict(),
  z
    .object({
      action: z.literal("preferences"),
      listed: z.boolean(),
      display_name: z.string().trim().max(40),
    })
    .strict()
    .refine((p) => !p.listed || p.display_name.length > 0, {
      message: "上榜前请填写榜单昵称",
      path: ["display_name"],
    }),
]);

export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const payload = actionSchema.parse(await request.json());
    if (payload.action === "preferences") {
      const saved = await db.from("checkin_preferences").upsert({
        user_id: user.id,
        listed: payload.listed,
        display_name: payload.display_name,
      });
      check(saved.error);
    }
    const result = await db.rpc(
      payload.action === "checkin" ? "daily_checkin" : "checkin_dashboard",
    );
    check(result.error);
    return json(result.data);
  } catch (error) {
    return failure(error);
  }
}
