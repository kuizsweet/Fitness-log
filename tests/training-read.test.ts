import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { readTraining, readExerciseHistory } from "../src/lib/training-read";
import {
  trainingRange,
  TRAINING_FROM,
  TRAINING_TO,
} from "../src/lib/training-queries";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { hydrateSessions } from "../src/lib/session-hydration";
import { newSession, newSet, type WorkoutExercise } from "../src/lib/domain";

test("导出重用已读取的完整行，保留记录和组顺序且不改写输入", () => {
  const root = newSession("2026-10-17");
  const exercise: WorkoutExercise = {
    id: crypto.randomUUID(),
    exercise_id: null,
    exercise_name: "fixture",
    muscle_group: "",
    equipment_id: null,
    equipment_snapshot: null,
    notes: "",
    sets: [],
  };
  const a = { ...newSet(), position: 1, workout_exercise_id: exercise.id };
  const b = { ...newSet(), position: 0, workout_exercise_id: exercise.id };
  const sets = [a, b];
  const rows = hydrateSessions(
    [root],
    [{ ...exercise, position: 0, session_id: root.id }],
    sets,
  );
  assert.deepEqual(
    rows[0].exercises[0].sets.map((s) => s.id),
    [b.id, a.id],
  );
  assert.deepEqual(
    sets.map((s) => s.id),
    [a.id, b.id],
  );
  assert.equal(rows[0].training_date, root.training_date);
});

test("真实 PostgREST 构造器：空结果仅一个请求，范围/用户/类型/LIMIT 下推数据库", async () => {
  const requests: URL[] = [];
  const db = createClient("https://example.supabase.co", "public-test-key", {
    global: {
      fetch: async (input) => {
        requests.push(new URL(String(input)));
        return new Response("[]", {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.deepEqual(
    await readTraining(db, {
      user: "owner",
      from: "0001-01-01",
      to: "9999-12-31",
      states: ["planned"],
      type: "strength",
      limit: 1,
      ascending: true,
    }),
    [],
  );
  assert.equal(requests.length, 1);
  const p = requests[0].searchParams;
  assert.equal(p.get("user_id"), "eq.owner");
  assert.deepEqual(p.getAll("training_date"), [
    `gte.${TRAINING_FROM}`,
    `lte.${TRAINING_TO}`,
  ]);
  assert.equal(p.get("training_type"), "eq.strength");
  assert.equal(p.get("limit"), "1");
  assert.equal(p.get("order"), "training_date.asc,created_at.asc,id.asc");
  assert.match(p.get("select")!, /exercises:workout_exercises/);
  await readTraining(db, { user: "owner", from: "2031-01-01" });
  assert.equal(requests.length, 1, "越界空范围不请求数据库");
  await readTraining(db, { user: "owner", id: "record", limit: 1 });
  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get("id"), "eq.record");
  assert.equal(
    requests[1].searchParams.has("training_date"),
    false,
    "按 ID 不读取同日全部记录",
  );
  await readExerciseHistory(db, "owner", "exercise", "2026-10-17", "none");
  const h = requests[2].searchParams;
  assert.equal(h.get("limit"), "1");
  assert.equal(h.get("training_type"), "eq.strength");
  assert.equal(h.get("workout_exercises.workout_sets.completed"), "eq.true");
  assert.match(h.get("select")!, /workout_sets!inner/);
  assert.equal(h.get("workout_exercises.equipment_id"), "is.null");
  await readExerciseHistory(db, "owner", "exercise", "2019-12-31", null);
  assert.equal(requests.length, 3);
  assert.equal(trainingRange("2031-01-01", "2032-01-01"), null);
});

test("真实 PostgreSQL：空/少量/两万条记录，月历聚合、边界、用户隔离和最近力量计划", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table public.workout_sessions(id uuid primary key,user_id uuid not null,training_date date not null,status text not null,training_type text,created_at timestamptz default now(),deleted_at timestamptz);
      alter table workout_sessions enable row level security;
      grant usage on schema public,auth to authenticated; grant select on workout_sessions to authenticated;
      create policy owner_only on workout_sessions using(user_id=(select auth.uid()));`);
    await db.exec(
      await readFile(
        "supabase/migrations/202610170001_training_reads.sql",
        "utf8",
      ),
    );
    const a = crypto.randomUUID(),
      b = crypto.randomUUID();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    const calendar = () =>
      db.query<{ training_date: string | Date }>(
        "select * from training_calendar('2026-10-01','2026-10-31')",
      );
    assert.equal((await calendar()).rows.length, 0);
    await db.query(
      `insert into workout_sessions values
      ($1,$4,'2026-10-18','planned','cardio',now(),null),
      ($2,$4,'2026-10-20','planned','strength',now(),null),
      ($3,$5,'2026-10-17','completed','strength',now(),null)`,
      [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID(), a, b],
    );
    await db.exec("set role authenticated");
    assert.equal((await calendar()).rows.length, 2, "不返回另一用户的标记");
    const next = () =>
      db.query(
        "select training_date from workout_sessions where user_id=auth.uid() and status='planned' and training_type='strength' and deleted_at is null and training_date between '2026-10-17' and '2030-12-31' order by training_date,created_at,id limit 1",
      );
    assert.equal((await next()).rows.length, 1);
    await db.exec("reset role");
    await db.query(
      `insert into workout_sessions(id,user_id,training_date,status,training_type)
      select md5('training-read-'||n)::uuid,$1,date '2019-01-01'+(n%4500),
      case when n%4=0 then 'planned' else 'completed' end,
      case when n%2=0 then 'strength' else 'cardio' end from generate_series(1,20000) n`,
      [a],
    );
    await db.exec("set role authenticated");
    const month = await calendar();
    assert.ok(month.rows.length <= 31 * 2 * 4);
    assert.ok(
      month.rows.every((r) =>
        new Date(String(r.training_date)).toISOString().startsWith("2026-10"),
      ),
    );
    assert.equal((await next()).rows.length, 1);
    assert.equal(
      (
        await db.query(
          "select * from training_calendar('2019-01-01','2019-01-31')",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from training_calendar('2031-01-01','2031-01-31')",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from training_calendar('2020-01-01','2030-12-31')",
        )
      ).rows.length,
      0,
      "不允许月历变成全历史查询",
    );
    assert.equal(
      (
        await db.query(
          "select * from workout_sessions where user_id=auth.uid() and training_date between '2020-01-01' and '2030-12-31' order by training_date desc,created_at desc,id desc limit 21",
        )
      ).rows.length,
      21,
    );
  } finally {
    await db.close();
  }
});
