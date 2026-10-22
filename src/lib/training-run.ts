import { isCardioExercise } from "./cardio";
import { z } from "zod";
import { sessionSchema, type Session } from "./domain";
import {
  benchGroups,
  isBenchExercise,
  type PlanNote,
} from "./training-workbench";
import { stopwatchElapsed } from "./stopwatch-clock";

const number = z.number().finite().min(0).max(10000).nullable();
const runSetSchema = z.object({
  id: z.uuid(),
  exerciseKey: z.string(),
  exerciseId: z.uuid(),
  name: z.string(),
  muscle: z.string(),
  kind: z.enum(["warmup", "working", "backoff"]),
  ordinal: z.number().int().positive(),
  count: z.number().int().positive(),
  reps: number,
  weight: number,
  plannedReps: number,
  plannedWeight: number,
});
const logSchema = runSetSchema.extend({
  reps: z.number().int().min(0).max(1000),
  weight: z.number().min(0).max(10000),
  workMs: z.number().nonnegative(),
  restMs: z.number().nonnegative(),
  rir: z.enum(["0", "1", "2", "3+"]).nullable(),
  startedAt: z.number(),
  completedAt: z.number(),
});
const runSchema = z.object({
  version: z.literal(1),
  id: z.uuid(),
  planId: z.string(),
  title: z.string(),
  date: z.string(),
  phase: z.enum(["working", "resting", "completed"]),
  cursor: z.number().int().nonnegative(),
  queue: z.array(runSetSchema).min(1),
  logs: z.array(logSchema),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  segmentBeganAt: z.number(),
  baseMs: z.number().nonnegative(),
  anchorMs: z.number().nullable(),
  revision: z.number().int().nonnegative(),
  synced: z.boolean(),
});
export type TrainingRun = z.infer<typeof runSchema>;
export type TrainingLog = z.infer<typeof logSchema>;
export function readTrainingRun(raw: string | null): TrainingRun | null {
  if (!raw) return null;
  const run = runSchema.parse(JSON.parse(raw));
  if (run.cursor >= run.queue.length || run.logs.length > run.queue.length)
    throw Error("训练记录无效");
  return run;
}
export function beginTraining(
  plan: PlanNote,
  date: string,
  now: number,
): TrainingRun {
  const queue: TrainingRun["queue"] = [];
  for (const exercise of plan.exercises) {
    if (isCardioExercise(exercise)) continue;
    const blocks =
      exercise.groups ??
      (isBenchExercise(exercise)
        ? benchGroups(exercise)
        : [
            {
              kind: "working" as const,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight,
            },
          ]);
    const count = blocks.reduce((sum, b) => sum + (b.sets ?? 0), 0);
    if (
      blocks.some(
        (block) =>
          block.sets !== null &&
          (!Number.isInteger(block.sets) || block.sets < 0),
      )
    )
      throw Error(`${exercise.name}的组数必须为非负整数`);
    if (!Number.isInteger(count) || count > 100 || count < 0)
      throw Error(`${exercise.name}每次训练最多 100 组`);
    const exerciseId = crypto.randomUUID();
    let ordinal = 0;
    for (const block of blocks)
      for (let n = 0; n < (block.sets ?? 0); n++) {
        queue.push({
          id: crypto.randomUUID(),
          exerciseKey: exercise.id,
          exerciseId,
          name: exercise.name,
          muscle: exercise.muscle,
          kind: block.kind,
          ordinal: ++ordinal,
          count,
          reps: block.reps,
          weight: block.weight,
          plannedReps: block.reps,
          plannedWeight: block.weight,
        });
      }
  }
  if (!queue.length) throw Error("请先在便签中填写训练组数");
  return {
    version: 1,
    id: crypto.randomUUID(),
    planId: plan.id,
    title: plan.title || "未命名计划",
    date,
    phase: "working",
    cursor: 0,
    queue,
    logs: [],
    startedAt: now,
    endedAt: null,
    segmentBeganAt: now,
    baseMs: 0,
    anchorMs: now,
    revision: 0,
    synced: false,
  };
}
export function segmentElapsed(run: TrainingRun, now: number) {
  return stopwatchElapsed(run.baseMs, run.anchorMs, now);
}
export function pauseTraining(run: TrainingRun, now: number): TrainingRun {
  if (run.phase === "completed") return run;
  return run.anchorMs === null
    ? { ...run, anchorMs: now }
    : { ...run, baseMs: segmentElapsed(run, now), anchorMs: null };
}
export function adjustTraining(
  run: TrainingRun,
  seconds: number,
  now: number,
): TrainingRun {
  if (run.phase === "completed") return run;
  return {
    ...run,
    baseMs: Math.max(0, segmentElapsed(run, now) + seconds * 1000),
    anchorMs: run.anchorMs === null ? null : now,
  };
}
export function completeTrainingSet(
  run: TrainingRun,
  now: number,
): TrainingRun {
  if (run.phase !== "working") return run;
  const set = run.queue[run.cursor];
  if (set.reps === null || set.weight === null)
    throw Error("请填写本组实际次数和重量；自重可填 0 kg");
  const log = logSchema.parse({
    ...set,
    workMs: segmentElapsed(run, now),
    restMs: 0,
    rir: null,
    startedAt: run.segmentBeganAt,
    completedAt: now,
  });
  return {
    ...run,
    logs: [...run.logs, log],
    phase: "resting",
    segmentBeganAt: now,
    baseMs: 0,
    anchorMs: now,
  };
}
export function finishTrainingRest(run: TrainingRun, now: number): TrainingRun {
  if (run.phase !== "resting" || run.logs.at(-1)?.rir == null) return run;
  const logs = run.logs.map((log, index) =>
    index === run.logs.length - 1
      ? { ...log, restMs: segmentElapsed(run, now) }
      : log,
  );
  if (run.cursor === run.queue.length - 1)
    return {
      ...run,
      logs,
      phase: "completed",
      endedAt: now,
      baseMs: 0,
      anchorMs: null,
    };
  return {
    ...run,
    logs,
    cursor: run.cursor + 1,
    phase: "working",
    segmentBeganAt: now,
    baseMs: 0,
    anchorMs: now,
  };
}
export function recordTrainingRir(
  run: TrainingRun,
  rir: TrainingLog["rir"],
): TrainingRun {
  if (run.phase !== "resting") return run;
  return {
    ...run,
    logs: run.logs.map((log, index) =>
      index === run.logs.length - 1 ? { ...log, rir } : log,
    ),
  };
}
export function undoTrainingSet(run: TrainingRun): TrainingRun {
  const previous = run.logs.at(-1);
  if (run.phase !== "resting" || !previous) return run;
  return {
    ...run,
    phase: "working",
    logs: run.logs.slice(0, -1),
    baseMs: previous.workMs,
    anchorMs: null,
    segmentBeganAt: previous.startedAt,
  };
}
export function trainingSession(run: TrainingRun): Session {
  if (run.phase !== "completed") throw Error("训练尚未结束");
  const exercises = [...new Set(run.logs.map((log) => log.exerciseId))].map(
    (id) => {
      const logs = run.logs.filter((log) => log.exerciseId === id),
        first = logs[0];
      const weight = (value: number | null) => ({
        mode: "unknown" as const,
        unit: "kg" as const,
        value,
        left: null,
        right: null,
        base: null,
      });
      return {
        id,
        exercise_id: null,
        equipment_id: null,
        exercise_name: first.name,
        muscle_group: first.muscle,
        equipment_snapshot: null,
        notes: "",
        sets: logs.map((log) => ({
          id: log.id,
          role:
            log.kind === "warmup"
              ? ("warmup" as const)
              : log.kind === "backoff"
                ? ("supplement" as const)
                : ("work" as const),
          tags: log.rir === "3+" ? ["RIR 3+"] : [],
          weight: weight(log.weight),
          planned_weight: weight(log.plannedWeight),
          reps: log.reps,
          completed: true,
          notes: `本组计时 ${Math.round(log.workMs / 1000)} 秒`,
          rir: log.rir === null ? null : log.rir === "3+" ? 3 : Number(log.rir),
          rpe: null,
          started_at: new Date(log.startedAt).toISOString(),
          completed_at: new Date(log.completedAt).toISOString(),
          rest_seconds: Math.min(86400, Math.round(log.restMs / 1000)),
          rest_ends_at: null,
        })),
      };
    },
  );
  return sessionSchema.parse({
    id: run.id,
    training_date: run.date,
    training_type: "strength",
    status: "completed",
    started_at: new Date(run.startedAt).toISOString(),
    ended_at: new Date(run.endedAt!).toISOString(),
    paused_at: null,
    notes: run.title,
    revision: run.revision,
    exercises,
  });
}
