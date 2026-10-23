import test from "node:test";
import assert from "node:assert/strict";
import { cardioFields, isCardioExercise, canAddExercise, noteTrainingType } from "../src/lib/cardio";
import { createNote, readWorkbench, trainingSets } from "../src/lib/training-workbench";

test("cardio plans expose minutes and machine settings without distance or strength counts", () => {
  const exercise = { id: "treadmill", name: "跑步机", muscle: "有氧运动", sets: 3, reps: 10, weight: 20,
    cardio: { minutes: 30, incline: 8, speed: 5.5, distance: 2.75 } };
  assert.ok(isCardioExercise(exercise));
  assert.equal(trainingSets(exercise), 0);
  assert.deepEqual(cardioFields("爬坡机").map(f => f.key), ["minutes", "incline", "speed"]);
  assert.deepEqual(cardioFields("动感单车").map(f => f.key), ["minutes", "resistance"]);
  assert.deepEqual(cardioFields("跳绳").map(f => f.key), ["minutes"]);
  assert.equal(isCardioExercise({ name: "单车式卷腹", muscle: "腹肌" }), false);
  const note = { ...createNote(0), exercises: [exercise] };
  const restored = readWorkbench(JSON.stringify({ notes: [note], assignments: {} }));
  assert.deepEqual(restored.notes[0].exercises[0].cardio, exercise.cardio);
  assert.throws(() => readWorkbench(JSON.stringify({ notes: [{ ...note, exercises: [{ ...exercise, cardio: { minutes: -1 } }] }], assignments: {} })));
});

test("notes reject mixed training types in either direction and classify only homogeneous notes", () => {
  const cardio = { name: "爬坡机", muscle: "有氧运动" };
  const strength = { name: "卧推（杠铃）", muscle: "胸" };
  assert.equal(canAddExercise([], cardio), true);
  assert.equal(canAddExercise([], strength), true);
  assert.equal(canAddExercise([strength], cardio), false);
  assert.equal(canAddExercise([cardio], strength), false);
  assert.equal(canAddExercise([cardio], cardio), true);
  assert.equal(noteTrainingType({ exercises: [] }), null);
  assert.equal(noteTrainingType({ exercises: [cardio] }), "cardio");
  assert.equal(noteTrainingType({ exercises: [strength] }), "strength");
  assert.equal(noteTrainingType({ exercises: [cardio, strength] }), null);
});
