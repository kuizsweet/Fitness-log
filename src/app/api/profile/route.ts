import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
const profileSchema = z.object({
  display_name: z.string().max(80),
  unit: z.enum(["kg", "lb"]),
  week_start: z.union([z.literal(0), z.literal(1)]).optional(),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("zh-CN", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "时区无效"),
});
export async function GET() {
  try {
    const { db, user } = await context();
    const result = await db
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    check(result.error);
    const account = await db.auth.getUser();
    check(account.error);
    return json({
      ...result.data,
      week_start:
        account.data.user?.user_metadata.kuizfit_week_start === 0 ? 0 : 1,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const storedWeekStart =
      "user_metadata" in user && user.user_metadata.kuizfit_week_start === 0
        ? 0
        : 1;
    const { week_start, ...p } = profileSchema.parse(await request.json());
    if (week_start !== undefined && week_start !== storedWeekStart) {
      const preference = await db.auth.updateUser({
        data: { kuizfit_week_start: week_start },
      });
      check(preference.error);
    }
    const result = await db
      .from("profiles")
      .update(p)
      .eq("user_id", user.id)
      .select()
      .single();
    check(result.error);
    return json({ ...result.data, week_start: week_start ?? storedWeekStart });
  } catch (e) {
    return failure(e);
  }
}
