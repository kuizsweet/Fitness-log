import test from "node:test";
import assert from "node:assert/strict";
import exercises from "../src/data/free-exercise-db.json";
import source from "../src/data/free-exercise-db-source.json";
import {
  adaptBaseExercise,
  chestRegion,
  exerciseDetail,
} from "../src/lib/exercise-base";
import { muscleFamily } from "../src/lib/training-workbench";
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
