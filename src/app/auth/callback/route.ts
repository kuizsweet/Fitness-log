import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { authLinkFailureUrl } from "@/lib/auth-links";
import { BRAND_NAME } from "@/lib/brand";
import {
  callbackRequestOrigin,
  trustedRequestOrigin,
} from "@/lib/request-origin";

const headers = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
};
const validTypes = ["signup", "recovery", "email"];
function requestOrigin(request: Request) {
  return callbackRequestOrigin(request, process.env.NEXT_PUBLIC_SITE_URL);
}
function failed(origin: string, recovery = false) {
  const response = NextResponse.redirect(
    authLinkFailureUrl(origin, recovery),
    303,
  );
  Object.entries(headers).forEach(([key, value]) =>
    response.headers.set(key, value),
  );
  return response;
}
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const recovery =
    url.searchParams.get("next") === "/auth?mode=update" ||
    url.searchParams.get("type") === "recovery";
  if (url.searchParams.has("error")) return failed(origin, recovery);
  const next =
    url.searchParams.get("next") === "/auth?mode=update"
      ? "/auth?mode=update"
      : "/dashboard";
  try {
    const code = url.searchParams.get("code");
    const hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type");
    // Email safety scanners may fetch GET links. Only an explicit user submission consumes a token hash.
    if (hash && hash.length <= 512 && validTypes.includes(type ?? "")) {
      return new Response(
        `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${BRAND_NAME} · 邮件验证</title><style>body{font:16px system-ui;color:#172027;background:white;margin:0;padding:32px}main{max-width:440px;margin:10vh auto}button{font:inherit;background:#176b4c;color:white;border:0;border-radius:12px;padding:14px 24px;cursor:pointer}a{color:#176b4c}</style></head><body><main><h1>${type === "recovery" ? "确认重置密码" : "确认邮箱"}</h1><p>点击下方按钮完成验证。</p><form method="post" action="/auth/callback"><input type="hidden" name="token_hash" value="${escape(hash)}"><input type="hidden" name="type" value="${escape(type!)}"><input type="hidden" name="next" value="${escape(next)}"><button type="submit">继续验证</button></form><p><a href="/auth">返回登录</a></p></main></body></html>`,
        {
          headers: {
            ...headers,
            "Content-Type": "text/html; charset=utf-8",
            "X-Frame-Options": "DENY",
            "Content-Security-Policy":
              "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
          },
        },
      );
    }
    if (code) {
      const db = await serverClient();
      const r = await db.auth.exchangeCodeForSession(code);
      if (r.error) throw r.error;
    } else throw new Error("认证链接无效");
    const response = NextResponse.redirect(new URL(next, origin));
    Object.entries(headers).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  } catch {
    return failed(origin, recovery);
  }
}

export async function POST(request: Request) {
  const origin = requestOrigin(request);
  let recovery = false;
  if (
    !trustedRequestOrigin(
      request,
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NODE_ENV === "development",
    )
  )
    return new Response("Forbidden", { status: 403, headers });
  if (
    !request.headers
      .get("content-type")
      ?.startsWith("application/x-www-form-urlencoded")
  )
    return new Response("Unsupported Media Type", { status: 415, headers });
  try {
    const form = await request.formData();
    const hash = form.get("token_hash");
    const type = form.get("type");
    recovery = type === "recovery" || form.get("next") === "/auth?mode=update";
    if (
      typeof hash !== "string" ||
      !hash ||
      hash.length > 512 ||
      typeof type !== "string" ||
      !validTypes.includes(type)
    )
      return failed(origin, recovery);
    const db = await serverClient();
    const result = await db.auth.verifyOtp({
      token_hash: hash,
      type: type as "signup" | "recovery" | "email",
    });
    if (result.error) return failed(origin, recovery);
    const next =
      type === "recovery" || form.get("next") === "/auth?mode=update"
        ? "/auth?mode=update"
        : "/dashboard";
    const response = NextResponse.redirect(new URL(next, origin), 303);
    Object.entries(headers).forEach(([key, value]) =>
      response.headers.set(key, value),
    );
    return response;
  } catch {
    return failed(origin, recovery);
  }
}
