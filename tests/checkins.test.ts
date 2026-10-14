import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import type { CheckinDashboard } from "../src/lib/checkins";

test("签到：服务端日期、连续性、重试幂等、默认私有与主动上榜", async () => {
  const db = new PGlite();
  const a = crypto.randomUUID(),
    b = crypto.randomUUID();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.profiles(user_id uuid primary key,timezone text not null default 'Asia/Shanghai');
      grant usage on schema auth,public to anon,authenticated;
      alter default privileges in schema public grant all on tables to anon,authenticated;`);
    await db.exec(
      await readFile("supabase/migrations/202610140001_checkins.sql", "utf8"),
    );
    await db.query("insert into auth.users values($1),($2)", [a, b]);
    await db.query("insert into public.profiles(user_id) values($1),($2)", [
      a,
      b,
    ]);
    const day = (
      await db.query<{ day: string }>(
        "select (now() at time zone 'Asia/Shanghai')::date::text as day",
      )
    ).rows[0].day;
    await db.query(
      "insert into public.daily_checkins(user_id,checkin_date) values($1,$2::date-1),($1,$2::date-2),($1,$2::date-4)",
      [a, day],
    );
    async function asUser(id: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    async function dashboard(fn = "checkin_dashboard") {
      return (
        await db.query<{ data: CheckinDashboard }>(
          `select public.${fn}() as data`,
        )
      ).rows[0].data;
    }
    await asUser(a);
    const before = await dashboard();
    assert.equal(before.streak, 2, "今天尚未签到，昨天的连续记录仍保留");
    assert.equal(before.checked_in, false);
    assert.equal(before.listed, false);
    assert.deepEqual(before.leaderboard, []);
    const signed = await dashboard("daily_checkin");
    assert.equal(signed.date, day);
    assert.equal(signed.streak, 3);
    assert.equal(signed.checked_in, true);
    await dashboard("daily_checkin");
    assert.equal(
      (
        await db.query(
          "select * from public.daily_checkins where checkin_date=$1",
          [day],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into public.daily_checkins(user_id,checkin_date) values($1,$2::date-9)",
        [a, day],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "insert into public.checkin_preferences(user_id,listed) values($1,true)",
        [a],
      ),
      /check constraint/,
    );
    await db.query(
      "insert into public.checkin_preferences(user_id,listed,display_name) values($1,true,'签到用户A')",
      [a],
    );
    await asUser(b);
    const publicBoard = await dashboard();
    assert.equal(publicBoard.leaderboard.length, 1);
    assert.deepEqual(Object.keys(publicBoard.leaderboard[0]).sort(), [
      "display_name",
      "is_self",
      "rank",
      "streak",
    ]);
    assert.equal(publicBoard.leaderboard[0].streak, 3);
    assert.equal(publicBoard.leaderboard[0].is_self, false);
    assert.equal(
      (
        await db.query("select * from public.daily_checkins where user_id=$1", [
          a,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.checkin_preferences where user_id=$1",
          [a],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.checkin_preferences set listed=false where user_id=$1 returning user_id",
          [a],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select fitness_journal_meta.checkin_streak($1,$2::date)", [
        a,
        day,
      ]),
      /permission denied/,
    );
    await dashboard("daily_checkin");
    await db.query(
      "insert into public.checkin_preferences(user_id,listed,display_name) values($1,true,'签到用户B')",
      [b],
    );
    await db.exec("reset role");
    await db.query(
      "insert into public.daily_checkins(user_id,checkin_date) values($1,$2::date-1),($1,$2::date-2)",
      [b, day],
    );
    await asUser(b);
    assert.deepEqual(
      (await dashboard()).leaderboard.map((r) => r.rank),
      [1, 1],
    );
    await asUser(a);
    await db.query(
      "update public.checkin_preferences set listed=false where user_id=$1",
      [a],
    );
    await asUser(b);
    assert.deepEqual(
      (await dashboard()).leaderboard.map((r) => r.display_name),
      ["签到用户B"],
    );
    await db.exec("reset role");
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select fitness_journal_meta.checkin_streak($1,$2::date+2) as n",
          [a, day],
        )
      ).rows[0].n,
      0,
      "漏签一天，连续记录归零",
    );
    await db.query(
      "update public.profiles set timezone='INVALID' where user_id=$1",
      [b],
    );
    await asUser(b);
    assert.equal((await dashboard()).timezone, "Asia/Shanghai");
    await db.exec("reset role; set role anon");
    await assert.rejects(dashboard(), /permission denied/);
    await assert.rejects(dashboard("daily_checkin"), /permission denied/);
    await assert.rejects(
      db.query("select * from public.daily_checkins"),
      /permission denied/,
    );
    await asUser("");
    await assert.rejects(dashboard(), /请先登录/);
  } finally {
    await db.close();
  }
});
