import assert from "node:assert/strict";
import { loadEnvFile } from "node:process";
try {
  loadEnvFile(".env.local");
} catch {
  /* Optional. */
}
const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
if (!["localhost", "127.0.0.1"].includes(new URL(origin).hostname))
  throw new Error("Smoke 检查仅针对本地启动的应用");
const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
const root = await fetch(origin);
assert.equal(root.status, 200);
assert.match(await root.text(), /Fitness Journal/);
for (const page of [
  "journal",
  "train",
  "history",
  "catalog",
  "import",
  "settings",
  "session/new",
]) {
  const r = await fetch(`${origin}/${page}`, { redirect: "manual" });
  assert.ok([307, 308].includes(r.status));
  assert.equal(r.headers.get("location"), configured ? "/auth" : "/");
}
for (const resource of [
  "catalog",
  "profile",
  "sessions",
  "meals",
  "history",
  "imports",
  "export",
]) {
  const r = await fetch(`${origin}/api/${resource}`);
  assert.equal(r.status, configured ? 401 : 503);
  assert.match((await r.json()).error, configured ? /登录/ : /配置/);
}
const denied = await fetch(`${origin}/api/sessions`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Origin: origin },
  body: "{}",
});
assert.equal(denied.status, configured ? 401 : 503);
console.log(
  `本地 HTTP smoke 通过：${configured ? "已配置但未登录" : "服务未配置"}访问控制及错误状态。`,
);
