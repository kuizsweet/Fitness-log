import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { migrationBundle } from "../scripts/prepare-supabase.mjs";
test("部署包事务安装、重复执行保留数据、权限移除 TRUNCATE", async () => {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);alter table storage.objects enable row level security;
grant usage on schema auth,storage,public to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated;
alter default privileges in schema public grant all on tables to authenticated,anon;`);
  const sql = await migrationBundle();
  await db.exec(sql);
  const user = crypto.randomUUID();
  await db.query("insert into auth.users(id) values($1)", [user]);
  await db.query(
    "insert into public.exercises(user_id,name) values($1,'迁移保留测试')",
    [user],
  );
  await db.exec(sql);
  assert.equal(
    (await db.query("select * from public.exercises")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from fitness_journal_meta.migrations")).rows
      .length,
    3,
  );
  assert.equal(
    (
      await db.query<{ can: boolean }>(
        "select has_table_privilege('authenticated','public.workout_sessions','truncate') as can",
      )
    ).rows[0].can,
    false,
  );
  assert.equal(
    (
      await db.query<{ can: boolean }>(
        "select has_table_privilege('anon','public.profiles','select') as can",
      )
    ).rows[0].can,
    false,
  );
  assert.equal(
    (
      await db.query<{ can: boolean }>(
        "select has_table_privilege('authenticated','public.import_previews','update') as can",
      )
    ).rows[0].can,
    false,
  );
  await db.exec("drop schema fitness_journal_meta cascade");
  await assert.rejects(db.exec(sql), /已有业务表/);
  await db.exec("rollback");
  assert.equal(
    (await db.query("select * from public.exercises")).rows.length,
    1,
  );
  await db.close();
});
