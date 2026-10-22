import test from "node:test";
import assert from "node:assert/strict";
import base from "../src/data/hevy-exercises.json";
import video from "../src/data/hevy-video-exercises.json";
import { adaptBaseExercise, exerciseMuscleMetadata } from "../src/lib/exercise-base";
import { createNote, readWorkbench, planMuscleDistribution } from "../src/lib/training-workbench";

test("all 421 source actions have structured primary and secondary muscle fields", () => {
  assert.equal(base.length + video.length, 421);
  for (const exercise of [...base, ...video]) {
    const metadata = exerciseMuscleMetadata(`hevy:${exercise.id}`);
    assert.ok(metadata?.primaryMuscles.length, exercise.name);
    assert.ok(!metadata.primaryMuscles.includes("other"), exercise.name);
    assert.ok(Array.isArray(metadata.secondaryMuscles));
    assert.deepEqual(adaptBaseExercise(exercise).primaryMuscles, metadata.primaryMuscles);
  }
});
test("old notes recover metadata by source id without changing user training values", () => {
  const source = base.find(e => e.primaryMuscles.includes("chest"))!;
  const note = createNote(0);
  note.exercises = [{id: "move", sourceId: `hevy:${source.id}`, name: "卧推（杠铃）", muscle: "胸", sets: 4, reps: 8, weight: 45}];
  const restored = readWorkbench(JSON.stringify({notes:[note],assignments:{}})).notes[0].exercises[0];
  assert.deepEqual(restored.primaryMuscles, source.primaryMuscles);
  assert.equal(restored.weight, 45);
  assert.equal(restored.sets, 4);
  assert.deepEqual(planMuscleDistribution([restored]), {胸:{中胸:4}});
});
test("primary muscles share sets, secondary muscles do not double-count; cardio excluded", () => {
  const exercise = {id:"a",name:"复合动作",muscle:"",sets:4,reps:8,weight:10,primaryMuscles:["chest","triceps"],secondaryMuscles:["shoulders"]};
  assert.deepEqual(planMuscleDistribution([exercise]), {胸:{胸大肌:2},手臂:{肱三头肌:2}});
  assert.deepEqual(planMuscleDistribution([{...exercise, category:"cardio"}]), {});
});
test("shoulder variants have meaningful regions without an unspecified bucket", () => {
  const exercise = {id:"a",name:"侧平举（哑铃）",muscle:"肩",sets:3,reps:12,weight:10,primaryMuscles:["shoulders"]};
  assert.deepEqual(planMuscleDistribution([exercise]), {肩:{中束:3}});
});
