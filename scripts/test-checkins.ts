import assert from "node:assert/strict";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFile } from "node:process";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { diagnosticFetch } from "./diagnostic-fetch";
import type { CheckinDashboard } from "../src/lib/checkins";

try {
  loadEnvFile(".env.local");
} catch {
  /* CI may supply variables. */
}
const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`缺少本地 ${key}`);
  return value;
};
async function main() {
  const url = required("NEXT_PUBLIC_SUPABASE_URL");
  const key = required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const origin = process.env.TEST_APP_URL ?? "http://localhost:3000";
  assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
  const jars = [
    new Map<string, { value: string; options: CookieOptions }>(),
    new Map<string, { value: string; options: CookieOptions }>(),
  ];
  const clients = jars.map((jar) =>
    createServerClient(url, key, {
      global: { fetch: diagnosticFetch },
      cookies: {
        getAll: () => [...jar].map(([name, c]) => ({ name, value: c.value })),
        setAll: (items) =>
          items.forEach(({ name, value, options }) =>
            value ? jar.set(name, { value, options }) : jar.delete(name),
          ),
      },
    }),
  );
  const ids: string[] = [];
  for (let i = 0; i < 2; i++) {
    const account = i === 0 ? "A" : "B";
    const signed = await clients[i].auth.signInWithPassword({
      email: required(`TEST_USER_${account}_EMAIL`),
      password: required(`TEST_USER_${account}_PASSWORD`),
    });
    assert.ifError(signed.error);
    ids.push(signed.data.user!.id);
  }
  assert.notEqual(ids[0], ids[1]);
  const databaseUrl = new URL(required("SUPABASE_DB_URL"));
  for (const param of ["sslmode", "sslcert", "sslkey", "sslrootcert"])
    databaseUrl.searchParams.delete(param);
  const ca = await readFile(required("SUPABASE_DB_CA_FILE"), "utf8");
  const admin = new pg.Client({
    connectionString: databaseUrl.toString(),
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 12000,
  });
  await admin.connect();
  const savedPrefs = (
    await admin.query(
      "select * from public.checkin_preferences where user_id=any($1::uuid[])",
      [ids],
    )
  ).rows;
  const savedDays = (
    await admin.query(
      "select user_id,checkin_date::text as day from public.daily_checkins where user_id=any($1::uuid[])",
      [ids],
    )
  ).rows;
  const aliases = [
    `验证签到A-${crypto.randomUUID().slice(0, 8)}`,
    `验证签到B-${crypto.randomUUID().slice(0, 8)}`,
  ];
  const touchedDays = new Map<string, string>();
  async function request(i: number, payload?: unknown, expected = 200) {
    const response = await fetch(`${origin}/api/checkins`, {
      method: payload ? "POST" : "GET",
      headers: {
        Cookie: [...jars[i]]
          .map(([name, c]) => `${name}=${c.value}`)
          .join("; "),
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: payload ? JSON.stringify(payload) : undefined,
      cache: "no-store",
    });
    const data = await response.json();
    assert.equal(response.status, expected, data.error ?? "签到接口状态异常");
    return data as CheckinDashboard;
  }
  try {
    for (let i = 0; i < 2; i++)
      await request(i, {
        action: "preferences",
        listed: false,
        display_name: aliases[i],
      });
    const initial = await request(0);
    touchedDays.set(ids[0], initial.date);
    assert.equal(initial.listed, false);
    assert.ok(
      !(await request(1)).leaderboard.some(
        (r) => r.display_name === aliases[0],
      ),
    );
    const first = await request(0, { action: "checkin" });
    const again = await request(0, { action: "checkin" });
    assert.equal(first.checked_in, true);
    assert.equal(first.date, again.date);
    assert.equal(first.streak, again.streak);
    const own = await clients[0]
      .from("daily_checkins")
      .select("checkin_date")
      .eq("user_id", ids[0])
      .eq("checkin_date", first.date);
    assert.ifError(own.error);
    assert.equal(own.data!.length, 1);
    await request(0, {
      action: "preferences",
      listed: true,
      display_name: aliases[0],
    });
    const shared = (await request(1)).leaderboard.find(
      (r) => r.display_name === aliases[0],
    );
    assert.ok(shared);
    assert.equal(shared.is_self, false);
    assert.equal(shared.streak, first.streak);
    assert.deepEqual(Object.keys(shared).sort(), [
      "display_name",
      "is_self",
      "rank",
      "streak",
    ]);
    const hidden = await clients[1]
      .from("daily_checkins")
      .select("*")
      .eq("user_id", ids[0]);
    assert.ifError(hidden.error);
    assert.deepEqual(hidden.data, []);
    const hiddenPrefs = await clients[1]
      .from("checkin_preferences")
      .select("*")
      .eq("user_id", ids[0]);
    assert.ifError(hiddenPrefs.error);
    assert.deepEqual(hiddenPrefs.data, []);
    const spoof = await clients[1]
      .from("daily_checkins")
      .insert({ user_id: ids[1], checkin_date: "2020-01-01" });
    assert.equal(spoof.error?.code, "42501");
    await request(0, { action: "checkin", date: "2020-01-01" }, 400);
    const reload = await request(0);
    assert.equal(reload.checked_in, true);
    const exported = await fetch(`${origin}/api/export?format=json`, {
      headers: {
        Cookie: [...jars[1]]
          .map(([name, c]) => `${name}=${c.value}`)
          .join("; "),
      },
    });
    assert.equal(exported.status, 200);
    const exportData = await exported.json();
    assert.ok(
      exportData.data.daily_checkins.every(
        (r: { user_id: string }) => r.user_id === ids[1],
      ),
    );
    assert.ok(
      exportData.data.checkin_preferences.every(
        (r: { user_id: string }) => r.user_id === ids[1],
      ),
    );
    await request(0, {
      action: "preferences",
      listed: false,
      display_name: aliases[0],
    });
    assert.ok(
      !(await request(1)).leaderboard.some(
        (r) => r.display_name === aliases[0],
      ),
    );
    const anon = createClient(url, key, {
      auth: { persistSession: false },
      global: { fetch: diagnosticFetch },
    });
    assert.ok((await anon.rpc("checkin_dashboard")).error);
    assert.equal((await fetch(`${origin}/api/checkins`)).status, 401);
    console.log(
      "真实签到 API 验证通过：两账号、服务器日期、重复签到幂等、持久读取、上榜可见、退出后隐藏、RLS 隔离、拒绝补签、匿名拒绝、私有导出。",
    );
  } finally {
    // Restore only the two explicitly configured test accounts; preserve every prior row.
    await admin.query("begin");
    try {
      for (const id of ids) {
        const day = touchedDays.get(id);
        if (day && !savedDays.some((r) => r.user_id === id && r.day === day))
          await admin.query(
            "delete from public.daily_checkins where user_id=$1 and checkin_date=$2::date",
            [id, day],
          );
        const pref = savedPrefs.find((r) => r.user_id === id);
        if (pref)
          await admin.query(
            "update public.checkin_preferences set listed=$2,display_name=$3 where user_id=$1",
            [id, pref.listed, pref.display_name],
          );
        else
          await admin.query(
            "delete from public.checkin_preferences where user_id=$1",
            [id],
          );
      }
      await admin.query("commit");
      console.log("已恢复测试账号原有上榜设置，并清理此次新增的测试签到。");
    } catch (e) {
      await admin.query("rollback");
      throw e;
    } finally {
      await admin.end();
      await Promise.all(clients.map((c) => c.auth.signOut({ scope: "local" })));
    }
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "签到验证失败");
  process.exitCode = 1;
});
