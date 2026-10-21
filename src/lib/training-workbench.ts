import { baseChestRegion, baseShoulderRegion } from "./exercise-base";
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
export function nearTrashEdge(
  card: { left: number; right: number; top: number; bottom: number },
  target: { left: number; right: number; top: number; bottom: number },
  distance = 24,
) {
  const dx = Math.max(target.left - card.right, card.left - target.right, 0);
  const dy = Math.max(target.top - card.bottom, card.top - target.bottom, 0);
  return Math.hypot(dx, dy) <= distance;
}
export function exerciseInsertionIndex(
  rows: { top: number; height: number }[],
  y?: number,
) {
  if (y === undefined) return rows.length;
  const index = rows.findIndex((row) => y < row.top + row.height / 2);
  return index < 0 ? rows.length : index;
}
export type PlanNote = {
  id: string;
  title: string;
  color?: "red" | "green" | "yellow" | "blue";
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  z: number;
  exercises: PlanExercise[];
  sourceId?: string;
  temporary?: boolean;
  inWarehouse?: boolean;
  savedToWarehouse?: boolean;
};
export type WorkbenchState = {
  notes: PlanNote[];
  assignments: Record<string, string[]>;
};
export const emptyWorkbench = (): WorkbenchState => ({
  notes: [],
  assignments: {},
});
export function deleteWorkbenchNote(
  state: WorkbenchState,
  id: string,
): WorkbenchState {
  return {
    notes: state.notes.filter((note) => note.id !== id),
    assignments: Object.fromEntries(
      Object.entries(state.assignments).map(([day, ids]) => [
        day,
        ids.filter((value) => value !== id),
      ]),
    ),
  };
}
export function closeWorkbenchNote(
  state: WorkbenchState,
  id: string,
): WorkbenchState {
  const note = state.notes.find((value) => value.id === id);
  if (!note || (note.temporary && !note.savedToWarehouse))
    return deleteWorkbenchNote(state, id);
  return {
    ...state,
    notes: state.notes.map((value) =>
      value.id === id ? { ...value, inWarehouse: true } : value,
    ),
  };
}
export function warehouseInsertBefore(
  rows: { id: string; top: number; height: number }[],
  pointerY: number,
): string | null {
  return rows.find((row) => pointerY < row.top + row.height / 2)?.id ?? null;
}
export function insertWarehouseNote(
  state: WorkbenchState,
  id: string,
  before: string | null,
): WorkbenchState {
  const source = state.notes.find((note) => note.id === id);
  if (!source) return state;
  const notes = state.notes.filter((note) => note.id !== id);
  let index = before
    ? notes.findIndex((note) => note.id === before && note.inWarehouse)
    : -1;
  if (index < 0) {
    const last = notes.findLastIndex((note) => note.inWarehouse);
    index = last < 0 ? notes.length : last + 1;
  }
  notes.splice(index, 0, {
    ...source,
    inWarehouse: true,
    savedToWarehouse: true,
  });
  return { ...state, notes };
}
export const NOTE_COLORS = {
  red: "#e76b73",
  green: "#58b68b",
  yellow: "#e5b94f",
  blue: "#659fe5",
} as const;
export function warehouseSections(state: WorkbenchState, date: string) {
  const assigned = new Set(state.assignments[date] ?? []);
  return {
    day: state.notes.filter(
      (note) => note.inWarehouse && assigned.has(note.id),
    ),
    backup: state.notes.filter(
      (note) => note.inWarehouse && !assigned.has(note.id),
    ),
  };
}
export function calendarNoteColors(state: WorkbenchState, date: string) {
  return [
    ...new Set(
      (state.assignments[date] ?? []).flatMap((id) => {
        const color = state.notes.find((note) => note.id === id)?.color;
        return color ? [NOTE_COLORS[color]] : [];
      }),
    ),
  ];
}
export function assignWorkbenchNote(
  state: WorkbenchState,
  id: string,
  date: string,
  before: string | null = null,
): WorkbenchState {
  if (!state.notes.some((note) => note.id === id)) return state;
  const stored = insertWarehouseNote(state, id, before);
  return {
    ...stored,
    assignments: {
      ...stored.assignments,
      [date]: [...new Set([...(stored.assignments[date] ?? []), id])],
    },
  };
}
export function unassignWorkbenchNote(
  state: WorkbenchState,
  id: string,
  date: string,
  before: string | null = null,
): WorkbenchState {
  const stored = insertWarehouseNote(state, id, before);
  return {
    ...stored,
    assignments: {
      ...stored.assignments,
      [date]: (stored.assignments[date] ?? []).filter((value) => value !== id),
    },
  };
}
export function copyWarehouseNote(
  state: WorkbenchState,
  id: string,
): WorkbenchState {
  const index = state.notes.findIndex(
    (note) => note.id === id && note.inWarehouse,
  );
  if (index < 0 || state.notes.length >= 30) return state;
  const source = state.notes[index];
  const copy = {
    ...source,
    id: crypto.randomUUID(),
    savedToWarehouse: true,
    exercises: source.exercises.map((exercise) => ({
      ...exercise,
      id: crypto.randomUUID(),
    })),
  };
  return {
    ...state,
    notes: [
      ...state.notes.slice(0, index + 1),
      copy,
      ...state.notes.slice(index + 1),
    ],
  };
}
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
    savedToWarehouse: false,
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
    (note) => !note.temporary || note.savedToWarehouse === true,
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
      (note.color !== undefined &&
        !["red", "green", "yellow", "blue"].includes(note.color)) ||
      (note.inWarehouse !== undefined &&
        typeof note.inWarehouse !== "boolean") ||
      (note.savedToWarehouse !== undefined &&
        typeof note.savedToWarehouse !== "boolean") ||
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
  // A pre-existing persisted note predates explicit warehouse saves; retain it.
  for (const note of data.notes)
    if (note.savedToWarehouse === undefined) note.savedToWarehouse = true;
  return data;
}

export function chestTotals(note?: PlanNote): [string, number][] {
  const totals: Record<string, number> = {};
  for (const exercise of note?.exercises ?? []) {
    if (!exercise.sets || exercise.sets <= 0) continue;
    const region = exercise.sourceId?.startsWith("free-db:")
      ? baseChestRegion(exercise.sourceId)
      : exercise.muscle.startsWith("胸 / ")
        ? exercise.muscle.slice(4)
        : muscleFamily(exercise.muscle) === "胸"
          ? "未细分"
          : undefined;
    if (!region || region === "拉伸") continue;
    totals[region] = (totals[region] ?? 0) + exercise.sets;
  }
  return ["上胸", "中胸", "下胸", "综合", "未细分"]
    .filter((r) => totals[r])
    .map((r) => [r, totals[r]]);
}

export function fitNoteToCanvas(
  note: PlanNote,
  width: number,
  height: number,
): PlanNote {
  if (width <= 0 || height <= 0) return note;
  const w = Math.min(note.width, width),
    h = Math.min(note.height, height);
  return {
    ...note,
    width: w,
    height: h,
    x: Math.max(0, Math.min(note.x, width - w)),
    y: Math.max(0, Math.min(note.y, height - h)),
  };
}
export function planMuscleDistribution(exercises: PlanExercise[]) {
  const result: Record<string, Record<string, number>> = {};
  for (const exercise of exercises) {
    if (!Number.isFinite(exercise.sets) || !exercise.sets || exercise.sets <= 0)
      continue;
    const family = muscleFamily(exercise.muscle);
    const sourceRegion = exercise.sourceId?.startsWith("free-db:")
      ? (baseChestRegion(exercise.sourceId) ??
        baseShoulderRegion(exercise.sourceId))
      : undefined;
    const region = sourceRegion
      ? sourceRegion
      : exercise.muscle.startsWith(family + " / ")
        ? exercise.muscle.slice(family.length + 3)
        : exercise.muscle === family ||
            /^(胸部|胸大肌|背部|肩部|手臂|下肢|核心)$/.test(exercise.muscle) ||
            !exercise.muscle
          ? "未细分"
          : exercise.muscle.split(" / ")[0];
    if (region === "拉伸") continue;
    result[family] ??= {};
    result[family][region] = (result[family][region] ?? 0) + exercise.sets;
  }
  return result;
}

export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export function resizeNoteFromEdge(
  note: PlanNote,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  width: number,
  height: number,
) {
  const rect = { x: note.x, y: note.y, width: note.width, height: note.height };
  const minWidth = Math.min(300, width),
    minHeight = Math.min(220, height);
  if (edge.includes("e"))
    rect.width = Math.max(
      minWidth,
      Math.min(720, width - note.x, note.width + dx),
    );
  if (edge.includes("s"))
    rect.height = Math.max(
      minHeight,
      Math.min(700, height - note.y, note.height + dy),
    );
  if (edge.includes("w")) {
    const right = note.x + note.width;
    rect.x = Math.max(0, right - 720, Math.min(right - minWidth, note.x + dx));
    rect.width = right - rect.x;
  }
  if (edge.includes("n")) {
    const bottom = note.y + note.height;
    rect.y = Math.max(
      0,
      bottom - 700,
      Math.min(bottom - minHeight, note.y + dy),
    );
    rect.height = bottom - rect.y;
  }
  return rect;
}

export function centerNoteInCanvas(
  note: PlanNote,
  width: number,
  height: number,
) {
  const fitted = fitNoteToCanvas(note, width, height);
  return {
    ...fitted,
    x: Math.max(0, (width - fitted.width) / 2),
    y: Math.max(0, (height - fitted.height) / 2),
  };
}
