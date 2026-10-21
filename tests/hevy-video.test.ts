import test from "node:test";
import assert from "node:assert/strict";
import base from "../src/data/hevy-exercises.json";
import additions from "../src/data/hevy-video-exercises.json";
import links from "../src/data/hevy-video-links.json";
import review from "../src/data/hevy-video-review.json";
import { adaptBaseExercise } from "../src/lib/exercise-base";

test("video supplements keep stable unique IDs and frame provenance without media copies", () => {
  assert.equal(
    new Set([...base, ...additions].map((e) => e.id)).size,
    base.length + additions.length,
  );
  assert.equal(review.reviewedChangeFrames, 552);
  assert.equal(review.pending.length, 5);
  for (const r of additions) {
    assert.ok(r.sourceFrame >= 0 && r.sourceFrame < 3501);
    assert.ok(r.sourceSeconds >= 0 && r.sourceSeconds <= 116.8);
    assert.ok(r.localizedName.length > 1);
    assert.equal(r.sourceVideo, review.sourceVideo);
    assert.ok(!("image" in r));
  }
  assert.ok(links.every((l) => base.some((b) => b.id === l.sourceId)));
});
test("video preserves Smith and plate-loaded variants without inventing selectorized machines", () => {
  const rows = additions.map(adaptBaseExercise);
  assert.ok(
    rows.some((r) => r.equipment === "smith" && r.name.includes("卧推")),
  );
  assert.ok(
    rows.some((r) => r.equipment === "plate-loaded" && r.name.includes("肩推")),
  );
  assert.ok(!rows.some((r) => r.name.includes("插销")));
  assert.ok(rows.some((r) => r.category === "cardio"));
  assert.ok(!rows.some((r) => /肩部水龙头|单腿（机器）/.test(r.name)));
});

test("clear bodyweight and pec-deck movements have usable equipment filters", () => {
  const rows = additions.map(adaptBaseExercise);
  for (const name of [
    "俯卧撑",
    "跪姿俯卧撑",
    "拍手俯卧撑",
    "平板俯卧撑",
    "窄距俯卧撑",
    "下斜俯卧撑",
  ]) {
    const row = rows.find((r) => r.name === name)!;
    assert.equal(row.equipment, "bodyweight", name);
    assert.ok(!row.muscle_group.includes("未细分"));
  }
  assert.equal(rows.find((r) => r.name === "蝴蝶机夹胸")?.equipment, "machine");
  assert.equal(
    rows.find((r) => r.name === "吊环俯卧撑（悬挂带）")?.equipment,
    "suspension-band",
  );
  assert.ok(rows.every((r) => !r.muscle_group.includes("未细分")));
});
