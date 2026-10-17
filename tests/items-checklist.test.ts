import test from "node:test";
import assert from "node:assert/strict";
import {
  checklistDay,
  addChecklistExamples,
  orderItems,
  readChecklist,
  toggleItem,
  type ChecklistItem,
} from "../src/lib/items-checklist";
test("新旧账号只初始化一次可删除示例，不重复添加或挤掉已有物品", () => {
  assert.equal(readChecklist(null).needsExamples, true);
  const defaults = addChecklistExamples([]);
  assert.deepEqual(
    defaults.map((item) => item.text),
    ["水杯", "耳机"],
  );
  assert.ok(defaults.every((item) => !item.completed));
  assert.equal(new Set(defaults.map((item) => item.id)).size, 2);
  assert.equal(addChecklistExamples(defaults).length, 2);
  const deleted = JSON.stringify({
    day: "2026-10-17",
    examplesInitialized: true,
    items: [],
  });
  assert.equal(readChecklist(deleted, "2026-10-18").needsExamples, false);
  assert.deepEqual(readChecklist(deleted, "2026-10-18").items, []);
  const full = Array.from({ length: 10 }, (_, order) => ({
    id: String(order),
    text: `物品${order}`,
    completed: false,
    order,
  }));
  assert.deepEqual(addChecklistExamples(full), full);
});
const items: ChecklistItem[] = [
  { id: "a", text: "a", completed: false, order: 0 },
  { id: "b", text: "b", completed: false, order: 1 },
  { id: "c", text: "c", completed: false, order: 2 },
];
test("勾选插入已完成分组顶部；手动只调整组内顺序，取消勾选返回未完成分组", () => {
  const first = toggleItem(items, "a", true);
  const second = toggleItem(first, "b", true);
  assert.deepEqual(
    second.map((item) => item.id),
    ["c", "b", "a"],
  );
  const manual = orderItems([second[1], second[0], second[2]]);
  assert.deepEqual(
    manual.map((item) => item.id),
    ["c", "b", "a"],
  );
  const unchecked = toggleItem(second, "b", false);
  assert.deepEqual(
    unchecked.map((item) => item.id),
    ["c", "b", "a"],
  );
  assert.equal(unchecked[1].completed, false);
  assert.equal(items[0].completed, false);
});
test("跨日清除完成状态并保留顺序；同日刷新保留完成状态；旧格式无损迁移", () => {
  const checked = toggleItem(items, "b", true);
  const stored = JSON.stringify({ day: "2026-10-17", items: checked });
  assert.equal(readChecklist(stored, "2026-10-17").items[2].completed, true);
  const reset = readChecklist(stored, "2026-10-18");
  assert.equal(reset.needsReset, true);
  assert.ok(reset.items.every((item) => !item.completed));
  assert.deepEqual(
    reset.items.map((item) => item.id),
    ["a", "c", "b"],
  );
  assert.deepEqual(readChecklist(JSON.stringify(checked)).items, checked);
  assert.equal(checklistDay(new Date(2026, 9, 17, 23, 59)), "2026-10-17");
  assert.equal(checklistDay(new Date(2026, 9, 18, 0, 0)), "2026-10-18");
});
