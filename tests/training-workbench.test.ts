import { chestTotals } from "../src/lib/training-workbench";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createNote,
  closeWorkbenchNote,
  deleteWorkbenchNote,
  emptyWorkbench,
  muscleFamily,
  muscleTotals,
  readWorkbench,
  persistedWorkbench,
} from "../src/lib/training-workbench";
test("关闭已入库便签保留仓库与日期引用，仓库删除才移除两者", () => {
  const stored = {
    ...createNote(0),
    savedToWarehouse: true,
    inWarehouse: false,
  };
  const draft = createNote(1);
  const state = {
    notes: [stored, draft],
    assignments: { "2026-10-17": [stored.id] },
  };
  const closed = closeWorkbenchNote(state, stored.id);
  assert.equal(closed.notes.length, 2);
  assert.equal(closed.notes[0].inWarehouse, true);
  assert.deepEqual(closed.assignments, state.assignments);
  assert.equal(persistedWorkbench(closed).notes[0].id, stored.id);
  const deleted = deleteWorkbenchNote(closed, stored.id);
  assert.deepEqual(deleted.notes, [draft]);
  assert.deepEqual(deleted.assignments["2026-10-17"], []);
  assert.deepEqual(closeWorkbenchNote(state, draft.id).notes, [stored]);
});
test("新便签命名仍为草稿，入库才保存；日期引用过滤且旧便签不删除", () => {
  const note = createNote(0);
  const legacy = {
    ...createNote(1),
    temporary: undefined,
    title: "未命名计划",
  };
  const state = {
    notes: [note, legacy],
    assignments: { "2026-10-17": [note.id, legacy.id] },
  };
  const persisted = persistedWorkbench(state);
  assert.deepEqual(
    persisted.notes.map((n) => n.id),
    [legacy.id],
  );
  assert.deepEqual(persisted.assignments["2026-10-17"], [legacy.id]);
  note.title = "推训练";
  assert.equal(persistedWorkbench(state).notes.length, 1);
  note.savedToWarehouse = true;
  note.inWarehouse = true;
  assert.equal(persistedWorkbench(state).notes.length, 2);
  note.title = "未命名计划";
  assert.equal(persistedWorkbench(state).notes.length, 2);
});
test("工作台草稿保存位置、大小、置顶、训练参数和日期；不注入演示计划", () => {
  assert.deepEqual(readWorkbench(null), emptyWorkbench());
  const note = createNote(0);
  note.exercises.push({
    id: "exercise",
    name: "用户动作",
    muscle: "胸",
    sets: 3,
    reps: 10,
    weight: 20,
  });
  note.pinned = true;
  const state = { notes: [note], assignments: { "2026-10-17": [note.id] } };
  assert.deepEqual(readWorkbench(JSON.stringify(state)), state);
  assert.throws(() =>
    readWorkbench(
      JSON.stringify({ ...state, assignments: { "2026-02-30": [note.id] } }),
    ),
  );
  assert.throws(() =>
    readWorkbench(
      JSON.stringify({ ...state, assignments: { "2031-01-01": [note.id] } }),
    ),
  );
  assert.throws(() =>
    readWorkbench(
      JSON.stringify({ ...state, assignments: { "2026-10-17": ["missing"] } }),
    ),
  );
  assert.throws(() =>
    readWorkbench(
      JSON.stringify({ ...state, notes: [{ ...note, width: -1 }] }),
    ),
  );
});
test("肌群环仅汇总已填写组数，空值不生成百分比", () => {
  const note = createNote(0);
  assert.deepEqual(muscleTotals(note), []);
  note.exercises = [
    { id: "a", name: "a", muscle: "胸", sets: 3, reps: null, weight: null },
    { id: "b", name: "b", muscle: "胸", sets: 2, reps: null, weight: null },
    { id: "c", name: "c", muscle: "背", sets: null, reps: 12, weight: 30 },
    { id: "d", name: "d", muscle: "", sets: 1, reps: null, weight: null },
  ];
  assert.deepEqual(muscleTotals(note), [
    ["胸", 5],
    ["其他", 1],
  ]);
  assert.equal(muscleFamily("肱三头肌"), "手臂");
});

test("胸部占比以胸部组数为分母，旧来源重新归类，非胸及拉伸不混入", () => {
  const note = createNote(0);
  note.exercises = [
    {
      id: "a",
      sourceId: "free-db:Low_Cable_Crossover",
      name: "旧名称",
      muscle: "胸 / 未细分",
      sets: 3,
      reps: null,
      weight: null,
    },
    {
      id: "b",
      sourceId: "free-db:Alternating_Floor_Press",
      name: "卧推",
      muscle: "胸",
      sets: 6,
      reps: null,
      weight: null,
    },
    {
      id: "c",
      sourceId: "free-db:Behind_Head_Chest_Stretch",
      name: "拉伸",
      muscle: "胸",
      sets: 8,
      reps: null,
      weight: null,
    },
    {
      id: "d",
      name: "深蹲",
      muscle: "股四头肌",
      sets: 20,
      reps: null,
      weight: null,
    },
  ];
  assert.deepEqual(chestTotals(note), [
    ["上胸", 3],
    ["中胸", 6],
  ]);
  assert.deepEqual(chestTotals(), []);
});
test("旧持久便签保留；新草稿只有入库才保存，取回后继续保存", () => {
  const original = { ...createNote(0), title: "旧已保存便签" };
  delete original.savedToWarehouse;
  const migrated = readWorkbench(
    JSON.stringify({ notes: [original], assignments: {} }),
  );
  assert.equal(migrated.notes[0].savedToWarehouse, true);
  const draft = { ...createNote(1), title: "命名也不自动保存" };
  assert.deepEqual(
    persistedWorkbench({ notes: [draft], assignments: {} }).notes,
    [],
  );
  draft.savedToWarehouse = true;
  draft.inWarehouse = false;
  assert.equal(
    persistedWorkbench({ notes: [draft], assignments: {} }).notes.length,
    1,
  );
});
