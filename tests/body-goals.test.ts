import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  bodyProgress,
  emptyGoal,
  parseBodyInput,
  type BodyGoal,
} from "../src/lib/body-goals";
import { GoalEditor } from "../src/lib/goal-editor";
import { goalDraftStorage } from "../src/lib/goal-drafts";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}
test("300ms 防抖只提交连续输入的最终有效值", async () => {
  const saved: (number | null | undefined)[] = [];
  const editor = new GoalEditor(
    { read: () => null, write: () => {} },
    async (flight) => {
      saved.push(flight.changes.target_value);
      return {
        ...emptyGoal("weight"),
        target_value: flight.changes.target_value!,
        revision: 1,
        mutation_id: flight.mutation_id,
      };
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "target_value", "7");
  editor.edit("weight", "target_value", "75.");
  editor.edit("weight", "target_value", "75.5");
  assert.equal(saved.length, 0);
  await new Promise((resolve) => setTimeout(resolve, 380));
  assert.deepEqual(saved, [75.5]);
});
test("多窗口草稿分别保存；新窗口恢复须确认，其他账号不可恢复", async () => {
  const local = new MemoryStorage();
  const first = goalDraftStorage(
    local,
    new MemoryStorage(),
    "a",
    () => "first",
  );
  const editor = new GoalEditor(
    first,
    async () => {
      throw new Error("offline");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "start_value", "80");
  await editor.flush();
  const second = goalDraftStorage(
    local,
    new MemoryStorage(),
    "a",
    () => "second",
  );
  const recovered = new GoalEditor(
    second,
    async () => {
      throw new Error("must-not-auto-send");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  assert.equal(recovered.getSnapshot().conflict, true);
  assert.equal(recovered.getSnapshot().drafts.weight?.start_value?.text, "80");
  recovered.edit("weight", "target_value", "70");
  assert.ok(local.getItem(first.key));
  assert.ok(local.getItem(second.key));
  const other = goalDraftStorage(
    local,
    new MemoryStorage(),
    "b",
    () => "third",
  );
  assert.equal(other.read(), null);
  await recovered.flush(); // clears the debounce without permitting a send.
});

test("目标进度支持双向变化、缺失基准、零差值和边界", () => {
  assert.equal(bodyProgress(90, 70, 80), 50);
  assert.equal(bodyProgress(60, 80, 65), 25);
  assert.equal(bodyProgress(20, 15, 17.5), 50);
  assert.equal(bodyProgress(10, 20, 25), 100);
  assert.equal(bodyProgress(90, 70, 95), 0);
  assert.equal(bodyProgress(70, 70, 70), null);
  assert.equal(bodyProgress(90, 70, null), null);
  assert.equal(parseBodyInput("weight", ""), null);
  for (const value of ["0", "501", "-5", "1e2", "12.", "NaN"])
    assert.equal(parseBodyInput("weight", value), undefined);
  assert.equal(parseBodyInput("body_fat", "100.01"), undefined);
});

test("恢复草稿已被其他窗口提交时静默消解，不重发或抹掉不同的新输入", async () => {
  const id = crypto.randomUUID();
  const snapshot = {
    version: 1,
    sequence: 2,
    recovered: true,
    goals: [{ ...emptyGoal("weight"), revision: 1 }],
    drafts: {
      weight: {
        start_value: { text: "080", sequence: 1, expected: null },
        target_value: { text: "70", sequence: 2, expected: null },
      },
    },
    flight: {
      metric: "weight",
      mutation_id: id,
      changes: { start_value: 80 },
      expected_start: null,
      expected_target: null,
      sequences: { start_value: 1 },
    },
  };
  let persisted = "";
  const editor = new GoalEditor(
    {
      read: () => JSON.stringify(snapshot),
      write: (raw) => {
        persisted = raw;
      },
    },
    async () => {
      throw new Error("must-not-replay");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  const committed = {
    ...emptyGoal("weight"),
    start_value: 80,
    target_value: 75,
    revision: 2,
    mutation_id: id,
  };
  editor.receive([committed]);
  assert.equal(editor.getSnapshot().drafts.weight?.start_value, undefined);
  assert.equal(editor.getSnapshot().drafts.weight?.target_value?.text, "70");
  assert.equal(editor.getSnapshot().conflict, true);
  assert.equal(
    JSON.parse(persisted).recovered,
    true,
    "未解决的恢复草稿刷新后仍需核对",
  );
  await editor.flush();
  editor.receive([{ ...committed, target_value: 70, revision: 3 }]);
  assert.equal(editor.hasPending(), false);
  assert.equal(editor.getSnapshot().error, "");
  assert.equal(JSON.parse(persisted).recovered, false);
});

test("恢复时已提交旧请求不能清除同字段的较新修改", () => {
  const editor = new GoalEditor(
    {
      read: () =>
        JSON.stringify({
          version: 1,
          sequence: 2,
          recovered: true,
          goals: [],
          drafts: {
            weight: {
              start_value: { text: "82", sequence: 2, expected: null },
            },
          },
          flight: {
            metric: "weight",
            mutation_id: crypto.randomUUID(),
            changes: { start_value: 80 },
            expected_start: null,
            expected_target: null,
            sequences: { start_value: 1 },
          },
        }),
      write: () => {},
    },
    async () => {
      throw new Error("must-not-replay");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.receive([{ ...emptyGoal("weight"), start_value: 80, revision: 1 }]);
  assert.equal(editor.getSnapshot().drafts.weight?.start_value?.text, "82");
  assert.equal(editor.getSnapshot().drafts.weight?.start_value?.expected, 80);
  assert.equal(editor.hasPending(), true);
  assert.equal(editor.getSnapshot().conflict, true);
});

test("连续编辑串行保存：旧响应不能清除新输入", async () => {
  let persisted = "";
  const sent: number[] = [];
  let release: (goal: BodyGoal) => void = () => {};
  const editor = new GoalEditor(
    {
      read: () => null,
      write: (s) => {
        persisted = s;
      },
    },
    async (flight) => {
      sent.push(flight.changes.start_value!);
      if (sent.length === 1)
        return new Promise((resolve) => {
          release = resolve;
        });
      assert.equal(flight.expected_start, 80);
      return {
        ...emptyGoal("weight"),
        start_value: flight.changes.start_value!,
        revision: 2,
        mutation_id: flight.mutation_id,
      };
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "start_value", "80");
  const running = editor.flush();
  editor.edit("weight", "start_value", "82");
  release({ ...emptyGoal("weight"), start_value: 80, revision: 1 });
  await running;
  assert.deepEqual(sent, [80, 82]);
  assert.equal(editor.getSnapshot().goals[0].start_value, 82);
  assert.ok(!JSON.parse(persisted).drafts.weight.start_value);
});

test("断网、刷新恢复、未知响应重试保留同一 mutation ID", async () => {
  let saved = "",
    id = "";
  const storage = {
    read: () => saved || null,
    write: (s: string) => {
      saved = s;
    },
  };
  const first = new GoalEditor(
    storage,
    async (flight) => {
      id = flight.mutation_id;
      throw new Error("offline");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  first.edit("body_fat", "target_value", "18");
  await first.flush();
  assert.match(first.getSnapshot().error, /输入已保留/);
  const restored = new GoalEditor(
    storage,
    async (flight) => {
      assert.equal(flight.mutation_id, id);
      return {
        ...emptyGoal("body_fat"),
        target_value: 18,
        revision: 1,
        mutation_id: id,
      };
    },
    () => {},
    () => crypto.randomUUID(),
  );
  assert.equal(
    restored.getSnapshot().drafts.body_fat?.target_value?.text,
    "18",
  );
  await restored.flush();
  assert.equal(restored.getSnapshot().error, "");
  assert.equal(restored.getSnapshot().goals[0].target_value, 18);
});

test("跨窗口冲突不会自动覆盖；用户重试才采用新基准", async () => {
  let attempts = 0;
  const editor = new GoalEditor(
    { read: () => null, write: () => {} },
    async (flight) => {
      attempts++;
      if (attempts === 1) throw new Error("版本冲突");
      assert.equal(flight.expected_target, 75);
      return { ...emptyGoal("weight"), target_value: 70, revision: 3 };
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "target_value", "70");
  await editor.flush();
  await editor.flush();
  assert.equal(attempts, 1);
  assert.equal(editor.getSnapshot().drafts.weight?.target_value?.text, "70");
  await editor.retry([
    { ...emptyGoal("weight"), target_value: 75, revision: 2 },
  ]);
  assert.equal(attempts, 2);
});

test("空基准编辑不能被后台到达的值悄悄改写", async () => {
  const editor = new GoalEditor(
    { read: () => null, write: () => {} },
    async (flight) => {
      assert.equal(flight.expected_start, null);
      throw new Error("版本冲突");
    },
    () => {},
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "start_value", "8");
  editor.receive([{ ...emptyGoal("weight"), start_value: 75, revision: 1 }]);
  editor.edit("weight", "start_value", "80");
  await editor.flush();
  assert.ok(editor.getSnapshot().conflict);
});

test("已确认旧请求重放不回退后来从服务器读到的新目标", async () => {
  let confirmed = 0;
  const editor = new GoalEditor(
    { read: () => null, write: () => {} },
    async () => ({ ...emptyGoal("weight"), target_value: 70, revision: 1 }),
    (g) => {
      confirmed = g.target_value!;
    },
    () => crypto.randomUUID(),
  );
  editor.edit("weight", "target_value", "70");
  editor.receive([{ ...emptyGoal("weight"), target_value: 68, revision: 2 }]);
  await editor.flush();
  assert.equal(confirmed, 68);
  assert.equal(editor.getSnapshot().goals[0].target_value, 68);
});

test("身体目标真实 SQL：RLS、字段冲突、幂等和独立测量", async () => {
  const db = new PGlite(); // Isolated in-memory database; no production credentials.
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema public,auth to authenticated,anon;`);
    await db.exec(
      await readFile("supabase/migrations/202610160001_body_goals.sql", "utf8"),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610160002_body_overview.sql",
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        "supabase/migrations/202610160003_body_measurement_write.sql",
        "utf8",
      ),
    );
    const a = crypto.randomUUID(),
      b = crypto.randomUUID();
    await db.query("insert into auth.users values($1),($2)", [a, b]);
    async function asUser(id: string) {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
      await db.exec("set role authenticated");
    }
    const save = async (patch: object) =>
      (
        await db.query<{ g: BodyGoal }>("select save_body_goal($1::jsonb) g", [
          JSON.stringify(patch),
        ])
      ).rows[0].g;
    const patch = {
      metric: "weight",
      mutation_id: crypto.randomUUID(),
      expected_start: null,
      expected_target: null,
      changes: { start_value: 80 },
    };
    await asUser(a);
    await db.exec(
      "insert into body_measurements(metric,value,measured_at) values('weight',80,now()-interval '1 day'),('weight',79,now()-interval '1 hour'),('weight',78,now()+interval '1 day')",
    );
    const overview = (
      await db.query<{ data: { measurements: { value: number }[] } }>(
        "select body_overview() data",
      )
    ).rows[0].data;
    assert.equal(overview.measurements.length, 1);
    assert.equal(
      overview.measurements[0].value,
      79,
      "只读最新真实测量，不取未来记录",
    );
    assert.equal((await save(patch)).revision, 1);
    assert.equal((await save(patch)).revision, 1, "重试不重复递增版本");
    const disjoint = {
      ...patch,
      mutation_id: crypto.randomUUID(),
      changes: { target_value: 70 },
    };
    assert.equal((await save(disjoint)).revision, 2, "不同字段可以合并");
    await assert.rejects(
      save({
        ...patch,
        mutation_id: crypto.randomUUID(),
        changes: { start_value: 85 },
      }),
      /版本冲突/,
    );
    assert.equal(
      (await db.query("select * from body_measurements")).rows.length,
      3,
      "目标不创建测量事实",
    );
    const beforeGoal = (await db.query("select * from body_goals")).rows;
    const measurementPatch = {
      id: crypto.randomUUID(),
      metric: "weight",
      value: 77,
      expected_value: 79,
    };
    const measure = async (p: object) =>
      (
        await db.query<{ m: { id: string; value: number } }>(
          "select save_body_measurement($1::jsonb) m",
          [JSON.stringify(p)],
        )
      ).rows[0].m;
    assert.equal((await measure(measurementPatch)).value, 77);
    assert.equal((await measure(measurementPatch)).id, measurementPatch.id);
    assert.equal(
      (await db.query("select * from body_measurements")).rows.length,
      4,
      "重试不增加测量记录",
    );
    assert.deepEqual(
      (await db.query("select * from body_goals")).rows,
      beforeGoal,
      "目前值不改写起始或目标",
    );
    await assert.rejects(
      measure({ ...measurementPatch, id: crypto.randomUUID(), value: 76 }),
      /版本冲突/,
    );
    await assert.rejects(
      measure({
        ...measurementPatch,
        id: crypto.randomUUID(),
        value: 501,
        expected_value: 77,
      }),
      /check constraint/,
    );
    assert.equal(
      (
        await db.query<{ data: { measurements: { value: number }[] } }>(
          "select body_overview() data",
        )
      ).rows[0].data.measurements[0].value,
      77,
    );
    await asUser(b);
    const hidden = (
      await db.query<{ data: { goals: unknown[]; measurements: unknown[] } }>(
        "select body_overview() data",
      )
    ).rows[0].data;
    assert.deepEqual(hidden, { goals: [], measurements: [] });
    assert.equal((await db.query("select * from body_goals")).rows.length, 0);
    await assert.rejects(
      db.query("insert into body_goals(user_id,metric) values($1,'weight')", [
        a,
      ]),
      /row-level security/,
    );
    await assert.rejects(
      save({
        ...disjoint,
        mutation_id: crypto.randomUUID(),
        changes: { target_value: 501 },
      }),
      /check constraint/,
    );
  } finally {
    await db.close();
  }
});
