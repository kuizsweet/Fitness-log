import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
import { diagnosticFetch } from "./diagnostic-fetch";
try {
  loadEnvFile(".env.local");
} catch {
  /* Caller may supply environment. */
}
async function main() {
  for (const name of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "TEST_USER_A_EMAIL",
    "TEST_USER_A_PASSWORD",
  ])
    if (!process.env[name]) throw new Error(`本地缺少 ${name}`);
  const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(origin).hostname),
    "只测试本地运行的应用",
  );
  const jar = new Map<string, { value: string; options: CookieOptions }>();
  const client = () =>
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { fetch: diagnosticFetch },
        cookies: {
          getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
          setAll: (items) =>
            items.forEach(({ name, value, options }) => {
              if (value) jar.set(name, { value, options });
              else jar.delete(name);
            }),
        },
      },
    );
  const auth = client().auth;
  const signed = await auth.signInWithPassword({
    email: process.env.TEST_USER_A_EMAIL!,
    password: process.env.TEST_USER_A_PASSWORD!,
  });
  assert.ifError(signed.error);
  const uid = signed.data.user!.id;
  const headers = () => ({
    Cookie: [...jar].map(([name, c]) => `${name}=${c.value}`).join("; "),
  });
  try {
    assert.ok(jar.size > 0, "登录必须产生 SSR Cookie");
    assert.ok(
      [...jar.values()].some((c) => (c.options.maxAge ?? 0) > 0),
      "Cookie 应跨页面请求保持",
    );
    const page = await fetch(`${origin}/journal`, {
      headers: headers(),
      redirect: "manual",
    });
    assert.equal(page.status, 200, "真实 Cookie 应允许访问日志页");
    for (let i = 0; i < 2; i++) {
      const profile = await fetch(`${origin}/api/profile`, {
        headers: headers(),
        cache: "no-store",
      });
      assert.equal(profile.status, 200);
      assert.equal((await profile.json()).user_id, uid);
    }
    const refresh = await auth.refreshSession();
    assert.ifError(refresh.error);
    const restored = await client().auth.getUser();
    assert.ifError(restored.error);
    assert.equal(restored.data.user!.id, uid);
    const afterRefresh = await fetch(`${origin}/api/profile`, {
      headers: headers(),
      cache: "no-store",
    });
    assert.equal(afterRefresh.status, 200);
  } finally {
    const logout = await auth.signOut({ scope: "local" });
    assert.ifError(logout.error);
  }
  const afterLogout = await fetch(`${origin}/api/profile`, {
    headers: headers(),
    cache: "no-store",
  });
  assert.equal(afterLogout.status, 401);
  console.log(
    "真实 Auth/本地应用验证通过：密码登录、持久 SSR Cookie、重复请求读取同一账号、会话刷新、退出后接口拒绝。未模拟业务数据。",
  );
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "会话验证失败");
  process.exitCode = 1;
});
