import test from "node:test";
import assert from "node:assert/strict";
import {
  createNote,
  emptyWorkbench,
  muscleFamily,
  muscleTotals,
  readWorkbench,
  persistedWorkbench,
} from "../src/lib/training-workbench";
test("新未命名便签只在内存；命名才保存，日期安排不留下悬空引用，旧便签不删除", () => {
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
  assert.equal(persistedWorkbench(state).notes.length, 2);
  note.title = "未命名计划";
  assert.equal(persistedWorkbench(state).notes.length, 1);
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
