import { z } from "zod";
import { context, check, failure, json } from "@/lib/api";
const profileSchema = z.object({
  display_name: z.string().max(80),
  unit: z.enum(["kg", "lb"]),
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
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await context(request);
    const p = profileSchema.parse(await request.json());
    const result = await db
      .from("profiles")
      .update(p)
      .eq("user_id", user.id)
      .select()
      .single();
    check(result.error);
    return json(result.data);
  } catch (e) {
    return failure(e);
  }
}
