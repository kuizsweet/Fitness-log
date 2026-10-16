import {
  newSet,
  sessionSchema,
  totalWeight,
  type Session,
  type Weight,
  type WorkoutSet,
} from "./domain";

export function elapsedSeconds(
  start: string | null,
  end: string | null,
  now = Date.now(),
) {
  if (!start || !Number.isFinite(Date.parse(start))) return 0;
  const until = end ? Date.parse(end) : now;
  return Number.isFinite(until)
    ? Math.max(0, Math.floor((until - Date.parse(start)) / 1000))
    : 0;
}
export function clockText(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(value / 3600),
    minutes = Math.floor(value / 60) % 60;
  return `${hours ? `${hours}:` : ""}${String(hours ? minutes : Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export function repeatSet(set: WorkoutSet): WorkoutSet {
  return {
    ...newSet(set.weight.unit, set.weight.mode),
    role: set.role,
    weight: { ...set.weight },
    planned_weight: set.planned_weight ? { ...set.planned_weight } : null,
    reps: set.reps,
  };
}
export function repeatSession(
  source: Session,
  date: string,
  start = new Date().toISOString(),
): Session {
  return sessionSchema.parse({
    ...source,
    id: crypto.randomUUID(),
    revision: 0,
    training_date: date,
    status: "in_progress",
    started_at: start,
    ended_at: null,
    paused_at: null,
    exercises: source.exercises.map((ex) => ({
      ...ex,
      id: crypto.randomUUID(),
      equipment_snapshot: ex.equipment_snapshot
        ? structuredClone(ex.equipment_snapshot)
        : null,
      sets: ex.sets.map(repeatSet),
    })),
  });
}
export function shortWeight(weight: Weight) {
  const value = totalWeight(weight);
  if (weight.mode === "bodyweight") return "自重";
  const prefix = {
    display: "显示",
    per_side: "装载",
    total: "装载",
    single: "单只",
    assistance: "辅助",
    added: "负重",
    unknown: "未确认",
  }[weight.mode];
  return value === null || weight.mode === "unknown"
    ? "—"
    : `${prefix} ${value} ${weight.unit}`;
}
export function trainingSummary(session: Session) {
  const completed = session.exercises.flatMap((ex) =>
    ex.sets.filter((s) => s.completed),
  );
  const volumes = new Map<
    string,
    { mode: Weight["mode"]; unit: Weight["unit"]; value: number }
  >();
  for (const set of completed) {
    if (["unknown", "assistance", "bodyweight"].includes(set.weight.mode))
      continue;
    const weight = totalWeight(set.weight);
    if (weight === null) continue;
    const key = `${set.weight.mode}:${set.weight.unit}`;
    const item = volumes.get(key) ?? {
      mode: set.weight.mode,
      unit: set.weight.unit,
      value: 0,
    };
    item.value += weight * set.reps;
    volumes.set(key, item);
  }
  return {
    sets: completed.length,
    workSets: completed.filter((s) => s.role === "work").length,
    exercises: session.exercises.filter((ex) =>
      ex.sets.some((s) => s.completed),
    ).length,
    volumes: [...volumes.values()].map((v) => ({
      ...v,
      value: Math.round(v.value * 1000) / 1000,
    })),
  };
}
