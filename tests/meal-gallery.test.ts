import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("饮食图库迁移保留原记录，单张备注独立且长度受限，加餐和热量不影响RLS", async () => {
  const db = new PGlite();
  await db.exec(`create role authenticated;
    create table meal_entries(id text primary key, user_id text not null, meal_date date, meal_type text constraint meal_entries_meal_type_check check(meal_type in ('breakfast','lunch','dinner')), notes text default '');
    create table meal_photos(id text primary key,user_id text not null,meal_id text references meal_entries(id));
    insert into meal_entries values('meal','a','2026-10-18','breakfast','原有餐备注');
    insert into meal_photos values('photo1','a','meal'),('photo2','a','meal');
    alter table meal_entries enable row level security; alter table meal_photos enable row level security;
    create policy own_meal on meal_entries to authenticated using(user_id=current_setting('app.owner')) with check(user_id=current_setting('app.owner'));
    create policy own_photo on meal_photos to authenticated using(user_id=current_setting('app.owner')) with check(user_id=current_setting('app.owner'));
    grant select,insert,update,delete on meal_entries,meal_photos to authenticated;
  `);
  await db.exec(
    await readFile("supabase/migrations/202610180001_meal_gallery.sql", "utf8"),
  );
  await db.exec(
    `set role authenticated; set app.owner='a'; update meal_photos set notes='第一张的备注' where id='photo1';`,
  );
  const photos = await db.query<{ notes: string }>(
    "select notes from meal_photos order by id",
  );
  assert.deepEqual(
    photos.rows.map((row) => row.notes),
    ["第一张的备注", ""],
  );
  assert.equal(
    (
      await db.query<{ notes: string }>(
        "select notes from meal_entries where id='meal'",
      )
    ).rows[0].notes,
    "原有餐备注",
  );
  await db.exec(
    "insert into meal_entries(id,user_id,meal_date,meal_type,calories) values('snack','a','2026-10-18','snack',200)",
  );
  await assert.rejects(
    db.query("update meal_entries set calories=-1 where id='snack'"),
  );
  await assert.rejects(
    db.query("update meal_photos set notes=$1 where id='photo1'", [
      "x".repeat(4001),
    ]),
  );
  await db.exec("set app.owner='b'");
  assert.equal((await db.query("select * from meal_photos")).rows.length, 0);
  assert.equal(
    (
      await db.query(
        "update meal_photos set notes='越权' where id='photo1' returning id",
      )
    ).rows.length,
    0,
  );
  await db.close();
});
