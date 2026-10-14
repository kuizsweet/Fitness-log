import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { newSession, newSet, type Session } from "../src/lib/domain";

test("实际 PostgreSQL 引擎执行迁移、RLS、事务与撤销规则", async (t) => {
  const db = new PGlite({ extensions: { pgcrypto } });
  const a = crypto.randomUUID(),
    b = crypto.randomUUID();
  await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema auth,storage,public to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(
    await readFile("supabase/migrations/202610130001_initial.sql", "utf8"),
  );
  await db.exec(
    await readFile(
      "supabase/migrations/202610130002_import_previews.sql",
      "utf8",
    ),
  );
  await db.query("insert into auth.users(id) values($1),($2)", [a, b]);
  await db.exec(
    await readFile(
      "supabase/migrations/202610130003_explicit_privileges.sql",
      "utf8",
    ),
  );
  async function asUser(id: string) {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  }
  async function save(s: Session) {
    return (
      await db.query<{ result: { revision: number } }>(
        "select public.save_workout($1::jsonb) as result",
        [JSON.stringify(s)],
      )
    ).rows[0].result;
  }
  const exercise = crypto.randomUUID(),
    equipment = crypto.randomUUID();
  await asUser(a);
  await db.query(
    "insert into public.exercises(id,user_id,name) values($1,$2,$3)",
    [exercise, a, "卧推"],
  );
  await db.query(
    "insert into public.equipment(id,user_id,name,type,rule) values($1,$2,'史密斯','smith','per_side')",
    [equipment, a],
  );
  const s = newSession("2026-10-13");
  s.exercises = [
    {
      id: crypto.randomUUID(),
      exercise_id: exercise,
      equipment_id: equipment,
      exercise_name: "卧推",
      muscle_group: "胸",
      equipment_snapshot: {
        id: equipment,
        name: "史密斯",
        type: "smith",
        unit: "kg",
        rule: "per_side",
        initial_weight: null,
        increments: [],
        notes: "",
        hidden: false,
      },
      notes: "",
      sets: [newSet()],
    },
  ];
  let revision = (await save(s)).revision;
  await t.test("用户 B 无法查询、修改 A 或伪造 user_id", async () => {
    await asUser(b);
    assert.equal(
      (
        await db.query("select * from public.workout_sessions where id=$1", [
          s.id,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "update public.workout_sessions set notes=$1 where id=$2 returning id",
          ["偷改", s.id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query("insert into public.exercises(user_id,name) values($1,$2)", [
        a,
        "跨用户",
      ]),
      /row-level security/,
    );
  });
  await t.test("组合外键拒绝 B 绑定 A 的动作器材", async () => {
    await asUser(b);
    const invalid = newSession("2026-10-13");
    invalid.exercises = s.exercises.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      sets: [],
    }));
    await assert.rejects(save(invalid), /foreign key/);
    assert.equal(
      (
        await db.query("select * from public.workout_sessions where id=$1", [
          invalid.id,
        ])
      ).rows.length,
      0,
    );
  });
  await t.test("并发版本冲突拒绝覆盖，快照不随器材名称变化", async () => {
    await asUser(a);
    await assert.rejects(save({ ...s, revision: revision + 1 }), /版本冲突/);
    await db.query("update public.equipment set name='改名' where id=$1", [
      equipment,
    ]);
    assert.equal(
      (
        await db.query<{ name: string }>(
          "select equipment_snapshot->>'name' as name from public.workout_exercises where session_id=$1",
          [s.id],
        )
      ).rows[0].name,
      "史密斯",
    );
    revision = (await save({ ...s, revision })).revision;
  });
  await t.test("Storage 仅允许用户自己的路径，并绑定餐次", async () => {
    await asUser(a);
    const meal = crypto.randomUUID();
    await db.query(
      "insert into public.meal_entries(id,user_id,meal_date,meal_type) values($1,$2,'2026-10-13','breakfast')",
      [meal, a],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('meal-photos',$1)",
      [`${a}/${meal}/photo.jpg`],
    );
    await asUser(b);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('meal-photos',$1)",
        [`${a}/${meal}/hack.jpg`],
      ),
      /row-level security/,
    );
  });
  await t.test("导入原子性：第二次训练无效时整批回滚", async () => {
    await asUser(a);
    const good = newSession("2026-01-01"),
      bad = { ...newSession("2026-01-02"), status: "invalid" };
    await assert.rejects(
      db.query("select public.commit_import($1,$2,$3,$4::jsonb,$5::jsonb)", [
        "bad.xlsx",
        "a".repeat(64),
        2,
        "{}",
        JSON.stringify([good, bad]),
      ]),
      /check constraint/,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.import_batches where filename='bad.xlsx'",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query("select * from public.workout_sessions where id=$1", [
          good.id,
        ])
      ).rows.length,
      0,
    );
  });
  await t.test("重复文件阻止导入，撤销保护直接修改的组", async () => {
    await asUser(a);
    const first = newSession("2026-01-01"),
      second = newSession("2026-01-02");
    second.exercises = [
      { ...s.exercises[0], id: crypto.randomUUID(), sets: [newSet()] },
    ];
    const args = [
      "ok.xlsx",
      "b".repeat(64),
      2,
      "{}",
      JSON.stringify([first, second]),
    ];
    const bid = (
      await db.query<{ id: string }>(
        "select public.commit_import($1,$2,$3,$4::jsonb,$5::jsonb) as id",
        args,
      )
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "select public.commit_import($1,$2,$3,$4::jsonb,$5::jsonb)",
        args,
      ),
      /unique constraint/,
    );
    await db.query("update public.workout_sets set reps=10 where id=$1", [
      second.exercises[0].sets[0].id,
    ]);
    const result = (
      await db.query<{ result: { removed: number; kept: number } }>(
        "select public.undo_import($1) as result",
        [bid],
      )
    ).rows[0].result;
    assert.deepEqual(result, { removed: 1, kept: 1 });
    assert.equal(
      (
        await db.query<{ deleted_at: string | null }>(
          "select deleted_at from public.workout_sessions where id=$1",
          [second.id],
        )
      ).rows[0].deleted_at,
      null,
    );
    await asUser(b);
    await assert.rejects(
      db.query("select public.undo_import($1)", [bid]),
      /批次不存在/,
    );
  });
  await t.test("训练删除后可恢复，anon 无业务读取权", async () => {
    await asUser(a);
    await db.query(
      "update public.workout_sessions set deleted_at=now() where id=$1",
      [s.id],
    );
    await db.query(
      "update public.workout_sessions set deleted_at=null where id=$1",
      [s.id],
    );
    assert.equal(
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from public.workout_sets where workout_exercise_id=$1",
          [s.exercises[0].id],
        )
      ).rows[0].n,
      1,
    );
    await db.exec("reset role; set role anon");
    await assert.rejects(
      db.query("select * from public.workout_sessions"),
      /permission denied/,
    );
  });
  await db.close();
});
