import test from "node:test";
import assert from "node:assert/strict";
import { createNote, type PlanNote } from "../src/lib/training-workbench";
import {
  beginTraining,
  completeTrainingSet,
  finishTrainingRest,
  adjustTraining,
  pauseTraining,
  recordTrainingRir,
  undoTrainingSet,
  readTrainingRun,
  segmentElapsed,
  trainingSession,
} from "../src/lib/training-run";
import { sessionSchema } from "../src/lib/domain";
const plan: PlanNote = {
  ...createNote(0),
  title: "胸三头",
  exercises: [
    {
      id: "bench",
      name: "卧推（杠铃）",
      muscle: "胸 / 中胸",
      sets: null,
      reps: null,
      weight: null,
      groups: [
        { id: "warm", kind: "warmup", sets: null, reps: null, weight: null },
        { id: "work", kind: "working", sets: 2, reps: 8, weight: 45 },
        { id: "back", kind: "backoff", sets: 1, reps: 10, weight: 35 },
      ],
    },
    {
      id: "triceps",
      name: "三头肌下压（绳索）",
      muscle: "肱三头肌",
      sets: 1,
      reps: 12,
      weight: 19,
    },
  ],
};
const stamp = Date.parse("2026-10-22T10:00:00+08:00");
test("uses actual plan, expands repeats in order, skips empty child rows and snapshots values", () => {
  const run = beginTraining(plan, "2026-10-22", stamp);
  assert.equal(run.queue.length, 4);
  assert.deepEqual(
    run.queue.map((s) => s.kind),
    ["working", "working", "backoff", "working"],
  );
  assert.equal(run.queue[0].weight, 45);
  assert.equal(segmentElapsed(run, stamp), 0);
  assert.equal(segmentElapsed(run, stamp + 62000), 62000);
  assert.equal(plan.exercises[0].groups?.[1].sets, 2);
});
test("timer adjustment clamps at zero, pause/resume excludes paused time, refresh catches background time", () => {
  let run = beginTraining(plan, "2026-10-22", stamp);
  run = adjustTraining(run, -15, stamp + 5000);
  assert.equal(segmentElapsed(run, stamp + 5000), 0);
  run = adjustTraining(run, 15, stamp + 5000);
  run = pauseTraining(run, stamp + 6000);
  assert.equal(segmentElapsed(run, stamp + 60000), 16000);
  assert.equal(completeTrainingSet(run, stamp + 60000).logs[0].workMs, 16000);
  run = pauseTraining(run, stamp + 60000);
  assert.equal(segmentElapsed(run, stamp + 65000), 21000);
  const restored = readTrainingRun(JSON.stringify(run))!;
  assert.equal(segmentElapsed(restored, stamp + 120000), 76000);
});
test("completion records work and instantly begins rest, then advances only on next start", () => {
  let run = beginTraining(plan, "2026-10-22", stamp);
  run = completeTrainingSet(run, stamp + 30000);
  assert.equal(run.phase, "resting");
  assert.equal(run.logs[0].workMs, 30000);
  assert.equal(segmentElapsed(run, stamp + 31000), 1000);
  assert.equal(completeTrainingSet(run, stamp + 31000), run);
  run = recordTrainingRir(run, "2");
  run = adjustTraining(run, 5, stamp + 60000);
  run = finishTrainingRest(run, stamp + 65000);
  assert.equal(run.cursor, 1);
  assert.equal(run.phase, "working");
  assert.equal(run.logs[0].restMs, 40000);
  assert.equal(run.logs[0].rir, "2");
  assert.equal(segmentElapsed(run, stamp + 65000), 0);
});
test("finishes all sets and moves to next exercise; final RIR remains editable before saving", () => {
  let run = beginTraining(plan, "2026-10-22", stamp),
    now = stamp;
  for (let i = 0; i < 4; i++) {
    now += 20000;
    run = completeTrainingSet(run, now);
    run = recordTrainingRir(run, "3+");
    if (i === 2)
      assert.equal(run.queue[run.cursor + 1].name, "三头肌下压（绳索）");
    now += 30000;
    run = finishTrainingRest(run, now);
  }
  assert.equal(run.phase, "completed");
  assert.equal(run.logs.length, 4);
  const session = trainingSession(run);
  assert.ok(sessionSchema.safeParse(session).success);
  assert.equal(session.exercises.length, 2);
  assert.equal(session.exercises[0].sets[2].role, "supplement");
  assert.equal(session.exercises[0].sets[0].rir, 3);
  assert.deepEqual(session.exercises[0].sets[0].tags, ["RIR 3+"]);
  assert.equal(session.exercises[0].sets[0].rest_seconds, 30);
  assert.equal(session.status, "completed");
  assert.equal(session.training_type, "strength");
  assert.deepEqual(readTrainingRun(JSON.stringify(run)), run);
});
test("empty plans and incomplete actual values fail without creating a completed record", () => {
  assert.throws(() =>
    beginTraining({ ...plan, exercises: [] }, "2026-10-22", stamp),
  );
  const run = beginTraining(
    {
      ...plan,
      exercises: [
        {
          id: "a",
          name: "卧推（杠铃）",
          muscle: "胸",
          sets: 1,
          reps: null,
          weight: null,
        },
      ],
    },
    "2026-10-22",
    stamp,
  );
  assert.throws(() => completeTrainingSet(run, stamp + 1000));
  assert.equal(run.logs.length, 0);
  assert.throws(() => trainingSession(run));
});
test("undo returns to the same set paused, without leaving a phantom completion", () => {
  let run = beginTraining(plan, "2026-10-22", stamp);
  run = completeTrainingSet(run, stamp + 20000);
  run = recordTrainingRir(run, "2");
  run = undoTrainingSet(run);
  assert.equal(run.logs.length, 0);
  assert.equal(run.cursor, 0);
  assert.equal(run.phase, "working");
  assert.equal(run.anchorMs, null);
  assert.equal(segmentElapsed(run, stamp + 90000), 20000);
  run = pauseTraining(run, stamp + 90000);
  run = completeTrainingSet(run, stamp + 95000);
  assert.equal(run.logs.length, 1);
  assert.equal(run.logs[0].workMs, 25000);
  assert.equal(run.logs[0].rir, null);
});

test("paused work can complete; rest requires RIR even when paused and on the final set", () => {
  let run = beginTraining(plan, "2026-10-22", stamp);
  for (let i = 0; i < run.queue.length; i++) {
    run = pauseTraining(run, stamp + i * 100000 + 1000);
    run = completeTrainingSet(run, stamp + i * 100000 + 2000);
    assert.equal(run.phase, "resting");
    assert.equal(run.anchorMs, stamp + i * 100000 + 2000);
    run = pauseTraining(run, stamp + i * 100000 + 3000);
    assert.equal(finishTrainingRest(run, stamp + i * 100000 + 9000), run);
    run = recordTrainingRir(run, "0");
    run = finishTrainingRest(run, stamp + i * 100000 + 9000);
    assert.equal(run.logs[i].restMs, 1000);
    assert.equal(run.phase, i === run.queue.length - 1 ? "completed" : "working");
  }
});
