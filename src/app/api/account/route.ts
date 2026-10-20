import { z } from "zod";
import { context, check, failure, json, ApiError } from "@/lib/api";
import { avatarSchema } from "@/lib/account-avatar";

export async function GET() {
  try {
    const { db, user } = await context();
    const auth = await db.auth.getUser();
    check(auth.error);
    if (!auth.data.user) throw new ApiError("请先登录", 401);
    const profile = await db
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();
    check(profile.error);
    const avatar = avatarSchema.safeParse(
      auth.data.user.user_metadata.kuizfit_avatar,
    );
    return json({
      name: profile.data?.display_name || "我的账号",
      email: auth.data.user.email ?? "",
      avatar: avatar.success ? avatar.data : null,
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const { db } = await context(request);
    const body = await request.text();
    if (body.length > 4500) throw new ApiError("头像过大");
    const { avatar } = z
      .object({ avatar: avatarSchema })
      .parse(JSON.parse(body));
    const result = await db.auth.updateUser({
      data: { kuizfit_avatar: avatar },
    });
    check(result.error);
    return json({ avatar });
  } catch (error) {
    return failure(error);
  }
}
