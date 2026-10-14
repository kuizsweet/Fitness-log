import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { serverClient } from "./supabase/server";
import { configured } from "./supabase/config";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function context(request?: Request) {
  if (!configured())
    throw new ApiError("Supabase 尚未配置，请设置环境变量并运行迁移。", 503);
  if (request && !["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const allowed = process.env.NEXT_PUBLIC_SITE_URL;
    if (
      !origin ||
      (origin !== new URL(request.url).origin && origin !== allowed)
    )
      throw new ApiError("请求来源无效", 403);
  }
  const db = await serverClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new ApiError("请先登录", 401);
  return { db, user: data.user };
}
export function check(error: { message: string; code?: string } | null) {
  if (error) {
    if (error.code === "23505")
      throw new ApiError("记录重复：此文件可能已导入，或存在相同记录。", 409);
    throw new ApiError(
      error.message,
      error.message.includes("版本冲突") ? 409 : 400,
    );
  }
}
export function failure(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}：${i.message}`)
          .join("；"),
      },
      { status: 400 },
    );
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "操作失败，请重试" },
    { status: error instanceof ApiError ? error.status : 500 },
  );
}
export function json(data: unknown) {
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
