import { dateSchema, type Session } from "./domain";
export type PlanExercise = {
  id: string;
  sourceId?: string;
  name: string;
  muscle: string;
  sets: number | null;
  reps: number | null;
  weight: number | null;
};
export type PlanNote = {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  z: number;
  exercises: PlanExercise[];
  sourceId?: string;
  temporary?: boolean;
};
export type WorkbenchState = {
  notes: PlanNote[];
  assignments: Record<string, string[]>;
};
export const emptyWorkbench = (): WorkbenchState => ({
  notes: [],
  assignments: {},
});
export function muscleFamily(label: string) {
  if (/胸/.test(label)) return "胸";
  if (/背|背阔|斜方/.test(label)) return "背";
  if (/肩|三角/.test(label)) return "肩";
  if (/臂|二头|三头|前臂/.test(label)) return "手臂";
  if (/腿|臀|股|腘|小腿|内收|外展/.test(label)) return "下肢";
  if (/腹|核心/.test(label)) return "核心";
  return "其他";
}
export function createNote(index: number): PlanNote {
  return {
    id: crypto.randomUUID(),
    title: "",
    temporary: true,
    x: 24 + (index % 4) * 28,
    y: 24 + (index % 4) * 28,
    width: 340,
    height: 290,
    pinned: false,
    z: index + 1,
    exercises: [],
  };
}
export function isNamedNote(title: string) {
  return Boolean(title.trim()) && title.trim() !== "未命名计划";
}
export function persistedWorkbench(state: WorkbenchState): WorkbenchState {
  const notes = state.notes.filter(
    (note) => !note.temporary || isNamedNote(note.title),
  );
  const ids = new Set(notes.map((note) => note.id));
  return {
    notes,
    assignments: Object.fromEntries(
      Object.entries(state.assignments)
        .map(([date, values]) => [date, values.filter((id) => ids.has(id))])
        .filter(([, values]) => values.length),
    ),
  };
}
export function importPlan(session: Session, index: number): PlanNote {
  return {
    ...createNote(index),
    sourceId: session.id,
    title:
      session.exercises
        .map((e) => e.exercise_name)
        .join(" · ")
        .slice(0, 60) || "训练计划",
    exercises: session.exercises.map((e) => ({
      id: crypto.randomUUID(),
      name: e.exercise_name,
      muscle: e.muscle_group,
      sets: e.sets.length || null,
      reps:
        e.sets.length && e.sets.every((s) => s.reps === e.sets[0].reps)
          ? e.sets[0].reps
          : null,
      weight: null,
    })),
  };
}
export function muscleTotals(note?: PlanNote) {
  const totals: Record<string, number> = {};
  for (const exercise of note?.exercises ?? []) {
    if (exercise.sets && exercise.sets > 0) {
      const key = muscleFamily(exercise.muscle);
      totals[key] = (totals[key] ?? 0) + exercise.sets;
    }
  }
  return Object.entries(totals);
}
export function readWorkbench(raw: string | null): WorkbenchState {
  if (!raw) return emptyWorkbench();
  const data = JSON.parse(raw);
  if (
    !Array.isArray(data.notes) ||
    data.notes.length > 30 ||
    !data.assignments ||
    typeof data.assignments !== "object"
  )
    throw Error("无效的工作台数据");
  const ids = new Set();
  for (const note of data.notes) {
    if (
      !note ||
      typeof note.id !== "string" ||
      !note.id ||
      ids.has(note.id) ||
      typeof note.title !== "string" ||
      note.title.length > 60 ||
      typeof note.pinned !== "boolean" ||
      ![note.x, note.y, note.width, note.height, note.z].every(
        Number.isFinite,
      ) ||
      note.x < 0 ||
      note.y < 0 ||
      note.width < 300 ||
      note.width > 720 ||
      note.height < 220 ||
      note.height > 700 ||
      !Array.isArray(note.exercises) ||
      note.exercises.length > 100
    )
      throw Error("无效的便签");
    ids.add(note.id);
    for (const exercise of note.exercises)
      if (
        typeof exercise.id !== "string" ||
        typeof exercise.name !== "string" ||
        typeof exercise.muscle !== "string" ||
        ![exercise.sets, exercise.reps, exercise.weight].every(
          (v) => v === null || (Number.isFinite(v) && v >= 0),
        )
      )
        throw Error("无效的动作");
  }
  for (const [date, values] of Object.entries(data.assignments))
    if (
      !dateSchema.safeParse(date).success ||
      date < "2020-01-01" ||
      date > "2030-12-31" ||
      !Array.isArray(values) ||
      !values.every((id) => ids.has(id))
    )
      throw Error("无效的日期安排");
  return data;
}
