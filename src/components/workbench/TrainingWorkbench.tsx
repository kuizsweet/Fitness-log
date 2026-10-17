"use client";
import {
  useEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
  type PointerEvent,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pin,
  Plus,
  Search,
  X,
  Archive,
} from "lucide-react";
import { useResource } from "../resource";
import { useResourceUser } from "../ResourceProvider";
import { Button } from "../ui/button";
import { calendarMonth, changeCalendarMonth } from "@/lib/calendar";
import { today, type Exercise, type Profile } from "@/lib/domain";
import { api } from "@/lib/client";
import {
  adaptBaseExercise,
  exerciseDetail,
  localizedExerciseName,
  type BaseExercise,
} from "@/lib/exercise-base";

import {
  createNote,
  isNamedNote,
  persistedWorkbench,
  emptyWorkbench,
  muscleFamily,
  muscleTotals,
  readWorkbench,
  type PlanNote,
  type WorkbenchState,
} from "@/lib/training-workbench";
import styles from "./TrainingWorkbench.module.css";

type Move =
  | {
      kind: "exercise";
      exercise: { id?: string; name: string; muscle_group: string };
    }
  | { kind: "note" | "warehouse"; id: string };
const families = [
  "全部",
  "胸",
  "背",
  "肩",
  "手臂",
  "下肢",
  "核心",
  "其他",
  "自定义",
];
const colors = [
  "#a8c5ef",
  "#a6cbb3",
  "#c3b0dc",
  "#dbc19a",
  "#dcaeb9",
  "#8fbfc6",
  "#a1a1aa",
];

export function TrainingWorkbench({ initialDate }: { initialDate?: string }) {
  const user = useResourceUser();
  return <Workbench key={user} user={user} initialDate={initialDate} />;
}
function Workbench({
  user,
  initialDate,
}: {
  user: string;
  initialDate?: string;
}) {
  const profile = useResource<Profile>("profile");
  const dragContextId = useId();
  const [date, setDate] = useState(initialDate ?? today());
  const [monthDate, setMonthDate] = useState(initialDate ?? today());
  const [state, setState] = useState<WorkbenchState>(emptyWorkbench);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [family, setFamily] = useState("全部");
  const [detail, setDetail] = useState("全部");
  const [dragging, setDragging] = useState<Move | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const catalog = useResource<{ exercises: Exercise[] }>("catalog");
  const base = useResource<BaseExercise[]>("exercise-base");
  const [visibleCount, setVisibleCount] = useState(60);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("其他");
  const [customBusy, setCustomBusy] = useState(false);
  const warehouse = state.notes.filter(
    (note) => !note.temporary || isNamedNote(note.title),
  );
  const key = `kuizfit:workbench:v1:${user}`;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  useEffect(() => {
    try {
      const restored = readWorkbench(localStorage.getItem(key));
      setState({
        ...restored,
        notes: restored.notes.map((note) => ({
          ...note,
          exercises: note.exercises.map((exercise) => ({
            ...exercise,
            name: exercise.sourceId?.startsWith("free-db:")
              ? localizedExerciseName(exercise.sourceId, exercise.name)
              : exercise.name,
          })),
        })),
      });
      setSelected(restored.notes[0]?.id ?? "");
      setReady(true);
    } catch {
      setError("无法读取本地工作台，请检查浏览器存储。");
    }
  }, [key]);
  function update(next: WorkbenchState) {
    if (!ready) return;
    try {
      localStorage.setItem(key, JSON.stringify(persistedWorkbench(next)));
      setState(next);
      setError("");
    } catch {
      setError("未能保存，本次修改未生效。请检查本地存储空间。");
    }
  }
  function changeNote(id: string, changes: Partial<PlanNote>) {
    update({
      ...state,
      notes: state.notes.map((n) => (n.id === id ? { ...n, ...changes } : n)),
    });
  }
  function focusNote(id: string) {
    setSelected(id);
    const note = state.notes.find((n) => n.id === id);
    const highest = Math.max(0, ...state.notes.map((n) => n.z));
    if (note && note.z < highest) changeNote(id, { z: highest + 1 });
  }
  function addNote(note = createNote(state.notes.length)) {
    if (state.notes.length >= 30) {
      setError("最多保留 30 张便签。");
      return;
    }
    update({ ...state, notes: [...state.notes, note] });
    setSelected(note.id);
  }
  function addExercise(
    noteId: string,
    exercise: { id?: string; name: string; muscle_group: string },
  ) {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note || note.exercises.length >= 100) return;
    changeNote(note.id, {
      exercises: [
        ...note.exercises,
        {
          id: crypto.randomUUID(),
          sourceId: exercise.id,
          name: exercise.name,
          muscle: exercise.muscle_group,
          sets: null,
          reps: null,
          weight: null,
        },
      ],
    });
    setSelected(note.id);
  }
  function assign(id: string, target: string) {
    const note = state.notes.find((note) => note.id === id);
    if (note?.temporary && !isNamedNote(note.title)) {
      setError("请先为便签命名。");
      return;
    }
    update({
      ...state,
      assignments: {
        ...state.assignments,
        [target]: [...new Set([...(state.assignments[target] ?? []), id])],
      },
    });
    setDate(target);
  }
  function endDrag(event: DragEndEvent) {
    const move = event.active.data.current as Move | undefined;
    setDragging(null);
    if (!move || !event.over) return;
    const over = event.over.data.current;
    if (move.kind === "exercise") {
      if (over?.noteId) addExercise(over.noteId, move.exercise);
      else if (event.over.id === "canvas") {
        const note = createNote(state.notes.length);
        note.exercises.push({
          id: crypto.randomUUID(),
          sourceId: move.exercise.id,
          name: move.exercise.name,
          muscle: move.exercise.muscle_group,
          sets: null,
          reps: null,
          weight: null,
        });
        addNote(note);
      }
    } else if (over?.date) assign(move.id, over.date);
    else if (event.over.id === "canvas" || over?.noteId) {
      const note = state.notes.find((n) => n.id === move.id);
      if (!note) return;
      const box = canvas.current?.getBoundingClientRect();
      changeNote(note.id, {
        x: Math.max(
          0,
          Math.min(
            (box?.width ?? 800) - Math.min(note.width, box?.width ?? 800),
            note.x + event.delta.x,
          ),
        ),
        y: Math.max(
          0,
          Math.min((box?.height ?? 600) - 48, note.y + event.delta.y),
        ),
        z: Math.max(0, ...state.notes.map((n) => n.z)) + 1,
      });
      setSelected(note.id);
    }
  }
  const saved = (catalog.data?.exercises ?? []).filter(
    (e) => !e.hidden && !e.deleted_at,
  );
  const exercises = [
    ...saved.map((e) => ({ ...e, source: "custom" })),
    ...(base.data ?? []).map(adaptBaseExercise),
  ];
  const details = [
    ...new Set(
      exercises
        .filter(
          (e) =>
            family === "全部" ||
            (family === "自定义"
              ? e.source === "custom"
              : muscleFamily(e.muscle_group) === family),
        )
        .map((e) =>
          e.muscle_group === muscleFamily(e.muscle_group)
            ? "未细分"
            : exerciseDetail(e.muscle_group),
        ),
    ),
  ];
  if (family === "胸")
    details.sort(
      (a, b) =>
        ["上胸", "中胸", "下胸", "未细分"].indexOf(a) -
        ["上胸", "中胸", "下胸", "未细分"].indexOf(b),
    );
  const filtered = exercises.filter(
    (e) =>
      (family === "全部" ||
        (family === "自定义"
          ? e.source === "custom"
          : muscleFamily(e.muscle_group) === family)) &&
      (detail === "全部" ||
        (e.muscle_group === muscleFamily(e.muscle_group)
          ? "未细分"
          : exerciseDetail(e.muscle_group)) === detail) &&
      `${e.name} ${"originalName" in e ? e.originalName : ""} ${e.muscle_group}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const chosen = state.notes.find((n) => n.id === selected);
  const month = calendarMonth(monthDate);
  const totals = muscleTotals(chosen);
  const sum = totals.reduce((n, [, count]) => n + count, 0);
  let offset = 0;
  return (
    <DndContext
      id={dragContextId}
      sensors={sensors}
      collisionDetection={(args) => {
        const hits = pointerWithin(args);
        return hits.length ? hits : rectIntersection(args);
      }}
      onDragStart={(e) => setDragging(e.active.data.current as Move)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={endDrag}
    >
      <div className={styles.workbench}>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.workspace}>
          <aside className={styles.left}>
            <section className={styles.calendar} aria-label="计划日历">
              <div className={styles.monthHeading}>
                <button
                  aria-label="上一月"
                  disabled={month.from <= "2020-01-01"}
                  onClick={() =>
                    setMonthDate(
                      changeCalendarMonth(
                        monthDate,
                        month.month === 1 ? month.year - 1 : month.year,
                        month.month === 1 ? 12 : month.month - 1,
                      ),
                    )
                  }
                >
                  <ChevronLeft />
                </button>
                <select
                  aria-label="计划年份"
                  value={month.year}
                  onChange={(e) =>
                    setMonthDate(
                      changeCalendarMonth(
                        monthDate,
                        +e.target.value,
                        month.month,
                      ),
                    )
                  }
                >
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={2020 + i}>
                      {2020 + i} 年
                    </option>
                  ))}
                </select>
                <span>{month.month} 月</span>
                <button
                  aria-label="下一月"
                  disabled={month.to >= "2030-12-31"}
                  onClick={() =>
                    setMonthDate(
                      changeCalendarMonth(
                        monthDate,
                        month.month === 12 ? month.year + 1 : month.year,
                        month.month === 12 ? 1 : month.month + 1,
                      ),
                    )
                  }
                >
                  <ChevronRight />
                </button>
              </div>
              <div className={styles.days}>
                {[..."一二三四五六日"].map((day) => (
                  <small key={day}>{day}</small>
                ))}
                {Array.from({ length: 42 }, (_, i) => {
                  const day = i - month.offset + 1;
                  const target = `${month.from.slice(0, 8)}${String(day).padStart(2, "0")}`;
                  return day > 0 && day <= month.days ? (
                    <CalendarDay
                      key={i}
                      date={target}
                      active={date === target}
                      count={state.assignments[target]?.length ?? 0}
                      onClick={() => setDate(target)}
                    />
                  ) : (
                    <span key={i} />
                  );
                })}
              </div>
              <div className={styles.dateHeading}>
                <button
                  onClick={() => {
                    const day = today(profile.data?.timezone);
                    setDate(day);
                    setMonthDate(day);
                  }}
                >
                  今天
                </button>
              </div>
              <div className={styles.schedule}>
                {(state.assignments[date] ?? []).map((id) => (
                  <div key={id}>
                    <button onClick={() => setSelected(id)}>
                      {state.notes.find((n) => n.id === id)?.title}
                    </button>
                    <button
                      aria-label="移除日期安排"
                      onClick={() =>
                        update({
                          ...state,
                          assignments: {
                            ...state.assignments,
                            [date]: state.assignments[date].filter(
                              (v) => v !== id,
                            ),
                          },
                        })
                      }
                    >
                      <X />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.warehouse} aria-label="便签仓库">
              <div className={styles.sectionHeading}>
                <h2>便签仓库</h2>
                <span>{warehouse.length}</span>
              </div>
              <div className={styles.warehouseList}>
                {warehouse.map((note) => (
                  <WarehouseNote
                    key={note.id}
                    note={note}
                    selected={selected === note.id}
                    onSelect={() => focusNote(note.id)}
                    onAssign={() => assign(note.id, date)}
                  />
                ))}
                {!warehouse.length && (
                  <button
                    className={styles.emptyAdd}
                    onClick={() => addNote()}
                    disabled={!ready}
                  >
                    <Plus />
                    创建第一张便签
                  </button>
                )}
              </div>
            </section>
          </aside>
          <section className={styles.center} aria-label="训练便签编辑区">
            <div className={styles.canvasHeading}>
              <Button
                onClick={() => addNote()}
                disabled={!ready || state.notes.length >= 30}
              >
                <Plus />
                新建便签
              </Button>
              <span>{state.notes.length} 张便签</span>
            </div>
            <Canvas canvasRef={canvas}>
              {!state.notes.length && (
                <div className={styles.canvasEmpty}>
                  <Archive />
                  <h2>从一张训练便签开始</h2>
                  <p>新建便签，或将右侧动作拖入画布</p>
                  <Button onClick={() => addNote()} disabled={!ready}>
                    <Plus />
                    新建便签
                  </Button>
                </div>
              )}
              {state.notes.map((note) => (
                <Note
                  key={note.id}
                  note={note}
                  selected={selected === note.id}
                  onSelect={() => focusNote(note.id)}
                  onChange={(changes) => changeNote(note.id, changes)}
                  onDelete={() => {
                    const assignments = Object.fromEntries(
                      Object.entries(state.assignments).map(([day, ids]) => [
                        day,
                        ids.filter((id) => id !== note.id),
                      ]),
                    );
                    update({
                      notes: state.notes.filter((n) => n.id !== note.id),
                      assignments,
                    });
                  }}
                />
              ))}
            </Canvas>
          </section>
          <aside className={styles.library} aria-label="动作搜索库">
            <label className={styles.search}>
              <Search />
              <input
                type="search"
                placeholder="搜索动作"
                aria-label="搜索动作"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(60);
                }}
              />
            </label>
            <div className={styles.families} aria-label="一级肌群">
              {families.map((value) => (
                <button
                  key={value}
                  aria-pressed={family === value}
                  onClick={() => {
                    setFamily(value);
                    setVisibleCount(60);
                    setDetail("全部");
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            {family !== "全部" && (
              <div className={styles.details} aria-label="二级细分">
                {["全部", ...details].map((value) => (
                  <button
                    key={value}
                    aria-pressed={detail === value}
                    onClick={() => {
                      setDetail(value);
                      setVisibleCount(60);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
            {family === "自定义" && (
              <form
                className={styles.customForm}
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!customName.trim() || customBusy) return;
                  setCustomBusy(true);
                  try {
                    await api("catalog", {
                      kind: "exercises",
                      item: {
                        id: crypto.randomUUID(),
                        name: customName.trim(),
                        muscle_group: customMuscle,
                        notes: "",
                        hidden: false,
                      },
                    });
                    catalog.reload();
                    setCustomName("");
                    setError("");
                  } catch (cause) {
                    setError((cause as Error).message);
                  } finally {
                    setCustomBusy(false);
                  }
                }}
              >
                <input
                  aria-label="自定义动作名称"
                  placeholder="动作名称"
                  maxLength={120}
                  required
                  value={customName}
                  onChange={(event) => setCustomName(event.target.value)}
                />
                <select
                  aria-label="自定义动作肌群"
                  value={customMuscle}
                  onChange={(event) => setCustomMuscle(event.target.value)}
                >
                  {families
                    .filter((value) => value !== "全部" && value !== "自定义")
                    .map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                </select>
                <Button
                  type="submit"
                  disabled={customBusy || !customName.trim()}
                >
                  {customBusy ? "保存中…" : "添加动作"}
                </Button>
              </form>
            )}
            {base.error && (
              <p role="alert">
                基础动作库读取失败，<button onClick={base.reload}>重试</button>
              </p>
            )}
            {catalog.error && (
              <p role="alert">
                个人动作读取失败，<button onClick={catalog.reload}>重试</button>
              </p>
            )}
            <div className={styles.exerciseList}>
              {filtered.slice(0, visibleCount).map((exercise) => (
                <LibraryExercise
                  key={exercise.id}
                  exercise={exercise}
                  canAdd={Boolean(chosen)}
                  onAdd={() => chosen && addExercise(chosen.id, exercise)}
                />
              ))}
              {filtered.length > visibleCount && (
                <Button onClick={() => setVisibleCount(visibleCount + 60)}>
                  更多动作（{filtered.length - visibleCount}）
                </Button>
              )}
              {!filtered.length && <p>没有匹配的动作</p>}
            </div>
          </aside>
        </div>
        <footer className={styles.analysis} aria-label="肌群组数占比">
          <div>
            <h2>肌群占比</h2>
            <span>{chosen ? chosen.title : "选择便签"}</span>
          </div>
          <svg
            viewBox="0 0 72 72"
            role="img"
            aria-label={sum ? `已填写 ${sum} 组` : "暂无组数"}
          >
            <circle
              cx="36"
              cy="36"
              r="28"
              fill="none"
              stroke="var(--line)"
              strokeWidth="7"
            />
            {totals.map(([label, count], index) => {
              const length = (count / sum) * 100;
              const start = offset;
              offset += length;
              return (
                <circle
                  key={label}
                  cx="36"
                  cy="36"
                  r="28"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="7"
                  pathLength="100"
                  strokeDasharray={`${length} ${100 - length}`}
                  strokeDashoffset={-start}
                  transform="rotate(-90 36 36)"
                />
              );
            })}
            <text x="36" y="40" textAnchor="middle">
              {sum || "—"}
            </text>
          </svg>
          <div className={styles.legend}>
            {totals.map(([label, count], i) => (
              <span key={label}>
                <i style={{ background: colors[i % colors.length] }} />
                {label}
                <strong>{Math.round((count / sum) * 100)}%</strong>
                <small>{count} 组</small>
              </span>
            ))}
            {!sum && <p>填写动作组数后显示</p>}
          </div>
          <small className={styles.analysisHint}>按便签组数统计</small>
        </footer>
      </div>
      <DragOverlay>
        {dragging && dragging.kind !== "note" ? (
          <div className={styles.dragPreview}>
            {dragging.kind === "exercise"
              ? dragging.exercise.name
              : state.notes.find((n) => n.id === dragging.id)?.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
function Canvas({
  canvasRef,
  children,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        canvasRef.current = node;
      }}
      className={styles.canvas}
      data-over={isOver || undefined}
    >
      {children}
    </div>
  );
}
function CalendarDay({
  date,
  active,
  count,
  onClick,
}: {
  date: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${date}`,
    data: { date },
  });
  return (
    <button
      ref={setNodeRef}
      aria-label={`${date}${count ? `，${count} 项计划` : ""}`}
      aria-pressed={active}
      data-over={isOver || undefined}
      onClick={onClick}
    >
      {Number(date.slice(-2))}
      <i data-filled={Boolean(count)} />
    </button>
  );
}
function WarehouseNote({
  note,
  selected,
  onSelect,
  onAssign,
}: {
  note: PlanNote;
  selected: boolean;
  onSelect: () => void;
  onAssign: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `warehouse:${note.id}`,
    data: { kind: "warehouse", id: note.id } satisfies Move,
  });
  return (
    <div
      className={styles.storedNote}
      data-selected={selected}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={styles.warehouseHandle}
        aria-label={`拖动便签：${note.title}`}
      >
        <GripVertical />
      </button>
      <button onClick={onSelect}>
        <strong>{note.title}</strong>
        <small>{note.exercises.length} 个动作</small>
      </button>
      <button
        onClick={onAssign}
        aria-label={`安排到所选日期：${note.title}`}
        title="安排到所选日期"
      >
        <Plus />
      </button>
    </div>
  );
}
function LibraryExercise({
  exercise,
  canAdd,
  onAdd,
}: {
  exercise: { id: string; name: string; muscle_group: string };
  canAdd: boolean;
  onAdd: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `exercise:${exercise.id}`,
    data: { kind: "exercise", exercise } satisfies Move,
  });
  return (
    <div
      className={styles.libraryRow}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`拖动动作：${exercise.name}`}
      >
        <GripVertical />
        <span>
          <strong>{exercise.name}</strong>
          <small>
            {exercise.muscle_group || "未分类"}
            {exercise.id.startsWith("free-db:") ? " · 基础库" : ""}
          </small>
        </span>
      </button>
      <button
        aria-label={`添加动作：${exercise.name}`}
        disabled={!canAdd}
        onClick={onAdd}
      >
        <Plus />
      </button>
    </div>
  );
}
function Note({
  note,
  selected,
  onSelect,
  onChange,
  onDelete,
}: {
  note: PlanNote;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: Partial<PlanNote>) => void;
  onDelete: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `note-drop:${note.id}`,
    data: { noteId: note.id },
  });
  const drag = useDraggable({
    id: `note:${note.id}`,
    data: { kind: "note", id: note.id } satisfies Move,
  });
  const [size, setSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  function resize(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: note.width,
      height: note.height,
    };
    let next = { width: note.width, height: note.height };
    const move = (e: globalThis.PointerEvent) => {
      next = {
        width: Math.max(300, Math.min(720, start.width + e.clientX - start.x)),
        height: Math.max(
          220,
          Math.min(700, start.height + e.clientY - start.y),
        ),
      };
      setSize(next);
    };
    const finish = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", cancel);
      onChange(next);
      setSize(null);
    };
    const cancel = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", cancel);
      setSize(null);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", cancel);
  }
  return (
    <article
      ref={(node) => {
        setNodeRef(node);
        drag.setNodeRef(node);
      }}
      className={styles.note}
      data-selected={selected}
      data-over={isOver || undefined}
      onPointerDown={onSelect}
      onFocus={onSelect}
      style={{
        left: note.x,
        top: note.y,
        width: size?.width ?? note.width,
        height: size?.height ?? note.height,
        zIndex: note.z + (note.pinned ? 100000 : 0),
        transform: drag.transform
          ? `translate(${drag.transform.x}px, ${drag.transform.y}px)`
          : undefined,
      }}
      aria-label={`训练便签：${note.title || "未命名计划"}`}
    >
      <header
        ref={drag.setActivatorNodeRef}
        {...drag.attributes}
        {...drag.listeners}
        role="toolbar"
        aria-label={`移动便签：${note.title || "未命名计划"}`}
        onPointerDown={(event) => {
          if (
            (event.target as HTMLElement).closest(
              "input,button,a,select,textarea",
            )
          )
            return;
          drag.listeners?.onPointerDown?.(event);
        }}
        onKeyDown={(event) => {
          if (event.target === event.currentTarget)
            drag.listeners?.onKeyDown?.(event);
        }}
      >
        <input
          aria-label="便签名称"
          value={note.title === "未命名计划" ? "" : note.title}
          placeholder="未命名计划"
          maxLength={60}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <button
          aria-label="置顶便签"
          aria-pressed={note.pinned}
          onClick={() => onChange({ pinned: !note.pinned })}
        >
          <Pin />
        </button>
        <button aria-label="移除本地便签" onClick={onDelete}>
          <X />
        </button>
      </header>
      <div className={styles.noteBody}>
        {!note.exercises.length ? (
          <div className={styles.noteEmpty}>
            <Plus />
            <p>将动作拖到这里</p>
          </div>
        ) : (
          <>
            <div className={styles.columnLabels}>
              <span>动作</span>
              <span>组</span>
              <span>次</span>
              <span>kg</span>
              <span />
            </div>
            {note.exercises.map((exercise) => (
              <div className={styles.exercise} key={exercise.id}>
                <span title={exercise.name}>{exercise.name}</span>
                {(["sets", "reps", "weight"] as const).map((field) => (
                  <input
                    key={field}
                    type="number"
                    min="0"
                    max={field === "weight" ? 10000 : 1000}
                    step={field === "weight" ? 0.5 : 1}
                    aria-label={`${exercise.name}${field === "sets" ? "组数" : field === "reps" ? "次数" : "重量"}`}
                    placeholder="—"
                    value={exercise[field] ?? ""}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? null : +e.target.value;
                      if (
                        value !== null &&
                        (!Number.isFinite(value) ||
                          value < 0 ||
                          value > (field === "weight" ? 10000 : 1000) ||
                          (field !== "weight" && !Number.isInteger(value)))
                      )
                        return;
                      onChange({
                        exercises: note.exercises.map((v) =>
                          v.id === exercise.id ? { ...v, [field]: value } : v,
                        ),
                      });
                    }}
                  />
                ))}
                <button
                  aria-label={`移除动作：${exercise.name}`}
                  onClick={() =>
                    onChange({
                      exercises: note.exercises.filter(
                        (v) => v.id !== exercise.id,
                      ),
                    })
                  }
                >
                  <X />
                </button>
              </div>
            ))}
          </>
        )}
      </div>
      <footer>
        <span>
          {note.exercises.length} 个动作
          {note.sourceId ? " · 已有计划的本地副本" : ""}
        </span>
        <button
          className={styles.resize}
          aria-label="调整便签大小"
          onPointerDown={resize}
          onKeyDown={(e) => {
            if (
              ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              onChange({
                width: Math.max(
                  300,
                  Math.min(
                    720,
                    note.width +
                      (e.key === "ArrowRight"
                        ? 20
                        : e.key === "ArrowLeft"
                          ? -20
                          : 0),
                  ),
                ),
                height: Math.max(
                  220,
                  Math.min(
                    700,
                    note.height +
                      (e.key === "ArrowDown"
                        ? 20
                        : e.key === "ArrowUp"
                          ? -20
                          : 0),
                  ),
                ),
              });
            }
          }}
        >
          <span className={styles.resizeGrip} aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}
