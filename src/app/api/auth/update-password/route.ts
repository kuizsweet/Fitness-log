import { z } from "zod";
import { serverClient } from "@/lib/supabase/server";
import { trustedRequestOrigin } from "@/lib/request-origin";
import {
  passwordResetError,
  passwordUpdateFailure,
} from "@/lib/password-reset";

export async function POST(request: Request) {
  const reply = (body: object, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  if (
    !trustedRequestOrigin(
      request,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return reply({ error: "请求来源不正确，请刷新后重试。" }, 403);
  const body = await request.text();
  if (body.length > 16384) return reply({ error: "密码内容过长。" }, 400);
  const parsed = z
    .object({ password: z.string(), confirmation: z.string() })
    .safeParse(
      (() => {
        try {
          return JSON.parse(body);
        } catch {
          return null;
        }
      })(),
    );
  if (!parsed.success) return reply({ error: "请填写并确认新密码。" }, 400);
  const validation = passwordResetError(
    parsed.data.password,
    parsed.data.confirmation,
  );
  if (validation) return reply({ error: validation }, 400);
  try {
    const db = await serverClient();
    const user = await db.auth.getUser();
    if (user.error) {
      const failure = passwordUpdateFailure(user.error);
      return reply({ error: failure.message }, failure.status);
    }
    if (!user.data.user)
      return reply(
        { error: "验证会话已失效，请重新发送重置邮件，并在同一浏览器打开。" },
        401,
      );
    const result = await db.auth.updateUser({ password: parsed.data.password });
    if (result.error) {
      const failure = passwordUpdateFailure(result.error);
      return reply({ error: failure.message }, failure.status);
    }
    return reply({ ok: true });
  } catch {
    return reply({ error: "暂时无法连接账号服务，请稍后重试。" }, 503);
  }
}
