import test from "node:test";
import assert from "node:assert/strict";
import exercises from "../src/data/free-exercise-db.json";
import source from "../src/data/free-exercise-db-source.json";
import {
  adaptBaseExercise,
  cardioDetail,
  matchesLibraryFamily,
  chestRegion,
  exerciseDetail,
} from "../src/lib/exercise-base";
import { muscleFamily } from "../src/lib/training-workbench";
test("有氧使用真实基础库记录并按器材细分，其他包含自定义动作", () => {
  const rows = exercises.map(adaptBaseExercise);
  const cardio = rows.filter((row) =>
    matchesLibraryFamily(row, "有氧", muscleFamily(row.muscle_group)),
  );
  assert.equal(cardio.length, 14);
  assert.ok(cardio.every((row) => cardioDetail(row.id)));
  assert.ok(cardio.some((row) => cardioDetail(row.id) === "椭圆机"));
  assert.ok(cardio.some((row) => cardioDetail(row.id) === "爬楼机"));
  assert.ok(cardio.some((row) => cardioDetail(row.id) === "固定单车"));
  assert.ok(
    cardio.every(
      (row) =>
        !matchesLibraryFamily(row, "下肢", muscleFamily(row.muscle_group)),
    ),
  );
  assert.ok(
    matchesLibraryFamily(
      { source: "custom", muscle_group: "胸" },
      "其他",
      "胸",
    ),
  );
});
test("固定来源基础库完整且ID稳定，肌群按原始字段映射", () => {
  assert.equal(exercises.length, source.count);
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  assert.equal(source.count, 876);
  const adapted = exercises.map(adaptBaseExercise);
  assert.ok(adapted.every((e) => e.id.startsWith("free-db:") && e.name.length));
  assert.ok(adapted.some((e) => muscleFamily(e.muscle_group) === "胸"));
  assert.ok(adapted.some((e) => muscleFamily(e.muscle_group) === "手臂"));
});

test("中文覆盖基础库并保留英文搜索名称", () => {
  const rows = exercises.map(adaptBaseExercise);
  assert.ok(
    rows.every((e) => /[\u4e00-\u9fff]/.test(e.name) && e.originalName),
  );
});
test("胸部细分区分推举与俯卧撑方向", () => {
  assert.equal(chestRegion("Incline Dumbbell Press"), "上胸");
  assert.equal(chestRegion("Decline Bench Press"), "下胸");
  assert.equal(chestRegion("Incline Push-Up"), "下胸");
  assert.equal(chestRegion("Decline Push-Up"), "上胸");
  assert.equal(chestRegion("Barbell Bench Press"), "中胸");
  assert.equal(chestRegion("Chest Stretch"), "未细分");
  assert.equal(exerciseDetail("胸 / 上胸"), "上胸");
});

test("逐条核对胸部动作：基础库无遗漏，拉伸与综合不冒充分束", () => {
  const rows = exercises
    .filter((e) => e.primaryMuscles.includes("chest"))
    .map(adaptBaseExercise);
  assert.equal(rows.length, 84);
  assert.ok(rows.every((e) => !e.muscle_group.includes("未细分")));
  const group = (name: string) =>
    rows.find((e) => e.originalName === name)?.muscle_group;
  assert.equal(group("Low Cable Crossover"), "胸 / 上胸");
  assert.equal(group("Alternating Floor Press"), "胸 / 中胸");
  assert.equal(group("Cable Iron Cross"), "胸 / 下胸");
  assert.equal(group("Bent-Arm Dumbbell Pullover"), "胸 / 综合");
  assert.equal(group("Behind Head Chest Stretch"), "胸 / 拉伸");
});
test("肩部按前中后束与综合分类，内外旋不冒充三角肌后束", () => {
  const rows = exercises
    .filter((e) => e.primaryMuscles.includes("shoulders"))
    .map(adaptBaseExercise);
  assert.equal(rows.length, 129);
  const group = (name: string) =>
    rows.find((e) => e.originalName === name)?.muscle_group;
  assert.equal(group("Front Dumbbell Raise"), "肩 / 前束");
  assert.equal(group("Side Lateral Raise"), "肩 / 中束");
  assert.equal(group("Cable Rear Delt Fly"), "肩 / 后束");
  assert.equal(group("Cable Internal Rotation"), "肩 / 肩袖");
  assert.equal(exerciseDetail("肩 / 前束"), "前束");
});
import { matchesEquipment } from "../src/lib/exercise-base";
test("器材筛选按原始equipment字段，支持并集、取消及未知器材", () => {
  const base = exercises.map(adaptBaseExercise);
  assert.ok(base.every((e, i) => e.equipment === exercises[i].equipment));
  assert.equal(matchesEquipment("dumbbell", []), true);
  assert.equal(matchesEquipment("barbell", ["dumbbell"]), false);
  assert.equal(matchesEquipment("cable", ["dumbbell", "cable"]), true);
  assert.equal(matchesEquipment(null, ["unknown"]), true);
  assert.equal(matchesEquipment(undefined, ["barbell"]), false);
});
