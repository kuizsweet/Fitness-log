import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next =
    url.searchParams.get("next") === "/auth?mode=update"
      ? "/auth?mode=update"
      : "/journal";
  try {
    const db = await serverClient();
    const code = url.searchParams.get("code");
    const hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    if (code) {
      const r = await db.auth.exchangeCodeForSession(code);
      if (r.error) throw r.error;
    } else if (hash && ["signup", "recovery", "email"].includes(type ?? "")) {
      const r = await db.auth.verifyOtp({
        token_hash: hash,
        type: type as "signup" | "recovery" | "email",
      });
      if (r.error) throw r.error;
    } else throw new Error("认证链接无效");
    return NextResponse.redirect(
      new URL(type === "recovery" ? "/auth?mode=update" : next, url.origin),
    );
  } catch {
    return NextResponse.redirect(
      new URL(
        "/auth?error=" +
          encodeURIComponent("认证链接无效或过期，请重新发送邮件。"),
        url.origin,
      ),
    );
  }
}
