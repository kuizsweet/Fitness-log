import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyWeight,
  totalWeight,
  today,
  shiftDate,
  newSet,
  newSession,
  workingSets,
  dateSchema,
} from "../src/lib/domain";
import { exportCsv, csvCell } from "../src/lib/export";
test("左右及杆重只计算装载质量，未知史密斯杆重不猜测", () => {
  const w = {
    ...emptyWeight("kg", "per_side"),
    left: 20,
    right: 15,
    base: null,
  };
  assert.equal(totalWeight(w), null);
  assert.equal(totalWeight({ ...w, base: 10 }), 45);
});
test("哑铃为单只，辅助重量不自动换成实际举起重量", () => {
  assert.equal(totalWeight({ ...emptyWeight("kg", "single"), value: 15 }), 15);
  assert.equal(
    totalWeight({ ...emptyWeight("kg", "assistance"), value: 40 }),
    40,
  );
});
test("日期按时区，日历运算独立于主机时区", () => {
  assert.equal(
    today("Asia/Shanghai", new Date("2026-01-01T18:00:00Z")),
    "2026-01-02",
  );
  assert.equal(
    today("America/New_York", new Date("2026-01-01T02:00:00Z")),
    "2025-12-31",
  );
  assert.equal(shiftDate("2024-02-28", 1), "2024-02-29");
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
});
test("热身不计为正式，正式组可同时拥有挑战标记", () => {
  const s = newSession("2026-01-01");
  const work = { ...newSet(), tags: ["新重量挑战", "力竭"] };
  s.exercises = [
    {
      id: crypto.randomUUID(),
      exercise_id: null,
      equipment_id: null,
      exercise_name: "卧推",
      muscle_group: "胸",
      equipment_snapshot: null,
      notes: "",
      sets: [{ ...newSet(), role: "warmup" }, work],
    },
  ];
  assert.equal(workingSets(s), 1);
  assert.match(exportCsv([s]), /新重量挑战\|力竭/);
});
test("CSV 正确引用并阻止公式注入", () => {
  assert.equal(csvCell("=cmd()"), '"\'=cmd()"');
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
});
