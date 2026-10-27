import { magnetInPaperUpperHalf } from "../src/lib/training-workbench";
import { fridgePaperDelta } from "../src/lib/training-workbench";
import { clampFridgePosition, warehousePaperSize, paperVariant } from "../src/lib/training-workbench";
import { NOTE_COLORS, NOTE_COLOR_NAMES } from "../src/lib/note-colors";
import { chestTotals } from "../src/lib/training-workbench";
import test from "node:test";
import assert from "node:assert/strict";
import {
  createNote,
  placeNoteAtPointer,
  assignWorkbenchNote,
  unassignWorkbenchNote,
  warehouseSections,
  calendarNoteColors,
  insertWarehouseNote,
  warehouseInsertBefore,
  closeWorkbenchNote,
  copyWarehouseNote,
  deleteWorkbenchNote,
  emptyWorkbench,
  muscleFamily,
  muscleTotals,
  readWorkbench,
  persistedWorkbench,
} from "../src/lib/training-workbench";
test("过去日期不可安排便签，当天与未来可以安排", () => {
  const note = createNote(0);
  const state = { notes: [note], assignments: {} };
  assert.equal(assignWorkbenchNote(state, note.id, "2026-10-25", null, "2026-10-26"), state);
  for (const date of ["2026-10-26", "2026-10-27"])
    assert.deepEqual(assignWorkbenchNote(state, note.id, date, null, "2026-10-26").assignments[date], [note.id]);
});
test("历史成果颜色跟随对应便签，旧肩日匹配肩腿日且不沿用过期安排", () => {
  const note = { ...createNote(0), title: "肩腿日", color: "blue" as const };
  const state = { notes: [note], assignments: {} };
  assert.deepEqual(calendarNoteColors(state, "2026-10-12", ["肩日"]), [NOTE_COLORS.blue]);
  assert.deepEqual(calendarNoteColors({ ...state, notes: [{ ...note, color: "red" }] }, "2026-10-12", ["肩日"]), [NOTE_COLORS.red]);
  assert.deepEqual(calendarNoteColors(state, "2026-10-12", []), []);
});
test("日期安排保存便签，仓库按当天分层，拖回备选只取消当天", () => {
  const a = { ...createNote(0), id: "a", color: "red" as const };
  const b = {
    ...createNote(1),
    id: "b",
    inWarehouse: true,
    savedToWarehouse: true,
  };
  const initial = { notes: [a, b], assignments: { "2026-10-20": ["a"] } };
  const assigned = assignWorkbenchNote(initial, "a", "2026-10-19", "b");
  const saved = readWorkbench(JSON.stringify(persistedWorkbench(assigned)));
  assert.deepEqual(
    warehouseSections(saved, "2026-10-19").day.map((n) => n.id),
    ["a"],
  );
  assert.deepEqual(
    warehouseSections(saved, "2026-10-19").backup.map((n) => n.id),
    ["b"],
  );
  assert.deepEqual(
    assignWorkbenchNote(saved, "a", "2026-10-19").assignments["2026-10-19"],
    ["a"],
  );
  const backup = unassignWorkbenchNote(saved, "a", "2026-10-19");
  assert.deepEqual(backup.assignments["2026-10-19"], []);
  assert.deepEqual(backup.assignments["2026-10-20"], ["a"]);
  assert.equal(backup.notes.find((n) => n.id === "a")?.color, "red");
  const editing = {
    ...saved,
    notes: saved.notes.map((n) => ({ ...n, inWarehouse: false })),
  };
  assert.equal(warehouseSections(editing, "2026-10-19").day.length, 0);
});
test("日历颜色跟随便签颜色且合并同色，删除后清除对应色底", () => {
  const notes = ["red", "green", "red"].map((color, index) => ({
    ...createNote(index),
    id: String(index),
    color: color as "red" | "green",
  }));
  const state = {
    notes,
    assignments: { "2026-10-19": ["0", "1", "2", "missing"] },
  };
  assert.deepEqual(calendarNoteColors(state, "2026-10-19"), [
    NOTE_COLORS.red,
    NOTE_COLORS.green,
  ]);
  assert.deepEqual(
    calendarNoteColors(deleteWorkbenchNote(state, "1"), "2026-10-19"),
    [NOTE_COLORS.red],
  );
  assert.deepEqual(calendarNoteColors(state, "2026-10-20"), []);
});
test("仓库复制插入原项后并生成独立便签和动作ID，不复制日期安排", () => {
  const source = {
    ...createNote(0),
    inWarehouse: true,
    savedToWarehouse: true,
    exercises: [
      {
        id: "original",
        name: "卧推",
        muscle: "胸",
        sets: 3,
        reps: 8,
        weight: 30,
      },
    ],
  };
  const other = createNote(1);
  const state = {
    notes: [source, other],
    assignments: { "2026-10-17": [source.id] },
  };
  const copied = copyWarehouseNote(state, source.id);
  assert.equal(copied.notes.length, 3);
  assert.equal(copied.notes[0], source);
  assert.equal(copied.notes[2], other);
  assert.notEqual(copied.notes[1].id, source.id);
  assert.notEqual(copied.notes[1].exercises[0].id, "original");
  assert.equal(copied.notes[1].exercises[0].sets, 3);
  assert.equal(copied.notes[1].inWarehouse, true);
  assert.deepEqual(copied.assignments, state.assignments);
  assert.equal(copyWarehouseNote(state, other.id), state);
  const full = { ...state, notes: Array.from({ length: 30 }, () => source) };
  assert.equal(copyWarehouseNote(full, source.id), full);
});
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

test("便签灰色和七色可持久化与复制，旧便签无需颜色字段", () => {
  for (const color of NOTE_COLOR_NAMES) {
    const note = {
      ...createNote(0),
      color,
      inWarehouse: true,
      savedToWarehouse: true,
    };
    const state = { notes: [note], assignments: {} };
    const saved = readWorkbench(JSON.stringify(persistedWorkbench(state)));
    assert.equal(saved.notes[0].color, color);
    assert.equal(copyWarehouseNote(saved, note.id).notes[1].color, color);
  }
  assert.equal(createNote(0).color, "gray");
  const old = { ...createNote(0), color: undefined, savedToWarehouse: true };
  assert.equal(
    readWorkbench(JSON.stringify({ notes: [old], assignments: {} })).notes[0]
      .color,
    undefined,
  );
});

test("仓库按鼠标所在行的上半部或下半部决定插入位置", () => {
  const rows = [
    { id: "a", top: 10, height: 40 },
    { id: "b", top: 58, height: 40 },
    { id: "c", top: 106, height: 40 },
  ];
  assert.equal(warehouseInsertBefore(rows, 15), "a");
  assert.equal(warehouseInsertBefore(rows, 40), "b");
  assert.equal(warehouseInsertBefore(rows, 90), "c");
  assert.equal(warehouseInsertBefore(rows, 150), null);
  assert.equal(warehouseInsertBefore([], 0), null);
});
test("画布便签可插入仓库任意位置，仓库已有便签可重新排序且保留颜色、动作与日期引用", () => {
  const a = {
    ...createNote(0),
    id: "a",
    inWarehouse: true,
    savedToWarehouse: true,
    color: "red" as const,
  };
  const b = { ...createNote(1), id: "b", inWarehouse: true };
  const c = { ...createNote(2), id: "c", inWarehouse: true };
  const d = { ...createNote(3), id: "d", color: "green" as const };
  const state = { notes: [a, b, c, d], assignments: { "2026-10-19": ["a"] } };
  const order = (value: typeof state) =>
    value.notes.filter((n) => n.inWarehouse).map((n) => n.id);
  const middle = insertWarehouseNote(state, "d", "b");
  assert.deepEqual(order(middle as typeof state), ["a", "d", "b", "c"]);
  assert.deepEqual(
    order(insertWarehouseNote(state, "d", "a") as typeof state),
    ["d", "a", "b", "c"],
  );
  assert.deepEqual(
    order(insertWarehouseNote(state, "d", null) as typeof state),
    ["a", "b", "c", "d"],
  );
  const reordered = insertWarehouseNote(middle, "a", "c");
  assert.deepEqual(order(reordered as typeof state), ["d", "b", "a", "c"]);
  assert.equal(reordered.notes.find((n) => n.id === "a")?.color, "red");
  assert.equal(
    reordered.notes.find((n) => n.id === "d")?.savedToWarehouse,
    true,
  );
  assert.deepEqual(reordered.assignments, state.assignments);
  assert.deepEqual(
    readWorkbench(JSON.stringify(persistedWorkbench(reordered))).notes.map(
      (n) => n.id,
    ),
    reordered.notes
      .filter((n) => !n.temporary || n.savedToWarehouse)
      .map((n) => n.id),
  );
});

test("library insertion targets the beginning, row gaps, end and scrolled rows", async () => {
  const { exerciseInsertionIndex } =
    await import("../src/lib/training-workbench");
  const rows = [
    { top: 100, height: 50 },
    { top: 150, height: 50 },
    { top: 200, height: 50 },
  ];
  assert.equal(exerciseInsertionIndex(rows, 90), 0);
  assert.equal(exerciseInsertionIndex(rows, 149), 1);
  assert.equal(exerciseInsertionIndex(rows, 199), 2);
  assert.equal(exerciseInsertionIndex(rows, 240), 3);
  assert.equal(exerciseInsertionIndex([], 100), 0);
  assert.equal(exerciseInsertionIndex(rows), 3);
  assert.equal(
    exerciseInsertionIndex(
      [
        { top: -30, height: 50 },
        { top: 20, height: 50 },
      ],
      10,
    ),
    1,
  );
});

test("trash feedback starts before card edges touch and clears beyond the proximity radius", async () => {
  const { nearTrashEdge } = await import("../src/lib/training-workbench");
  const bin = { left: 100, right: 148, top: 100, bottom: 148 };
  assert.equal(
    nearTrashEdge({ left: 100, right: 148, top: 40, bottom: 75 }, bin),
    false,
  );
  assert.equal(
    nearTrashEdge({ left: 100, right: 148, top: 40, bottom: 76 }, bin),
    true,
  );
  assert.equal(
    nearTrashEdge({ left: 40, right: 76, top: 100, bottom: 148 }, bin),
    true,
  );
  assert.equal(
    nearTrashEdge({ left: 100, right: 148, top: 60, bottom: 110 }, bin),
    true,
  );
  assert.equal(
    nearTrashEdge({ left: 40, right: 80, top: 40, bottom: 80 }, bin),
    false,
  );
});

test("warehouse preview and drop share top-center placement without recentering", () => {
  const note = { ...createNote(0), width: 300, height: 240 };
  const placed = placeNoteAtPointer(note, 1000, 700, 740, 390);
  assert.equal(placed.x, 590);
  assert.equal(placed.y, 390);
  const edge = placeNoteAtPointer(note, 1000, 700, 980, 680);
  assert.equal(edge.x, 830);
  assert.equal(edge.y, 680);
  const outside = placeNoteAtPointer(note, 1000, 700, 30, -20);
  assert.equal(outside.x, -120);
  assert.equal(outside.y, -20);
  assert.equal(readWorkbench(JSON.stringify({ notes: [outside], assignments: {} })).notes[0].x, -120);
});

test("warehouse drop preserves left and right horizontal grab percentages", () => {
  const note = { ...createNote(0), width: 400, height: 240 };
  const left = placeNoteAtPointer(note, 1200, 800, 600, 200, 0.2);
  const right = placeNoteAtPointer(note, 1200, 800, 600, 200, 0.8);
  assert.equal(left.x, 520);
  assert.equal(right.x, 280);
  assert.equal(left.y, 200);
  assert.equal(right.y, 200);
});
test("仓库标题的抓取点在展开和落点中保持相同，纵向对齐标题而不是顶边", () => {
  const note = { ...createNote(0), width: 520, height: 600 };
  const placed = placeNoteAtPointer(note, 1200, 700, 600, 650, 0.5, 26);
  assert.equal(placed.x + placed.width / 2, 600);
  assert.equal(placed.y + 26, 650);
  const titleLeft = placeNoteAtPointer(note, 1200, 700, 600, 650, (260 - 12) / 520, 26);
  assert.equal(titleLeft.x + 260 - 12, 600);
  assert.equal(titleLeft.y, placed.y);
});


test("冰箱缩略便签保留宽高比例，不把高便签压成长条", async () => {
  const { warehousePaperSize } = await import("../src/lib/training-workbench");
  const tall = warehousePaperSize({ width: 520, height: 600 });
  const wide = warehousePaperSize({ width: 700, height: 300 });
  assert.equal(tall.width, wide.width);
  assert.ok(tall.height > tall.width);
  assert.ok(wide.height < wide.width);
  assert.ok(Math.abs(tall.width / tall.height - 520 / 600) < 1e-10);
  assert.ok(Math.abs(wide.width / wide.height - 700 / 300) < 1e-10);
});


test("冰箱两列便签按鼠标所在列判断插入，不误选同排左侧", () => {
  const rows = [
    { id: "a", left: 20, top: 10, width: 92, height: 100 },
    { id: "b", left: 124, top: 10, width: 92, height: 100 },
    { id: "c", left: 20, top: 120, width: 92, height: 100 },
  ];
  assert.equal(warehouseInsertBefore(rows, 30, 150), "b");
  assert.equal(warehouseInsertBefore(rows, 90, 150), "c");
  assert.equal(warehouseInsertBefore(rows, 30, 50), "a");
  assert.equal(warehouseInsertBefore(rows, 200, 50), null);
});

test("纸边和收纳形态保存后保持，旧便签纸边稳定", () => {
 const note = {...createNote(0), foldedShape: "landscape" as const, fridgePosition: {x:.2,y:.8}};
 const restored=readWorkbench(JSON.stringify({notes:[note],assignments:{}})).notes[0];
 assert.equal(restored.paperVariant,note.paperVariant);
 assert.equal(restored.foldedShape,"landscape");
 assert.deepEqual(restored.fridgePosition,{x:.2,y:.8});
 assert.ok(warehousePaperSize(note).height < warehousePaperSize(note).width);
 assert.equal(paperVariant({id:"legacy"}),paperVariant({id:"legacy"}));
});
test("磁铁坐标不能离开冰箱范围", () => {
 assert.deepEqual(clampFridgePosition(-.5,2),{x:0,y:1});
 assert.deepEqual(clampFridgePosition(.3,.7),{x:.3,y:.7});
});

test("挂在磁铁上的纸张同步移动，整张纸不能越过冰箱边缘", () => {
 const paper={left:40,top:80,width:92,height:106};
 const fridge={width:280,height:472};
 assert.deepEqual(fridgePaperDelta(20,15,paper,fridge),{x:20,y:15});
 assert.deepEqual(fridgePaperDelta(-100,-200,paper,fridge),{x:-40,y:-80});
 assert.deepEqual(fridgePaperDelta(500,500,paper,fridge),{x:148,y:286});
});

test("磁铁只吸附便签上半部，鼠标靠近或下半部接触不算挂上", () => {
 const paper={left:100,top:100,width:92,height:106};
 assert.equal(magnetInPaperUpperHalf({x:146,y:100},paper),true);
 assert.equal(magnetInPaperUpperHalf({x:146,y:150},paper),true);
 assert.equal(magnetInPaperUpperHalf({x:146,y:180},paper),false);
 assert.equal(magnetInPaperUpperHalf({x:146,y:206},paper),false);
 assert.equal(magnetInPaperUpperHalf({x:220,y:120},paper),false);
});
