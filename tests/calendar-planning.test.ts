import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { QueryClient } from "@tanstack/react-query";
import { CalendarWriter } from "../src/lib/calendar-writer";
import {
  calendarDayState,
  EMPTY_DAY_VERSION,
  nextCalendarMode,
  type CalendarDayState,
} from "../src/lib/calendar";
import { applyResourceChange } from "../src/lib/training-cache";
import { resourceKey } from "../src/lib/resource-keys";
import { trainingPaths } from "../src/lib/training-queries";
const empty = (date = "2026-08-23"): CalendarDayState => ({
  training_date: date,
  mode: "rest",
  locked: false,
  version: EMPTY_DAY_VERSION,
  rows: [],
});
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("四态顺序：休息、力量、有氧、混合；快速点击串行合并，旧响应不覆盖新意图", async () => {
  assert.deepEqual(
    ["rest", "strength", "cardio", "mixed"].map((m) =>
      nextCalendarMode(m as CalendarDayState["mode"]),
    ),
    ["strength", "cardio", "mixed", "rest"],
  );
  const calls: {
    day: CalendarDayState;
    mode: string;
    resolve: (day: CalendarDayState) => void;
  }[] = [];
  const writer = new CalendarWriter(
    (day, mode) => new Promise((resolve) => calls.push({ day, mode, resolve })),
  );
  const state = empty();
  writer.cycle(state);
  writer.cycle(state);
  writer.cycle(state);
  assert.equal(calls.length, 1);
  assert.equal(writer.getSnapshot()[state.training_date].desired, "mixed");
  writer.retry({ ...state, locked: true });
  assert.equal(
    writer.getSnapshot()[state.training_date].desired,
    "mixed",
    "重试读取的晚到结果不能移除正在保存的意图",
  );
  calls[0].resolve({ ...state, mode: "strength", version: "1".repeat(32) });
  await tick();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].mode, "mixed");
  assert.equal(calls[1].day.version, "1".repeat(32));
  calls[1].resolve({ ...state, mode: "mixed", version: "2".repeat(32) });
  await tick();
  assert.deepEqual(writer.getSnapshot(), {});
});

test("写入失败保留用户意图供重试；已具体训练的日期不发起写入", async () => {
  let fail = true,
    count = 0;
  const writer = new CalendarWriter(async (day, mode) => {
    count++;
    if (fail) throw new Error("network unavailable");
    return { ...day, mode, version: "3".repeat(32) };
  });
  const state = empty();
  writer.cycle({ ...state, locked: true });
  assert.equal(count, 0);
  writer.cycle(state);
  await tick();
  assert.equal(
    writer.getSnapshot()[state.training_date].confirmed.mode,
    "rest",
  );
  assert.equal(writer.getSnapshot()[state.training_date].desired, "strength");
  assert.match(writer.getSnapshot()[state.training_date].error, /network/);
  fail = false;
  writer.retry({ ...state, version: "4".repeat(32) });
  await tick();
  assert.deepEqual(writer.getSnapshot(), {});
  assert.equal(count, 2);
});

test("日历保存精确更新同月分类，失效当天/计划/相关详情，保留其他月份与账号", async () => {
  const client = new QueryClient();
  try {
    const date = "2026-08-23",
      key = resourceKey(
        "a",
        trainingPaths.calendar("2026-08-01", "2026-08-31"),
      );
    const other = resourceKey(
      "a",
      trainingPaths.calendar("2026-07-01", "2026-07-31"),
    );
    const day = resourceKey("a", trainingPaths.day(date)),
      plans = resourceKey("a", trainingPaths.plans()),
      active = resourceKey("a", trainingPaths.active());
    const detail = resourceKey("a", trainingPaths.detail("one"));
    for (const k of [key, other, day, plans, active, detail])
      client.setQueryData(k, []);
    const state: CalendarDayState = {
      ...empty(date),
      mode: "mixed",
      version: "5".repeat(32),
      affected_ids: ["one"],
      rows: [
        {
          training_date: date,
          training_type: "strength",
          status: "planned",
          count: 1,
        },
        {
          training_date: date,
          training_type: "cardio",
          status: "planned",
          count: 1,
        },
      ],
    };
    await applyResourceChange(client, "a", {
      owner: "a",
      resource: "calendar",
      method: "POST",
      result: state,
    });
    const updated = calendarDayState(client.getQueryData(key)!, date);
    assert.equal(updated.mode, "mixed");
    assert.equal(updated.version, state.version);
    for (const k of [day, plans, detail])
      assert.equal(client.getQueryState(k)?.isInvalidated, true);
    for (const k of [other, active, key])
      assert.equal(client.getQueryState(k)?.isInvalidated, false);
    await applyResourceChange(client, "b", {
      owner: "a",
      resource: "calendar",
      method: "POST",
      result: state,
    });
    assert.equal(
      client.getQueryData(resourceKey("b", trainingPaths.day(date))),
      undefined,
    );
  } finally {
    client.clear();
  }
});

test("PostgreSQL：规划复用训练表、混合两条真实空计划、可逆休息、锁定详情、版本冲突、RLS", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create table workout_sessions(id uuid primary key default gen_random_uuid(),user_id uuid not null,training_date date not null,training_type text,status text not null,
        notes text not null default '',started_at timestamptz,ended_at timestamptz,paused_at timestamptz,import_batch_id uuid,revision int not null default 1,
        created_at timestamptz default now(),deleted_at timestamptz,unique(id,user_id));
      create table workout_exercises(id uuid primary key default gen_random_uuid(),user_id uuid not null,session_id uuid not null,exercise_name text default '',foreign key(session_id,user_id) references workout_sessions(id,user_id));
      create function test_revision() returns trigger language plpgsql as $$begin new.revision=old.revision+1;return new;end$$;
      create trigger bump before update on workout_sessions for each row execute function test_revision();
      alter table workout_sessions enable row level security; alter table workout_exercises enable row level security;
      create policy owner_only on workout_sessions using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
      create policy owner_only on workout_exercises using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
      grant usage on schema public,auth to authenticated; grant select,insert,update on workout_sessions,workout_exercises to authenticated;`);
    for (const file of [
      "202610170001_training_reads.sql",
      "202610170002_calendar_planning.sql",
    ])
      await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
    const a = crypto.randomUUID(),
      b = crypto.randomUUID(),
      date = "2026-08-23";
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    await db.exec("set role authenticated");
    const read = async (d = date) =>
      (
        await db.query<{ state: CalendarDayState }>(
          "select calendar_day_state($1) as state",
          [d],
        )
      ).rows[0].state;
    const set = async (mode: string, version: string, d = date) =>
      (
        await db.query<{ state: CalendarDayState }>(
          "select set_calendar_training($1,$2,$3) as state",
          [d, mode, version],
        )
      ).rows[0].state;
    const start = await read();
    assert.equal(start.mode, "rest");
    assert.equal(start.version, EMPTY_DAY_VERSION);
    const strength = await set("strength", start.version);
    assert.equal(strength.mode, "strength");
    assert.equal(strength.locked, false);
    assert.equal(strength.rows[0].status, "planned");
    await set("strength", start.version); // retry after a lost response is idempotent
    assert.equal(
      (
        await db.query(
          "select id from workout_sessions where deleted_at is null",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(set("cardio", start.version), /版本冲突/);
    const cardio = await set("cardio", strength.version);
    assert.equal(cardio.mode, "cardio");
    const mixed = await set("mixed", cardio.version);
    assert.equal(mixed.rows.length, 2);
    assert.equal(mixed.mode, "mixed");
    const month = await db.query<{ locked: boolean; day_revision: string }>(
      "select * from training_calendar('2026-08-01','2026-08-31')",
    );
    assert.equal(month.rows.length, 2);
    assert.ok(
      month.rows.every((r) => !r.locked && r.day_revision === mixed.version),
    );
    const rest = await set("rest", mixed.version);
    assert.equal(rest.mode, "rest");
    assert.deepEqual(rest.rows, []);
    assert.equal(
      (
        await db.query(
          "select id from workout_sessions where deleted_at is not null",
        )
      ).rows.length,
      2,
      "仅软删除，可在已有回收站查看",
    );
    const next = await set("strength", rest.version);
    const id = (
      await db.query<{ id: string }>(
        "select id from workout_sessions where deleted_at is null",
      )
    ).rows[0].id;
    await db.query(
      "insert into workout_exercises(user_id,session_id,exercise_name) values($1,$2,'胸部动作')",
      [a, id],
    );
    assert.equal((await read()).locked, true);
    await assert.rejects(set("rest", next.version), /已有具体训练内容/);
    assert.equal((await read()).mode, "strength");
    await assert.rejects(
      set("strength", EMPTY_DAY_VERSION, "2019-01-01"),
      /范围/,
    );
    await assert.rejects(
      set("cardio", EMPTY_DAY_VERSION, "2031-01-01"),
      /范围/,
    );
    await assert.rejects(set("unsupported", EMPTY_DAY_VERSION), /无效/);
    const future = await set("mixed", EMPTY_DAY_VERSION, "2028-08-23");
    assert.equal(future.mode, "mixed");
    assert.ok(future.rows.every((r) => r.status === "planned"));
    // Metadata is also protected even before the first action was added.
    await db.query(
      "insert into workout_sessions(user_id,training_date,training_type,status,notes) values($1,'2026-08-24','cardio','completed','真实备注')",
      [a],
    );
    const noteDay = await read("2026-08-24");
    assert.equal(noteDay.locked, true);
    await assert.rejects(
      set("strength", noteDay.version, "2026-08-24"),
      /已有具体训练内容/,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [b]);
    assert.equal((await read()).mode, "rest");
    await set("cardio", EMPTY_DAY_VERSION);
    assert.equal((await read()).mode, "cardio");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [a]);
    assert.equal((await read()).mode, "strength");
    await db.exec("reset role; set role anon");
    await assert.rejects(read(), /permission denied/);
    await assert.rejects(set("rest", EMPTY_DAY_VERSION), /permission denied/);
  } finally {
    await db.close();
  }
});
