"use client";
import {
  useEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
  type PointerEvent,
  type RefObject,
} from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  closestCenter,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pin,
  Plus,
  Search,
  Funnel,
  X,
  Archive,
  Copy,
  Trash2,
} from "lucide-react";
import { useResource } from "../resource";
import { useResourceUser } from "../ResourceProvider";
import { Button } from "../ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  PopoverTitle,
} from "../ui/popover";
import { calendarMonth, changeCalendarMonth } from "@/lib/calendar";
import { today, type Exercise, type Profile } from "@/lib/domain";
import { api } from "@/lib/client";
import {
  adaptBaseExercise,
  cardioDetail,
  matchesLibraryFamily,
  baseChestRegion,
  baseShoulderRegion,
  equipmentFilters,
  matchesEquipment,
  exerciseDetail,
  localizedExerciseName,
  type BaseExercise,
} from "@/lib/exercise-base";

import {
  createNote,
  copyWarehouseNote,
  deleteWorkbenchNote,
  isNamedNote,
  persistedWorkbench,
  emptyWorkbench,
  muscleFamily,
  fitNoteToCanvas,
  centerNoteInCanvas,
  resizeNoteFromEdge,
  type ResizeEdge,
  readWorkbench,
  type PlanNote,
  type WorkbenchState,
} from "@/lib/training-workbench";
import styles from "./TrainingWorkbench.module.css";
import { MuscleComposition } from "./MuscleComposition";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
  SortableOverlay,
} from "../ui/sortable";

type Move =
  | {
      kind: "exercise";
      exercise: { id?: string; name: string; muscle_group: string };
    }
  | { kind: "note" | "warehouse"; id: string };
const followNotePointer: Modifier = (args) =>
  args.active?.data.current?.kind === "exercise"
    ? args.transform
    : snapCenterToCursor(args);
const families = ["胸", "背", "肩", "手臂", "下肢", "核心", "其他", "有氧"];

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
  const [equipment, setEquipment] = useState<string[]>([]);
  const [family, setFamily] = useState("全部");
  const [detail, setDetail] = useState("全部");
  const [dragging, setDragging] = useState<Move | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 194, minHeight: 50 });
  const canvas = useRef<HTMLDivElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const overlayHost = useRef<HTMLDivElement>(null);
  const searchRow = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState(0);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasSize((old) =>
        old.width === width && old.height === height ? old : { width, height },
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const catalog = useResource<{ exercises: Exercise[] }>("catalog");
  const base = useResource<BaseExercise[]>("exercise-base");
  const [visibleCount, setVisibleCount] = useState(60);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("其他");
  const [customBusy, setCustomBusy] = useState(false);
  const warehouse = state.notes.filter((note) => note.inWarehouse);
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
            muscle:
              exercise.sourceId?.startsWith("free-db:") &&
              baseChestRegion(exercise.sourceId)
                ? `胸 / ${baseChestRegion(exercise.sourceId)}`
                : exercise.sourceId?.startsWith("free-db:") &&
                    baseShoulderRegion(exercise.sourceId)
                  ? `肩 / ${baseShoulderRegion(exercise.sourceId)}`
                  : exercise.muscle,
            name: exercise.sourceId?.startsWith("free-db:")
              ? localizedExerciseName(exercise.sourceId, exercise.name)
              : exercise.name,
          })),
        })),
      });
      setSelected(restored.notes.find((note) => !note.inWarehouse)?.id ?? "");
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
      notes: state.notes.map((n) =>
        n.id === id
          ? fitNoteToCanvas(
              { ...n, ...changes },
              canvasSize.width,
              canvasSize.height,
            )
          : n,
      ),
    });
  }
  function focusNote(id: string) {
    setSelected(id);
    const note = state.notes.find((n) => n.id === id);
    if (note?.inWarehouse) {
      changeNote(id, {
        ...centerNoteInCanvas(note, canvasSize.width, canvasSize.height),
        inWarehouse: false,
      });
      return;
    }
    const highest = Math.max(0, ...state.notes.map((n) => n.z));
    if (note && note.z < highest) changeNote(id, { z: highest + 1 });
  }
  function addNote(note = createNote(state.notes.length)) {
    if (state.notes.length >= 30) {
      setError("最多保留 30 张便签。");
      return;
    }
    note = centerNoteInCanvas(note, canvasSize.width, canvasSize.height);
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
    if (event.over.id === "note-trash" && move.kind !== "exercise") {
      update(deleteWorkbenchNote(state, move.id));
      if (selected === move.id) setSelected("");
      return;
    }
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
    } else if (event.over.id === "warehouse") {
      changeNote(move.id, { inWarehouse: true, savedToWarehouse: true });
      if (selected === move.id)
        setSelected(
          state.notes.find((note) => note.id !== move.id && !note.inWarehouse)
            ?.id ?? "",
        );
    } else if (over?.date) assign(move.id, over.date);
    else if (event.over.id === "canvas" || over?.noteId) {
      const note = state.notes.find((n) => n.id === move.id);
      if (!note) return;
      const box = canvas.current?.getBoundingClientRect();
      if (move.kind === "warehouse") {
        changeNote(note.id, {
          ...centerNoteInCanvas(note, canvasSize.width, canvasSize.height),
          inWarehouse: false,
        });
        setSelected(note.id);
        return;
      }
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
    ...saved.map((e) => ({
      ...e,
      source: "custom",
      equipment: null as string | null,
      category: undefined as string | undefined,
    })),
    ...(base.data ?? []).map(adaptBaseExercise),
  ];
  const details = [
    ...new Set(
      exercises
        .filter((e) =>
          matchesLibraryFamily(e, family, muscleFamily(e.muscle_group)),
        )
        .map((e) =>
          family === "有氧"
            ? (cardioDetail(e.id) ?? "其他有氧")
            : e.muscle_group === muscleFamily(e.muscle_group)
              ? "未细分"
              : exerciseDetail(e.muscle_group),
        ),
    ),
  ];
  if (family === "有氧") {
    const order = [
      "跑步机",
      "椭圆机",
      "爬楼机",
      "固定单车",
      "卧式单车",
      "划船机",
      "跳绳",
      "雪橇",
      "户外骑行",
      "户外跑走",
      "滑行",
      "其他有氧",
    ];
    details.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  if (family === "肩")
    details.sort(
      (a, b) =>
        ["前束", "中束", "后束", "综合", "肩袖", "拉伸", "未细分"].indexOf(a) -
        ["前束", "中束", "后束", "综合", "肩袖", "拉伸", "未细分"].indexOf(b),
    );
  if (family === "胸")
    details.sort(
      (a, b) =>
        ["上胸", "中胸", "下胸", "综合", "拉伸", "未细分"].indexOf(a) -
        ["上胸", "中胸", "下胸", "综合", "拉伸", "未细分"].indexOf(b),
    );
  const filtered = exercises.filter(
    (e) =>
      matchesEquipment(e.equipment, equipment) &&
      matchesLibraryFamily(e, family, muscleFamily(e.muscle_group)) &&
      (detail === "全部" ||
        (family === "有氧"
          ? (cardioDetail(e.id) ?? "其他有氧")
          : e.muscle_group === muscleFamily(e.muscle_group)
            ? "未细分"
            : exerciseDetail(e.muscle_group)) === detail) &&
      `${e.name} ${"originalName" in e ? e.originalName : ""} ${e.muscle_group}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const chosen = state.notes.find((n) => n.id === selected);
  const month = calendarMonth(monthDate);

  return (
    <DndContext
      id={dragContextId}
      sensors={sensors}
      modifiers={[followNotePointer]}
      collisionDetection={(args) => {
        const trash = rectIntersection({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) =>
              container.id === "note-trash" &&
              args.active.data.current?.kind !== "exercise",
          ),
        });
        if (trash.length) return trash;
        const targets = {
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id !== "note-trash",
          ),
        };
        const hits = pointerWithin(targets);
        return hits.length ? hits : rectIntersection(targets);
      }}
      onDragStart={(e) => {
        const move = e.active.data.current as Move;
        if (move.kind !== "exercise") {
          const row = canvas.current
            ?.closest("main")
            ?.querySelector("[data-warehouse-note]");
          const rect = row?.getBoundingClientRect();
          if (rect)
            setPreviewSize({ width: rect.width, minHeight: rect.height });
        }
        setDragging(move);
        if (move.kind === "note") setEditing((value) => value + 1);
      }}
      onDragCancel={() => setDragging(null)}
      onDragEnd={endDrag}
    >
      <div className={styles.workbench}>
        <div ref={overlayHost} className={styles.overlayHost} />
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
                      {2020 + i}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const day = today(profile.data?.timezone);
                    setDate(day);
                    setMonthDate(day);
                  }}
                >
                  今天
                </button>
                <select
                  aria-label="计划月份"
                  value={month.month}
                  onChange={(e) =>
                    setMonthDate(
                      changeCalendarMonth(
                        monthDate,
                        month.year,
                        +e.target.value,
                      ),
                    )
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
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

              <div className={styles.schedule}>
                {(state.assignments[date] ?? []).map((id) => (
                  <div key={id}>
                    <button onClick={() => focusNote(id)}>
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
            <Warehouse>
              <div className={styles.sectionHeading}>
                <h2>便签仓库</h2>
                <Button
                  className={styles.newNoteButton}
                  onClick={() => addNote()}
                  disabled={!ready || state.notes.length >= 30}
                >
                  <Plus />
                  新建便签
                </Button>
              </div>
              <div className={styles.warehouseList}>
                {warehouse.map((note) => (
                  <WarehouseNote
                    key={note.id}
                    note={fitNoteToCanvas(
                      note,
                      canvasSize.width,
                      canvasSize.height,
                    )}
                    selected={selected === note.id}
                    onSelect={() => focusNote(note.id)}
                    canCopy={state.notes.length < 30}
                    onCopy={() => update(copyWarehouseNote(state, note.id))}
                  />
                ))}
              </div>
            </Warehouse>
          </aside>
          <section className={styles.center} aria-label="训练便签编辑区">
            <div className={styles.canvasSurface}>
              <Canvas canvasRef={canvas}>
                {!state.notes.some((note) => !note.inWarehouse) && (
                  <div className={styles.canvasEmpty}>
                    <Archive />
                    <h2>从一张训练便签开始</h2>
                    <p>新建便签，或将右侧动作拖入画布</p>
                  </div>
                )}
                {state.notes
                  .filter((note) => !note.inWarehouse)
                  .map((note) => (
                    <Note
                      key={note.id}
                      note={fitNoteToCanvas(
                        note,
                        canvasSize.width,
                        canvasSize.height,
                      )}
                      selected={selected === note.id}
                      onSelect={() => focusNote(note.id)}
                      libraryRef={libraryRef}
                      onChange={(changes) => changeNote(note.id, changes)}
                    />
                  ))}
              </Canvas>
              <NoteTrash
                key="trash-drop"
                active={Boolean(dragging && dragging.kind !== "exercise")}
              />
              <MuscleComposition
                exercises={chosen?.exercises}
                preferredFamily={family}
                editing={editing}
              />
            </div>
          </section>
          <aside
            ref={libraryRef}
            className={styles.library}
            aria-label="动作搜索库"
          >
            <div ref={searchRow} className={styles.searchRow}>
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
              <Popover>
                <PopoverTrigger
                  className={styles.filterButton}
                  aria-label="器材筛选"
                  data-active={equipment.length > 0 || undefined}
                >
                  <Funnel
                    fill={equipment.length > 0 ? "currentColor" : "none"}
                  />
                </PopoverTrigger>
                <PopoverContent
                  container={overlayHost}
                  anchor={searchRow}
                  positionMethod="fixed"
                  sideOffset={12}
                  align="start"
                  className={styles.equipmentPopup}
                >
                  <PopoverTitle className={styles.srOnly}>
                    器材筛选
                  </PopoverTitle>
                  <div className={styles.equipmentTags}>
                    {Object.entries(equipmentFilters).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={equipment.includes(value)}
                        onClick={() => {
                          setEquipment((previous) =>
                            previous.includes(value)
                              ? previous.filter((item) => item !== value)
                              : [...previous, value],
                          );
                          setVisibleCount(60);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className={styles.families} aria-label="一级肌群">
              {families.map((value) => (
                <button
                  key={value}
                  aria-pressed={family === value}
                  onClick={() => {
                    setFamily((previous) =>
                      previous === value ? "全部" : value,
                    );
                    setVisibleCount(60);
                    setDetail("全部");
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            {family === "其他" && (
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
            {family !== "全部" && (
              <div className={styles.details} aria-label="二级细分">
                {details.map((value) => (
                  <button
                    key={value}
                    aria-pressed={detail === value}
                    onClick={() => {
                      setDetail((previous) =>
                        previous === value ? "全部" : value,
                      );
                      setVisibleCount(60);
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
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
                <LibraryExercise key={exercise.id} exercise={exercise} />
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
      </div>
      {/* A warehouse row stays saved at its source; the dropped note opens on
          the canvas. Returning the overlay to that row falsely suggests failure. */}
      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div
            className={styles.dragPreview}
            data-kind={dragging.kind}
            style={dragging.kind !== "exercise" ? previewSize : undefined}
          >
            {dragging.kind === "exercise" && <GripVertical aria-hidden />}
            <span>
              <strong>
                {dragging.kind === "exercise"
                  ? dragging.exercise.name
                  : state.notes.find((n) => n.id === dragging.id)?.title ||
                    "未命名计划"}
              </strong>
              {dragging.kind === "exercise" && (
                <small>
                  {dragging.exercise.muscle_group}
                  {dragging.exercise.id?.startsWith("free-db:")
                    ? " · 基础库"
                    : ""}
                </small>
              )}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
function NoteTrash({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "note-trash" });
  return (
    <div
      ref={setNodeRef}
      className={styles.noteTrash}
      aria-hidden={!active}
      data-active={active || undefined}
      data-over={(active && isOver) || undefined}
      role="status"
      aria-label={active && isOver ? "松手删除便签" : "拖入删除便签"}
    >
      <Trash2 aria-hidden />
    </div>
  );
}
function Warehouse({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "warehouse" });
  return (
    <section
      ref={setNodeRef}
      className={styles.warehouse}
      data-over={isOver || undefined}
      aria-label="便签仓库"
    >
      {children}
    </section>
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
  onCopy,
  canCopy,
}: {
  note: PlanNote;
  selected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  canCopy: boolean;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `warehouse:${note.id}`,
    data: { kind: "warehouse", id: note.id } satisfies Move,
  });
  return (
    <div
      data-warehouse-note
      className={styles.storedNote}
      data-selected={selected}
      style={{ opacity: isDragging ? 0.4 : 1 }}
    >
      <button
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={styles.warehouseHandle}
        aria-label={`拖动便签：${note.title || "未命名计划"}`}
        onClick={onSelect}
      >
        <GripVertical />
        <span>
          <strong>{note.title || "未命名计划"}</strong>
          <small>{note.exercises.length} 个动作</small>
        </span>
      </button>
      <button
        onClick={onCopy}
        disabled={!canCopy}
        aria-label={`复制仓库便签：${note.title || "未命名计划"}`}
        title="复制仓库便签"
      >
        <Copy />
      </button>
    </div>
  );
}
function LibraryExercise({
  exercise,
}: {
  exercise: { id: string; name: string; muscle_group: string };
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
    </div>
  );
}
function ExerciseReturnTarget({
  libraryRef,
}: {
  libraryRef: RefObject<HTMLElement | null>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "exercise-return-library",
  });
  const { active } = useDndContext();
  return libraryRef.current
    ? createPortal(
        <div
          ref={setNodeRef}
          className={styles.libraryReturnTarget}
          data-active={Boolean(active) || undefined}
          data-over={isOver || undefined}
          aria-label="拖回动作库移除动作"
        />,
        libraryRef.current,
      )
    : null;
}
function Note({
  note,
  selected,
  onSelect,
  onChange,
  libraryRef,
}: {
  note: PlanNote;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: Partial<PlanNote>) => void;
  libraryRef: RefObject<HTMLElement | null>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `note-drop:${note.id}`,
    data: { noteId: note.id },
  });
  const drag = useDraggable({
    id: `note:${note.id}`,
    data: { kind: "note", id: note.id } satisfies Move,
  });
  const [size, setSize] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  function resize(event: PointerEvent<HTMLButtonElement>, edge: ResizeEdge) {
    onSelect();
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const bounds = target
      .closest("article")
      ?.parentElement?.getBoundingClientRect();
    const start = {
      x: event.clientX,
      y: event.clientY,
      width: note.width,
      height: note.height,
    };
    let next = { x: note.x, y: note.y, width: note.width, height: note.height };
    const move = (e: globalThis.PointerEvent) => {
      next = resizeNoteFromEdge(
        note,
        edge,
        e.clientX - start.x,
        e.clientY - start.y,
        bounds?.width ?? 720,
        bounds?.height ?? 700,
      );
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
        left: size?.x ?? note.x,
        top: size?.y ?? note.y,
        width: size?.width ?? note.width,
        height: size?.height ?? note.height,
        zIndex: note.z + 2 + (note.pinned ? 100000 : 0),
        opacity: drag.isDragging ? 0 : 1,
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
      </header>
      <div
        className={styles.noteBody}
        onPointerDown={(event) => {
          if (
            (event.target as HTMLElement).closest(
              'input,button,a,select,textarea,[role="listitem"]',
            )
          )
            return;
          drag.listeners?.onPointerDown?.(event);
        }}
      >
        {!note.exercises.length ? (
          <div className={styles.noteEmpty}>
            <Plus />
            <p>将动作拖到这里</p>
          </div>
        ) : (
          <>
            <div className={styles.columnLabels}>
              <span />
              <span>动作</span>
              <span>组</span>
              <span>次</span>
              <span>kg</span>
            </div>
            <Sortable
              value={note.exercises}
              getItemValue={(exercise) => exercise.id}
              onValueChange={(exercises) => onChange({ exercises })}
              orientation="vertical"
              modifiers={[]}
              collisionDetection={(args) => {
                const target = pointerWithin(args).filter(
                  (hit) => hit.id === "exercise-return-library",
                );
                if (target.length) return target;
                return closestCenter({
                  ...args,
                  droppableContainers: args.droppableContainers.filter(
                    (item) => item.id !== "exercise-return-library",
                  ),
                });
              }}
              onDragEnd={({ active, over }) => {
                if (over?.id === "exercise-return-library")
                  onChange({
                    exercises: note.exercises.filter(
                      (exercise) => exercise.id !== active.id,
                    ),
                  });
              }}
              autoScroll={false}
            >
              <ExerciseReturnTarget libraryRef={libraryRef} />
              <SortableOverlay dropAnimation={null} zIndex={300000}>
                {({ value }) => (
                  <div className={styles.dragPreview} data-kind="exercise">
                    <strong>
                      {
                        note.exercises.find((exercise) => exercise.id === value)
                          ?.name
                      }
                    </strong>
                  </div>
                )}
              </SortableOverlay>
              <SortableContent role="list" aria-label="便签动作排序">
                {note.exercises.map((exercise) => (
                  <SortableItem
                    className={styles.exercise}
                    key={exercise.id}
                    value={exercise.id}
                    role="listitem"
                  >
                    <SortableItemHandle
                      className={styles.exerciseHandle}
                      aria-label={`排序动作：${exercise.name}`}
                    >
                      <GripVertical aria-hidden />
                    </SortableItemHandle>
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
                              v.id === exercise.id
                                ? { ...v, [field]: value }
                                : v,
                            ),
                          });
                        }}
                      />
                    ))}
                  </SortableItem>
                ))}
              </SortableContent>
            </Sortable>
          </>
        )}
      </div>
      {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeEdge[]).map(
        (edge) => (
          <button
            key={edge}
            className={styles.resizeEdge}
            data-edge={edge}
            aria-label={
              "调整便签大小：" +
              {
                n: "上边",
                s: "下边",
                e: "右边",
                w: "左边",
                ne: "右上角",
                nw: "左上角",
                se: "右下角",
                sw: "左下角",
              }[edge]
            }
            onPointerDown={(event) => resize(event, edge)}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
                  event.key,
                )
              )
                return;
              event.preventDefault();
              event.stopPropagation();
              const bounds = event.currentTarget
                .closest("article")
                ?.parentElement?.getBoundingClientRect();
              onChange(
                resizeNoteFromEdge(
                  note,
                  edge,
                  event.key === "ArrowLeft"
                    ? -20
                    : event.key === "ArrowRight"
                      ? 20
                      : 0,
                  event.key === "ArrowUp"
                    ? -20
                    : event.key === "ArrowDown"
                      ? 20
                      : 0,
                  bounds?.width ?? 720,
                  bounds?.height ?? 700,
                ),
              );
            }}
          />
        ),
      )}
    </article>
  );
}
