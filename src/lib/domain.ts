import { z } from "zod";

export const unitSchema = z.enum(["kg", "lb"]);
export const equipmentTypes = [
  "selectorized",
  "plate_loaded",
  "barbell",
  "dumbbell",
  "smith",
  "bodyweight",
] as const;
export const equipmentNames = {
  selectorized: "插片式",
  plate_loaded: "挂片式",
  barbell: "杠铃",
  dumbbell: "哑铃（单只）",
  smith: "史密斯",
  bodyweight: "自重 / 辅助",
};
export const modes = [
  "display",
  "per_side",
  "total",
  "single",
  "bodyweight",
  "assistance",
  "added",
  "unknown",
] as const;
export const modeNames: Record<(typeof modes)[number], string> = {
  display: "器械显示重量",
  per_side: "两侧装载质量",
  total: "总装载质量",
  single: "单只重量",
  bodyweight: "自重",
  assistance: "辅助重量（非举起重量）",
  added: "额外负重",
  unknown: "重量含义未确认",
};
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s,
    "日期无效",
  );
const nullableNumber = z.number().finite().min(0).max(10000).nullable();
export const weightSchema = z.object({
  mode: z.enum(modes),
  unit: unitSchema,
  value: nullableNumber,
  left: nullableNumber,
  right: nullableNumber,
  base: nullableNumber,
});
export const equipmentSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  type: z.enum(equipmentTypes),
  unit: unitSchema,
  rule: z.enum(modes),
  initial_weight: nullableNumber,
  increments: z.array(z.number().finite().nonnegative().max(10000)).max(200),
  notes: z.string().max(2000),
  hidden: z.boolean(),
  deleted_at: z.string().nullable().optional(),
});
export const exerciseSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  muscle_group: z.string().max(60),
  notes: z.string().max(2000),
  hidden: z.boolean(),
  deleted_at: z.string().nullable().optional(),
});
export const setSchema = z.object({
  id: z.uuid(),
  role: z.enum(["warmup", "work", "supplement"]),
  tags: z.array(z.string().trim().min(1).max(60)).max(12),
  weight: weightSchema,
  planned_weight: weightSchema.nullable(),
  reps: z.number().int().min(0).max(1000),
  completed: z.boolean(),
  notes: z.string().max(2000),
  rir: z.number().min(0).max(10).nullable(),
  rpe: z.number().min(0).max(10).nullable(),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  completed_at: z.iso.datetime({ offset: true }).nullable(),
  rest_seconds: z.number().int().min(0).max(86400).nullable(),
  rest_ends_at: z.iso.datetime({ offset: true }).nullable(),
});
export const workoutExerciseSchema = z.object({
  id: z.uuid(),
  exercise_id: z.uuid().nullable(),
  equipment_id: z.uuid().nullable(),
  exercise_name: z.string().min(1).max(120),
  muscle_group: z.string().max(60),
  equipment_snapshot: equipmentSchema.nullable(),
  notes: z.string().max(2000),
  sets: z.array(setSchema).max(100),
});
export const sessionSchema = z.object({
  id: z.uuid(),
  training_date: dateSchema,
  training_type: z.enum(["strength", "cardio"]).nullable().optional(),
  status: z.enum(["planned", "in_progress", "paused", "completed"]),
  started_at: z.iso.datetime({ offset: true }).nullable(),
  ended_at: z.iso.datetime({ offset: true }).nullable(),
  paused_at: z.iso.datetime({ offset: true }).nullable(),
  notes: z.string().max(4000),
  revision: z.number().int().nonnegative(),
  exercises: z.array(workoutExerciseSchema).max(100),
});
export type Weight = z.infer<typeof weightSchema>;
export type Equipment = z.infer<typeof equipmentSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type WorkoutSet = z.infer<typeof setSchema>;
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;
export type Session = z.infer<typeof sessionSchema> & {
  deleted_at?: string | null;
  import_batch_id?: string | null;
};
export type Profile = {
  user_id: string;
  display_name: string;
  unit: "kg" | "lb";
  timezone: string;
};
export type MealPhoto = {
  id: string;
  user_id: string;
  meal_id: string;
  storage_path: string;
  original_name: string;
  deleted_at: string | null;
  url?: string;
};
export type Meal = {
  id: string;
  user_id: string;
  meal_date: string;
  meal_type: "breakfast" | "lunch" | "dinner";
  notes: string;
  photos: MealPhoto[];
};
export type Batch = {
  id: string;
  filename: string;
  file_hash: string;
  row_count: number;
  report: Record<string, unknown>;
  created_at: string;
  undone_at: string | null;
};

export function emptyWeight(
  unit: Weight["unit"] = "kg",
  mode: Weight["mode"] = "display",
): Weight {
  return { unit, mode, value: null, left: null, right: null, base: null };
}
export function totalWeight(w: Weight): number | null {
  if (w.mode === "per_side")
    return w.left === null || w.right === null || w.base === null
      ? null
      : Math.round((w.left + w.right + w.base) * 1000) / 1000;
  return w.value;
}
export function weightText(w: Weight): string {
  if (w.mode === "per_side")
    return `左 ${w.left ?? "?"} / 右 ${w.right ?? "?"} + 初始 ${w.base ?? "?"} ${w.unit}，装载总质量 ${totalWeight(w) ?? "未知"}`;
  return `${w.value ?? "未知"} ${w.unit} · ${modeNames[w.mode]}`;
}
export function workingSets(session: Session): number {
  return session.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.role === "work").length,
    0,
  );
}
export function today(timezone = "Asia/Shanghai", now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function newSet(
  unit: Weight["unit"] = "kg",
  mode: Weight["mode"] = "display",
): WorkoutSet {
  return {
    id: crypto.randomUUID(),
    role: "work",
    tags: [],
    weight: emptyWeight(unit, mode),
    planned_weight: null,
    reps: 0,
    completed: false,
    notes: "",
    rir: null,
    rpe: null,
    started_at: null,
    completed_at: null,
    rest_seconds: null,
    rest_ends_at: null,
  };
}
export function newSession(date: string, active = false): Session {
  return {
    id: crypto.randomUUID(),
    training_date: date,
    training_type: null,
    status: active ? "in_progress" : "completed",
    started_at: active ? new Date().toISOString() : null,
    ended_at: null,
    paused_at: null,
    notes: "",
    revision: 0,
    exercises: [],
  };
}
