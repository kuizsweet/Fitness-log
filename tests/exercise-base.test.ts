import test from "node:test";
import assert from "node:assert/strict";
import exercises from "../src/data/hevy-exercises.json";
import source from "../src/data/hevy-exercises-source.json";
import {
  adaptBaseExercise,
  matchesEquipment,
  chestRegion,
} from "../src/lib/exercise-base";

test("Hevy public snapshot has unique source IDs, provenance and complete translations", () => {
  assert.equal(exercises.length, source.count);
  assert.equal(source.pages, 13);
  assert.equal(new Set(exercises.map((e) => e.id)).size, exercises.length);
  for (const row of exercises.map(adaptBaseExercise)) {
    assert.ok(row.id.startsWith("hevy:"));
    assert.match(row.name, /[\u4e00-\u9fff]/);
    assert.ok(row.originalName);
  }
  assert.ok(
    exercises.every(
      (e) =>
        e.url.startsWith("https://www.hevyapp.com/exercises/") && e.sourcePage,
    ),
  );
});
test("Hevy keeps explicit equipment distinctions and does not invent machine loading types", () => {
  const rows = exercises.map(adaptBaseExercise);
  assert.equal(rows.find((e) => e.id === "hevy:1990")?.equipment, "cable");
  assert.equal(
    rows.find((e) => e.id === "hevy:7644")?.equipment,
    "resistance-band",
  );
  assert.equal(rows.find((e) => e.id === "hevy:5573")?.name, "弯举（杠铃片）");
  assert.ok(!rows.some((e) => /挂片器械|插销器械/.test(e.name)));
  assert.equal(matchesEquipment("dumbbell", ["dumbbell"]), true);
  assert.equal(matchesEquipment("barbell", ["dumbbell"]), false);
});
test("Chest orientation still distinguishes incline push-ups from incline presses", () => {
  assert.equal(chestRegion("Incline Bench Press (Dumbbell)"), "上胸");
  assert.equal(chestRegion("Incline Push Ups"), "下胸");
});
