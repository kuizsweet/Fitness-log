import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createNote,
  emptyWorkbench,
  type WorkbenchState,
} from "../src/lib/training-workbench";
import {
  mergeWorkbenches,
  syncWorkbenchOnce,
  workbenchKey,
  stableWorkbench,
  type WorkbenchSnapshot,
} from "../src/lib/workbench-sync";

function store() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}
const note = (title: string) => ({ ...createNote(0), title });
test("首次同步合并两边便签，空设备不能清空云端，空白便签也保存", async () => {
  const user = crypto.randomUUID(),
    key = workbenchKey(user),
    local = store(),
    online = store();
  const blank = note("");
  local.setItem(
    `${key}:drafts`,
    JSON.stringify({
      notes: [blank],
      assignments: { "2026-10-30": [blank.id] },
    }),
  );
  let cloud: WorkbenchSnapshot = { state: emptyWorkbench(), revision: 0 };
  const get = async () => structuredClone(cloud);
  const save = async (next: WorkbenchSnapshot) => {
    assert.equal(next.revision, cloud.revision);
    cloud = { ...next, revision: next.revision + 1 };
    return structuredClone(cloud);
  };
  await syncWorkbenchOnce(user, local, get, save);
  assert.equal(cloud.state.notes.length, 1);
  assert.equal(cloud.state.notes[0].title, "");
  await syncWorkbenchOnce(user, online, get, save);
  assert.equal(cloud.revision, 1);
  assert.deepEqual(JSON.parse(online.getItem(`${key}:drafts`)!).assignments, {
    "2026-10-30": [blank.id],
  });
  assert.equal(
    JSON.parse(local.getItem(`${key}:before-cloud-sync`)!).notes[0].id,
    blank.id,
  );
});
test("三方合并独立新增与删除；同一便签冲突时不静默覆盖", () => {
  const a = note("胸三头"),
    b = note("背二头");
  const base: WorkbenchState = { notes: [a], assignments: {} };
  assert.deepEqual(
    mergeWorkbenches(
      base,
      { notes: [], assignments: {} },
      { notes: [a, b], assignments: {} },
    ).notes,
    [b],
  );
  assert.throws(
    () =>
      mergeWorkbenches(
        base,
        { ...base, notes: [{ ...a, title: "本地改名" }] },
        { ...base, notes: [{ ...a, title: "云端改名" }] },
      ),
    /两处修改/,
  );
  assert.equal(
    mergeWorkbenches(base, base, { ...base, notes: [{ ...a, color: "blue" }] })
      .notes[0].color,
    "blue",
  );
});
test("独立日期安排并集，取消安排不复活，已删除便签不留下日期引用", () => {
  const a = note("胸"),
    b = note("背");
  const base: WorkbenchState = {
    notes: [a, b],
    assignments: { "2026-10-30": [a.id] },
  };
  const merged = mergeWorkbenches(
    base,
    { ...base, assignments: {} },
    { ...base, assignments: { ...base.assignments, "2026-10-31": [b.id] } },
  );
  assert.deepEqual(merged.assignments, { "2026-10-31": [b.id] });
});
test("网络失败不写空状态；账号切换后的响应不能写回", async () => {
  const user = crypto.randomUUID(),
    key = workbenchKey(user),
    local = store();
  const raw = JSON.stringify({ notes: [note("力量")], assignments: {} });
  local.setItem(`${key}:drafts`, raw);
  const save = async () => {
    throw Error("不应写入");
  };
  await assert.rejects(
    syncWorkbenchOnce(
      user,
      local,
      async () => {
        throw Error("离线");
      },
      save,
    ),
    /离线/,
  );
  assert.equal(local.getItem(`${key}:drafts`), raw);
  await syncWorkbenchOnce(
    user,
    local,
    async () => ({ state: emptyWorkbench(), revision: 0 }),
    save,
    () => false,
  );
  assert.equal(local.getItem(`${key}:cloud-base`), null);
});
test("请求期间的新编辑留在本地，下一轮继续同步；jsonb键顺序不会制造修改", async () => {
  const user = crypto.randomUUID(),
    key = workbenchKey(user),
    local = store(),
    a = note("初始");
  local.setItem(
    `${key}:drafts`,
    JSON.stringify({ notes: [a], assignments: {} }),
  );
  await syncWorkbenchOnce(
    user,
    local,
    async () => ({ state: emptyWorkbench(), revision: 0 }),
    async (s) => {
      local.setItem(
        `${key}:drafts`,
        JSON.stringify({ ...s.state, notes: [{ ...a, title: "请求中编辑" }] }),
      );
      return { ...s, revision: 1 };
    },
  );
  assert.equal(
    JSON.parse(local.getItem(`${key}:drafts`)!).notes[0].title,
    "请求中编辑",
  );
  assert.equal(
    JSON.parse(local.getItem(`${key}:cloud-base`)!).state.notes[0].title,
    "初始",
  );
  assert.equal(
    stableWorkbench({ a: 1, b: 2 }),
    stableWorkbench({ b: 2, a: 1 }),
  );
});
test("计划表真实PostgreSQL权限隔离、版本冲突与事务写入", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to anon,authenticated;`);
    await db.exec(
      await readFile(
        "supabase/migrations/202610290001_workbench_sync.sql",
        "utf8",
      ),
    );
    const a = crypto.randomUUID(),
      b = crypto.randomUUID();
    await db.query("insert into auth.users values($1),($2)", [a, b]);
    const asUser = async (id: string) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    };
    await asUser(a);
    const saved = await db.query<{ data: WorkbenchSnapshot }>(
      "select public.save_training_workbench($1::jsonb,0) as data",
      [JSON.stringify({ notes: [note("私人计划")], assignments: {} })],
    );
    assert.equal(saved.rows[0].data.revision, 1);
    await assert.rejects(
      db.query("select public.save_training_workbench($1::jsonb,0)", [
        JSON.stringify(emptyWorkbench()),
      ]),
      /版本冲突/,
    );
    await assert.rejects(
      db.exec("delete from public.training_workbenches"),
      /permission denied/,
    );
    await asUser(b);
    assert.equal(
      (await db.query("select * from public.training_workbenches")).rows.length,
      0,
    );
    await asUser(a);
    assert.equal(
      (await db.query("select state from public.training_workbenches")).rows
        .length,
      1,
    );
    await db.exec("reset role;set role anon");
    await assert.rejects(
      db.exec("select * from public.training_workbenches"),
      /permission denied/,
    );
    await assert.rejects(
      db.exec("select public.save_training_workbench('{}',0)"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
