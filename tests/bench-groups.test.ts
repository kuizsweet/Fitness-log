import test from "node:test";
import assert from "node:assert/strict";
import {
  benchGroups,
  copyExerciseGroup,
  isBenchExercise,
  trainingSets,
  planMuscleDistribution,
  createNote,
  readWorkbench,
  type PlanExercise,
} from "../src/lib/training-workbench";
const exercise: PlanExercise = {
  id: "bench",
  name: "卧推（杠铃）",
  muscle: "胸 / 中胸",
  sets: 4,
  reps: 8,
  weight: 45,
};
test("bench pilot retains old numbers in working group and leaves optional groups empty", () => {
  const groups = benchGroups(exercise);
  assert.deepEqual(
    groups.map((g) => g.kind),
    ["warmup", "working", "backoff"],
  );
  assert.equal(groups[1].weight, 45);
  assert.equal(groups[1].sets, 4);
  assert.equal(groups[0].sets, null);
  assert.equal(isBenchExercise({ name: "上斜推胸（器械）" }), false);
});
test("copy inserts an independent child immediately after its source", () => {
  const groups = benchGroups(exercise);
  const copied = copyExerciseGroup(groups, groups[1].id);
  assert.equal(copied.length, 4);
  assert.notEqual(copied[2].id, groups[1].id);
  copied[2].weight = 50;
  assert.equal(groups[1].weight, 45);
});
test("warmups excluded, working and backoff counted, sorted groups survive reload", () => {
  const groups = benchGroups(exercise);
  groups[0].sets = 3;
  groups[2].sets = 2;
  const next = {
    ...exercise,
    sets: null,
    reps: null,
    weight: null,
    groups: [groups[2], groups[0], groups[1]],
  };
  assert.equal(trainingSets(next), 6);
  assert.deepEqual(planMuscleDistribution([next]), { 胸: { 中胸: 6 } });
  const note = { ...createNote(0), exercises: [next] };
  const saved = readWorkbench(
    JSON.stringify({ notes: [note], assignments: {} }),
  );
  assert.deepEqual(saved.notes[0].exercises[0].groups, next.groups);
});
