import test from "node:test";
import assert from "node:assert/strict";
import {
  createNote,
  fitNoteToCanvas,
  planMuscleDistribution,
  type PlanExercise,
} from "../src/lib/training-workbench";
const exercise = (
  id: string,
  muscle: string,
  sets: number | null,
  sourceId?: string,
): PlanExercise => ({
  id,
  name: id,
  muscle,
  sets,
  reps: null,
  weight: null,
  sourceId,
});
test("分肌群分母独立，未知归未细分，零/空组数不编造，源分类保持稳定", () => {
  const list = [
    exercise("a", "胸 / 上胸", 3),
    exercise("b", "胸 / 中胸", 6),
    exercise("c", "胸部", 2),
    exercise("d", "背阔肌", 9),
    exercise("e", "三角肌", null),
    exercise("f", "胸 / 下胸", 0),
    exercise("g", "胸 / 未细分", 1, "free-db:Low_Cable_Crossover"),
    exercise("h", "胸", 9, "free-db:Behind_Head_Chest_Stretch"),
  ];
  assert.deepEqual(planMuscleDistribution(list), {
    胸: { 上胸: 4, 中胸: 6, 未细分: 2 },
    背: { 背阔肌: 9 },
  });
  assert.deepEqual(
    planMuscleDistribution(list.filter((e) => e.id !== "b")).胸,
    { 上胸: 4, 未细分: 2 },
  );
  assert.deepEqual(planMuscleDistribution([]), {});
  assert.equal(list[6].muscle, "胸 / 未细分");
});
test("便签完整限制在可用画布内，窗口缩小/旧坐标/放大均无越界且不修改原数据", () => {
  const n = { ...createNote(0), x: 600, y: 900, width: 650, height: 600 };
  const fitted = fitNoteToCanvas(n, 520, 500);
  assert.deepEqual(
    [fitted.x, fitted.y, fitted.width, fitted.height],
    [0, 0, 520, 500],
  );
  const moved = fitNoteToCanvas({ ...n, width: 300, height: 220 }, 520, 500);
  assert.deepEqual([moved.x, moved.y], [220, 280]);
  assert.equal(n.x, 600);
  assert.equal(fitNoteToCanvas(n, 0, 0), n);
});
import {
  resizeNoteFromEdge,
  type ResizeEdge,
} from "../src/lib/training-workbench";
test("四边四角缩放保持相反边固定，限制最小尺寸与画布边界", () => {
  const note = { ...createNote(0), x: 100, y: 100, width: 340, height: 290 };
  assert.deepEqual(resizeNoteFromEdge(note, "nw", -30, -40, 800, 700), {
    x: 70,
    y: 60,
    width: 370,
    height: 330,
  });
  assert.deepEqual(resizeNoteFromEdge(note, "w", 1000, 0, 800, 700), {
    x: 140,
    y: 100,
    width: 300,
    height: 290,
  });
  for (const edge of [
    "n",
    "s",
    "e",
    "w",
    "ne",
    "nw",
    "se",
    "sw",
  ] as ResizeEdge[]) {
    for (const delta of [-1000, 1000]) {
      const rect = resizeNoteFromEdge(note, edge, delta, delta, 800, 700);
      assert.ok(
        rect.x >= 0 && rect.y >= 0 && rect.width >= 300 && rect.height >= 220,
      );
      assert.ok(rect.x + rect.width <= 800 && rect.y + rect.height <= 700);
      if (edge.includes("w"))
        assert.equal(rect.x + rect.width, note.x + note.width);
      if (edge.includes("n"))
        assert.equal(rect.y + rect.height, note.y + note.height);
    }
  }
  assert.equal(note.x, 100);
});
import {
  centerNoteInCanvas,
  persistedWorkbench,
  readWorkbench,
} from "../src/lib/training-workbench";
test("新建/仓库返回居中；仓库标记持久化，不删除动作与日期安排", () => {
  const note = {
    ...centerNoteInCanvas(createNote(0), 520, 726),
    title: "存档计划",
    inWarehouse: true,
    savedToWarehouse: true,
  };
  assert.equal(note.x, 90);
  assert.equal(note.y, 218);
  const state = { notes: [note], assignments: { "2026-10-17": [note.id] } };
  const restored = readWorkbench(JSON.stringify(persistedWorkbench(state)));
  assert.equal(restored.notes[0].inWarehouse, true);
  assert.deepEqual(restored.assignments, state.assignments);
  const unnamed = {
    ...note,
    title: "",
    temporary: true,
    savedToWarehouse: false,
  };
  assert.equal(
    persistedWorkbench({ notes: [unnamed], assignments: {} }).notes.length,
    0,
  );
});
