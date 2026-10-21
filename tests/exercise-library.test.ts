import test from "node:test";
import assert from "node:assert/strict";
import base from "../src/data/hevy-exercises.json";
import video from "../src/data/hevy-video-exercises.json";
import { adaptBaseExercise } from "../src/lib/exercise-base";
import {
  filterLibrary,
  librarySections,
  matchesDevice,
  matchesMuscle,
  deviceOptions,
  muscleOptions,
} from "../src/lib/exercise-library";
const rows = [...base, ...video].map(adaptBaseExercise);
test("device grouping preserves eight categories and machine subtype distinctions", () => {
  assert.equal(deviceOptions.length, 8);
  assert.ok(matchesDevice("smith", "machines"));
  assert.ok(matchesDevice("plate-loaded", "machines"));
  assert.ok(matchesDevice("cable", "machines"));
  assert.ok(!matchesDevice("smith", "weight-plate"));
  assert.ok(!matchesDevice("machine", "selectorized"));
  assert.ok(matchesDevice(null, "other"));
});
test("muscle filters use original muscle identity rather than removed broad family controls", () => {
  assert.equal(muscleOptions.length, 19);
  const triceps = rows.find(
    (r) => r.originalName === "Bench Press - Close Grip (Barbell)",
  )!;
  assert.ok(matchesMuscle(triceps, "triceps"));
  assert.ok(!matchesMuscle(triceps, "biceps"));
  const cardio = rows.find((r) => r.category === "cardio")!;
  assert.ok(matchesMuscle(cardio, "cardio"));
  assert.ok(!matchesMuscle(cardio, "other"));
});
test("combined device, muscle and search conditions intersect without deleting metadata", () => {
  const result = filterLibrary(rows, "smith", "chest", "上斜");
  assert.ok(result.length > 0);
  assert.ok(
    result.every(
      (r) => r.equipment === "smith" && r.primaryMuscles.includes("chest"),
    ),
  );
  assert.equal(
    result[0],
    rows.find((r) => r.id === result[0].id),
  );
  assert.ok(result.every((r) => r.muscle_group.includes("上胸")));
});
test("popular section follows observed video order and is absent in filtered mode", () => {
  const initial = librarySections(rows, false);
  assert.ok(initial.popular[0].name.includes("侧平举"));
  assert.ok(initial.popular[1].name.includes("锤式弯举"));
  assert.equal(initial.all.length, rows.length);
  assert.equal(
    new Set(initial.popular.map((r) => r.id)).size,
    initial.popular.length,
  );
  assert.equal(
    librarySections(filterLibrary(rows, "dumbbell", "all", ""), true).popular
      .length,
    0,
  );
});
