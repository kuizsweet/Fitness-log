import test from "node:test";
import assert from "node:assert/strict";
import { newSession, newSet, type WorkoutExercise } from "../src/lib/domain";
import {
  clockText,
  elapsedSeconds,
  repeatSession,
  repeatSet,
  trainingSummary,
} from "../src/lib/training";
import { leaderboardPage } from "../src/lib/checkins";

test("正计时依赖时间戳，后台恢复不会少算；不产生负数", () => {
  const start = "2026-10-16T01:00:00Z";
  assert.equal(
    elapsedSeconds(start, null, Date.parse("2026-10-16T01:03:02Z")),
    182,
  );
  assert.equal(elapsedSeconds(start, "2026-10-16T01:03:02Z", 0), 182);
  assert.equal(elapsedSeconds(start, null, 0), 0);
  assert.equal(elapsedSeconds(null, null), 0);
  assert.equal(clockText(182), "03:02");
  assert.equal(clockText(3662), "1:01:02");
});
function exercise(): WorkoutExercise {
  return {
    id: crypto.randomUUID(),
    exercise_id: crypto.randomUUID(),
    equipment_id: null,
    exercise_name: "卧推",
    muscle_group: "胸",
    equipment_snapshot: null,
    notes: "计划备注",
    sets: [
      {
        ...newSet(),
        completed: true,
        completed_at: "2026-10-15T01:00:00Z",
        tags: ["力竭"],
        rir: 0,
        reps: 8,
        weight: { ...newSet().weight, mode: "total", value: 60 },
      },
    ],
  };
}
test("复用计划生成新训练和子记录，不覆盖原记录，不复制上次的完成与力竭状态", () => {
  const source = newSession("2026-10-15");
  source.revision = 4;
  source.exercises = [exercise()];
  const original = structuredClone(source);
  const next = repeatSession(source, "2026-10-16", "2026-10-16T01:00:00Z");
  assert.notEqual(next.id, source.id);
  assert.equal(next.revision, 0);
  assert.equal(next.status, "in_progress");
  assert.equal(next.ended_at, null);
  const ex = next.exercises[0],
    prev = source.exercises[0];
  assert.notEqual(ex.id, prev.id);
  assert.equal(ex.exercise_id, prev.exercise_id);
  assert.notEqual(ex.sets[0].id, prev.sets[0].id);
  assert.equal(ex.sets[0].reps, 8);
  assert.equal(ex.sets[0].completed, false);
  assert.equal(ex.sets[0].completed_at, null);
  assert.deepEqual(ex.sets[0].tags, []);
  assert.equal(ex.sets[0].rir, null);
  ex.sets[0].weight.value = 10;
  assert.deepEqual(source, original);
  assert.equal(repeatSet(prev.sets[0]).weight.value, 60);
});
test("总结只计已完成组，单位与计量含义分开，辅助与未知重量不推算容量", () => {
  const session = newSession("2026-10-16");
  const ex = exercise();
  session.exercises = [ex];
  ex.sets.push({
    ...newSet(),
    completed: false,
    reps: 100,
    weight: { ...newSet().weight, mode: "total", value: 100 },
  });
  for (const mode of ["assistance", "unknown", "single"] as const)
    ex.sets.push({
      ...newSet(),
      completed: true,
      reps: 10,
      weight: { ...newSet().weight, mode, value: 20 },
    });
  ex.sets.push({
    ...newSet("lb", "total"),
    completed: true,
    role: "warmup",
    reps: 10,
    weight: { ...newSet("lb", "total").weight, value: 30 },
  });
  const summary = trainingSummary(session);
  assert.equal(summary.sets, 5);
  assert.equal(summary.workSets, 4);
  assert.equal(summary.exercises, 1);
  assert.deepEqual(summary.volumes, [
    { mode: "total", unit: "kg", value: 480 },
    { mode: "single", unit: "kg", value: 200 },
    { mode: "total", unit: "lb", value: 300 },
  ]);
});
test("榜单每页10人，保留并列排名，刷新后页码夹取且不改写原数组", () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({
    rank: i < 2 ? 1 : i + 1,
    display_name: `test-${i}`,
    streak: 30 - i,
    is_self: false,
  }));
  assert.equal(leaderboardPage(rows, 1).rows.length, 10);
  assert.equal(leaderboardPage(rows, 2).rows[0].display_name, "test-10");
  assert.equal(leaderboardPage(rows, 3).rows.length, 1);
  assert.deepEqual(
    leaderboardPage(rows, 1)
      .rows.slice(0, 2)
      .map((r) => r.rank),
    [1, 1],
  );
  assert.equal(leaderboardPage(rows.slice(0, 4), 3).page, 1);
  assert.equal(leaderboardPage([], 9).pages, 1);
  assert.equal(leaderboardPage(rows, NaN).page, 1);
  assert.equal(rows.length, 21);
});
