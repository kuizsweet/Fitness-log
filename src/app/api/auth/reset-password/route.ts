import { z } from "zod";
import { authCallbackUrl } from "@/lib/auth-links";
import { serverClient } from "@/lib/supabase/server";
import { trustedRequestOrigin } from "@/lib/request-origin";

export async function POST(request: Request) {
  if (
    !trustedRequestOrigin(
      request,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return Response.json(
      { error: "请求来源不正确，请刷新后重试。" },
      { status: 403 },
    );
  const origin = request.headers.get("origin")!;
  const parsed = z
    .object({
      email: z.email().max(320),
      captchaToken: z.string().max(4096).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "请输入有效的邮箱。" }, { status: 400 });
  try {
    const db = await serverClient();
    const { error } = await db.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: authCallbackUrl(
        origin,
        process.env.NEXT_PUBLIC_SITE_URL,
        true,
      ),
      captchaToken: parsed.data.captchaToken,
    });
    if (error) {
      const message =
        error.status === 429
          ? "发送过于频繁，请稍后重试。"
          : /captcha/i.test(error.message)
            ? "安全验证已失效，请重新验证。"
            : "暂时无法发送重置邮件，请稍后重试。";
      return Response.json(
        { error: message },
        { status: error.status === 429 ? 429 : 502 },
      );
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "暂时无法连接账号服务，请稍后重试。" },
      { status: 503 },
    );
  }
}
