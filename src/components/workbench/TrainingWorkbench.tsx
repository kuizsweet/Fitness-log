"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
  useState,
  type ReactNode,
  type CSSProperties,
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
  useDndMonitor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type Modifier,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Pin,
  Plus,
  Search,
  Archive,
  Copy,
  Trash2,
} from "lucide-react";
import { useResource } from "../resource";
import { useResourceUser } from "../ResourceProvider";
import { Button } from "../ui/button";
import {
  calendarMonth,
  changeCalendarMonth,
  fiveRowCalendarDays,
} from "@/lib/calendar";
import { today, type Exercise, type Profile } from "@/lib/domain";
import { api } from "@/lib/client";
import {
  adaptBaseExercise,
  exerciseMuscleMetadata,
  baseChestRegion,
  baseShoulderRegion,
  localizedExerciseName,
  type BaseExercise,
} from "@/lib/exercise-base";

import {
  createNote,
  isBenchExercise,
  nearTrashEdge,
  exerciseInsertionIndex,
  copyWarehouseNote,
  assignWorkbenchNote,
  unassignWorkbenchNote,
  warehouseSections,
  calendarNoteColors,
  warehouseInsertBefore,
  deleteWorkbenchNote,
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
import { BenchExerciseFields } from "./BenchExerciseFields";
import { isCardioExercise, cardioFields } from "@/lib/cardio";
import { LibraryFilterMenu } from "./LibraryFilterMenu";
import {
  deviceOptions,
  muscleOptions,
  filterLibrary,
  librarySections,
} from "@/lib/exercise-library";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableOverlay,
} from "../ui/sortable";

type Move =
  | {
      kind: "exercise";
      exercise: { id?: string; name: string; muscle_group: string };
    }
  | { kind: "note" | "warehouse"; id: string };
const followNotePointer: Modifier = (args) => {
  if (args.active?.data.current?.kind === "exercise") return args.transform;
  const event = args.activatorEvent as globalThis.PointerEvent | null;
  const source = args.activeNodeRect;
  const preview = args.overlayNodeRect;
  if (!event || !source || !preview || typeof event.clientX !== "number")
    return args.transform;
  return {
    ...args.transform,
    x: args.transform.x + event.clientX - source.left - preview.width / 2,
    y: args.transform.y + event.clientY - source.top - preview.height / 2,
  };
};
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
  const [device, setDevice] = useState("all");
  const [muscle, setMuscle] = useState("all");
  const [openFilter, setOpenFilter] = useState<"devices" | "muscles" | null>(
    null,
  );
  const [warehouseBefore, setWarehouseBefore] = useState<
    string | null | undefined
  >();
  const [dragging, setDragging] = useState<Move | null>(null);
  const [outsideCanvas, setOutsideCanvas] = useState(false);
  const [raisedNote, setRaisedNote] = useState(false);
  const [grabbedNote, setGrabbedNote] = useState<string | null>(null);
  useEffect(() => {
    if (!grabbedNote) return;
    const release = () => setGrabbedNote(null);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [grabbedNote]);
  const dragStartRect = useRef<DOMRect | null>(null);
  const [exerciseInsertion, setExerciseInsertion] = useState<{
    noteId: string;
    index: number;
  } | null>(null);
  const [previewSize, setPreviewSize] = useState({ width: 194, minHeight: 50 });
  const canvas = useRef<HTMLDivElement>(null);
  const dragPointer = useRef<{ x: number; y: number } | null>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const leftPanelRef = useRef<HTMLElement>(null);
  const overlayHost = useRef<HTMLDivElement>(null);
  const exerciseList = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [editing, setEditing] = useState(0);
  const [panelOffsets, setPanelOffsets] = useState({ left: 0, right: 0 });
  const [slidingPanel, setSlidingPanel] = useState<string | null>(null);
  function slidePanel(
    event: PointerEvent<HTMLElement>,
    side: "left" | "right",
  ) {
    if (event.button !== 0) return;
    if (
      (event.target as HTMLElement).closest(
        'button,input,select,a,[role="listitem"],[data-warehouse-note]',
      )
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const width = side === "left" ? 220 : 250;
    const max = width - 24;
    const start = event.clientX;
    const initial = panelOffsets[side];
    let next = initial;
    setSlidingPanel(side);
    const move = (e: globalThis.PointerEvent) => {
      next = Math.max(
        0,
        Math.min(
          max,
          initial + (e.clientX - start) * (side === "left" ? -1 : 1),
        ),
      );
      setPanelOffsets((old) => ({ ...old, [side]: next }));
    };
    const finish = () => {
      cleanup();
      setPanelOffsets((old) => ({ ...old, [side]: next > max / 2 ? max : 0 }));
      setSlidingPanel(null);
    };
    const cancel = () => {
      cleanup();
      setPanelOffsets((old) => ({ ...old, [side]: initial }));
      setSlidingPanel(null);
    };
    const cleanup = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", finish);
      handle.removeEventListener("pointercancel", cancel);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", finish);
    handle.addEventListener("pointercancel", cancel);
  }
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
  const base = useResource<BaseExercise[]>(
    "exercise-base?source=hevy-classified-v4",
  );
  const [visibleCount, setVisibleCount] = useState(60);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState("其他");
  const [customBusy, setCustomBusy] = useState(false);
  const warehouse = warehouseSections(state, date);
  const key = `kuizfit:workbench:v1:${user}`;
  const draftKey = `${key}:drafts`;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
      bypassActivationConstraint: ({ activeNode }) =>
        activeNode.data.current?.kind === "note",
    }),
    useSensor(KeyboardSensor),
  );
  useEffect(() => {
    try {
      const restored = readWorkbench(
        localStorage.getItem(draftKey) ?? localStorage.getItem(key),
      );
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
  }, [key, draftKey]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(state));
    } catch {
      setError("未能自动保存草稿，请检查浏览器存储空间。");
    }
  }, [state, ready, draftKey]);
  function update(next: WorkbenchState) {
    if (!ready) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(next));
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
    index?: number,
  ) {
    const note = state.notes.find((n) => n.id === noteId);
    if (!note || note.exercises.length >= 100) return;
    changeNote(note.id, {
      exercises: [
        ...note.exercises.slice(0, index ?? note.exercises.length),
        {
          id: crypto.randomUUID(),
          sourceId: exercise.id,
          name: exercise.name,
          muscle: exercise.muscle_group,
          ...exerciseMuscleMetadata(exercise.id),
          sets: null,
          reps: null,
          weight: null,
        },
        ...note.exercises.slice(index ?? note.exercises.length),
      ],
    });
    setSelected(note.id);
  }
  function assign(id: string, target: string, before: string | null = null) {
    update(assignWorkbenchNote(state, id, target, before));
    setError("");
    setDate(target);
  }
  function warehouseTarget(event: DragMoveEvent): string | null | undefined {
    const move = event.active.data.current as Move | undefined;
    if (!move || move.kind === "exercise") return undefined;
    const host = canvas.current
      ?.closest("main")
      ?.querySelector<HTMLElement>('[aria-label="便签仓库"]');
    if (!host) return undefined;
    const pointer = event.activatorEvent as globalThis.PointerEvent;
    const rect = event.active.rect.current.translated;
    const x =
      dragPointer.current?.x ??
      (typeof pointer.clientX === "number"
        ? pointer.clientX + event.delta.x
        : (rect?.left ?? 0) + (rect?.width ?? 0) / 2);
    const y =
      dragPointer.current?.y ??
      (typeof pointer.clientY === "number"
        ? pointer.clientY + event.delta.y
        : (rect?.top ?? 0) + (rect?.height ?? 0) / 2);
    const bounds = host.getBoundingClientRect();
    if (
      x < bounds.left ||
      x > bounds.right ||
      y < bounds.top ||
      y > bounds.bottom
    )
      return undefined;
    const group =
      [...host.querySelectorAll<HTMLElement>("[data-warehouse-group]")].find(
        (node) => {
          const box = node.getBoundingClientRect();
          return y >= box.top && y <= box.bottom;
        },
      ) ??
      host.querySelector<HTMLElement>('[data-warehouse-group="backup"]') ??
      host;
    const rows = [...group.querySelectorAll<HTMLElement>("[data-warehouse-id]")]
      .filter((row) => row.dataset.warehouseId !== move.id)
      .map((row) => ({
        id: row.dataset.warehouseId!,
        top: row.getBoundingClientRect().top,
        height: row.getBoundingClientRect().height,
      }));
    return warehouseInsertBefore(rows, y);
  }
  function endDrag(event: DragEndEvent) {
    const move = event.active.data.current as Move | undefined;
    setDragging(null);
    setExerciseInsertion(null);
    setWarehouseBefore(undefined);
    if (!move || !event.over) return;
    if (event.over.id === "note-trash" && move.kind !== "exercise") {
      update(deleteWorkbenchNote(state, move.id));
      if (selected === move.id) setSelected("");
      return;
    }
    const over = event.over.data.current;
    if (move.kind === "exercise") {
      if (over?.noteId) {
        const article = [
          ...(canvas.current?.querySelectorAll<HTMLElement>("[data-note-id]") ??
            []),
        ].find((node) => node.dataset.noteId === over.noteId);
        const rows = [
          ...(article?.querySelectorAll<HTMLElement>("[data-exercise-row]") ??
            []),
        ];
        const y = dragPointer.current?.y;
        const index = exerciseInsertionIndex(
          rows.map((row) => row.getBoundingClientRect()),
          y,
        );
        addExercise(over.noteId, move.exercise, index);
      } else if (event.over.id === "canvas") {
        const note = createNote(state.notes.length);
        note.exercises.push({
          id: crypto.randomUUID(),
          sourceId: move.exercise.id,
          name: move.exercise.name,
          muscle: move.exercise.muscle_group,
          ...exerciseMuscleMetadata(move.exercise.id),
          sets: null,
          reps: null,
          weight: null,
        });
        addNote(note);
      }
    } else if (event.over.id === "warehouse" || over?.warehouseGroup) {
      const before = warehouseTarget(event) ?? null;
      if (over?.warehouseGroup === "day") assign(move.id, date, before);
      else update(unassignWorkbenchNote(state, move.id, date, before));
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
    { id: "kuizfit:incline-treadmill", name: "爬坡机", muscle_group: "有氧运动", category: "cardio", equipment: "machine", source: "kuizFit" },
  ];
  const filtered = filterLibrary(exercises, device, muscle, search);
  const isFiltered =
    device !== "all" || muscle !== "all" || Boolean(search.trim());
  const sections = librarySections(filtered, isFiltered);
  useEffect(() => {
    setVisibleCount(60);
    if (exerciseList.current) exerciseList.current.scrollTop = 0;
  }, [device, muscle, search]);
  const chosen = state.notes.find((n) => n.id === selected);
  const month = calendarMonth(monthDate);
  const calendarDays = fiveRowCalendarDays(
    monthDate,
    profile.data?.week_start ?? 1,
  );

  return (
    <DndContext
      id={dragContextId}
      sensors={sensors}
      autoScroll={false}
      collisionDetection={(args) => {
        dragPointer.current = args.pointerCoordinates;
        const trash = pointerWithin({
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
        const notes = hits.filter((hit) =>
          String(hit.id).startsWith("note-drop:"),
        );
        if (notes.length && args.active.data.current?.kind === "exercise")
          return notes;
        const groups = hits.filter((hit) =>
          String(hit.id).startsWith("warehouse-group:"),
        );
        return groups.length
          ? groups
          : hits.length
            ? hits
            : rectIntersection(targets);
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
        dragStartRect.current =
          move.kind === "note"
            ? ([
                ...(canvas.current?.querySelectorAll<HTMLElement>(
                  "[data-note-id]",
                ) ?? []),
              ]
                .find((node) => node.dataset.noteId === move.id)
                ?.getBoundingClientRect() ?? null)
            : null;
        setRaisedNote(false);
        setOutsideCanvas(move.kind === "warehouse");
        if (move.kind === "note") setEditing((value) => value + 1);
      }}
      onDragCancel={() => {
        setDragging(null);
        setExerciseInsertion(null);
        setWarehouseBefore(undefined);
      }}
      onDragMove={(event) => {
        setWarehouseBefore(warehouseTarget(event));
        const bounds = canvas.current?.getBoundingClientRect();
        const start = event.activatorEvent as globalThis.PointerEvent;
        const origin =
          dragStartRect.current ?? event.active.rect.current.initial;
        const point = dragPointer.current ?? {
          x:
            (typeof start.clientX === "number"
              ? start.clientX
              : (origin?.left ?? 0) + (origin?.width ?? 0) / 2) + event.delta.x,
          y:
            (typeof start.clientY === "number"
              ? start.clientY
              : (origin?.top ?? 0) + (origin?.height ?? 0) / 2) + event.delta.y,
        };
        const originRect = dragStartRect.current;
        if (originRect && event.active.data.current?.kind === "note") {
          const card = {
            left: originRect.left + event.delta.x,
            right: originRect.right + event.delta.x,
            top: originRect.top + event.delta.y,
            bottom: originRect.bottom + event.delta.y,
          };
          setRaisedNote((previous) =>
            [leftPanelRef.current, libraryRef.current].some((panel) => {
              const box = panel?.getBoundingClientRect();
              const buffer = previous ? 6 : 0;
              return (
                box &&
                card.left <= box.right + buffer &&
                card.right >= box.left - buffer &&
                card.top <= box.bottom + buffer &&
                card.bottom >= box.top - buffer
              );
            }),
          );
        }
        if (event.active.data.current?.kind === "exercise") {
          const article = [
            ...(canvas.current?.querySelectorAll<HTMLElement>(
              "[data-note-id]",
            ) ?? []),
          ].find((node) => {
            const rect = node.getBoundingClientRect();
            return (
              point.x >= rect.left &&
              point.x <= rect.right &&
              point.y >= rect.top &&
              point.y <= rect.bottom
            );
          });
          const rows = [
            ...(article?.querySelectorAll<HTMLElement>("[data-exercise-row]") ??
              []),
          ];
          const index = exerciseInsertionIndex(
            rows.map((row) => row.getBoundingClientRect()),
            point.y,
          );
          setExerciseInsertion(
            article
              ? {
                  noteId: article.dataset.noteId!,
                  index,
                }
              : null,
          );
        }
        setOutsideCanvas((previous) =>
          Boolean(
            [leftPanelRef.current, libraryRef.current].some((panel) => {
              const box = panel?.getBoundingClientRect();
              return (
                box &&
                point.x >= box.left - (previous ? 6 : 0) &&
                point.x <= box.right + (previous ? 6 : 0) &&
                point.y >= box.top - (previous ? 6 : 0) &&
                point.y <= box.bottom + (previous ? 6 : 0)
              );
            }) ||
            (bounds &&
              (point.x < bounds.left ||
                point.x > bounds.right ||
                point.y < bounds.top ||
                point.y > bounds.bottom)),
          ),
        );
      }}
      onDragEnd={endDrag}
    >
      <div className={styles.workbench}>
        <div ref={overlayHost} className={styles.overlayHost} />
        {error && error !== "请先为便签命名。" && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div
          className={styles.workspace}
          data-sliding={slidingPanel || undefined}
          style={
            {
              "--left-visible": `${220 - panelOffsets.left}px`,
              "--right-visible": `${250 - panelOffsets.right}px`,
              "--left-offset": `${-panelOffsets.left}px`,
              "--right-offset": `${panelOffsets.right}px`,
            } as CSSProperties
          }
        >
          <aside
            ref={leftPanelRef}
            className={styles.left}
            data-collapsed={panelOffsets.left === 196 || undefined}
            onPointerDown={(event) => slidePanel(event, "left")}
          >
            <div
              className={styles.panelEdge}
              data-side="left"
              role="separator"
              aria-label="调整左侧工作台"
              aria-orientation="vertical"
              aria-valuemin={24}
              aria-valuemax={220}
              aria-valuenow={220 - panelOffsets.left}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  setPanelOffsets((old) => ({
                    ...old,
                    left: event.key === "ArrowLeft" ? 196 : 0,
                  }));
                }
              }}
            />
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
                {[
                  ...(profile.data?.week_start === 0
                    ? "日一二三四五六"
                    : "一二三四五六日"),
                ].map((day) => (
                  <small key={day}>{day}</small>
                ))}
                {calendarDays.map((day, i) => {
                  const target = `${month.from.slice(0, 8)}${String(day).padStart(2, "0")}`;
                  return day !== null ? (
                    <CalendarDay
                      key={i}
                      date={target}
                      active={date === target}
                      count={state.assignments[target]?.length ?? 0}
                      colors={calendarNoteColors(state, target)}
                      onClick={() => setDate(target)}
                    />
                  ) : (
                    <span key={i} />
                  );
                })}
              </div>
            </section>
            <Warehouse>
              {(
                [
                  ["day", "当天训练计划", warehouse.day],
                  ["backup", "备选计划", warehouse.backup],
                ] as const
              ).map(([group, title, notes]) => (
                <WarehouseGroup key={group} group={group} title={title}>
                  <div
                    className={styles.warehouseList}
                    data-insert-end={
                      warehouseBefore === null && dragging ? true : undefined
                    }
                  >
                    {notes.map((note) => (
                      <WarehouseNote
                        key={note.id}
                        note={fitNoteToCanvas(
                          note,
                          canvasSize.width,
                          canvasSize.height,
                        )}
                        selected={selected === note.id}
                        insertBefore={warehouseBefore === note.id}
                        onSelect={() => focusNote(note.id)}
                        canCopy={state.notes.length < 30}
                        onCopy={() => update(copyWarehouseNote(state, note.id))}
                      />
                    ))}
                    {!notes.length && (
                      <p className={styles.warehouseEmpty}>拖入便签</p>
                    )}
                  </div>
                </WarehouseGroup>
              ))}
            </Warehouse>
            <Button
              className={styles.canvasNewNote}
              onClick={() => addNote()}
              disabled={!ready || state.notes.length >= 30}
            >
              <Plus />
              新建便签
            </Button>
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
                      compactDrag={outsideCanvas}
                      grabbed={grabbedNote === note.id}
                      onGrab={() => setGrabbedNote(note.id)}
                      overlayActive={outsideCanvas || raisedNote}
                      insertionIndex={
                        exerciseInsertion?.noteId === note.id
                          ? exerciseInsertion.index
                          : null
                      }
                      onChange={(changes) => changeNote(note.id, changes)}
                    />
                  ))}
              </Canvas>
              <NoteTrash
                key="trash-drop"
                active={Boolean(dragging && dragging.kind !== "exercise")}
              />
              <div className={styles.muscleAnchor}>
                <MuscleComposition
                  exercises={chosen?.exercises}
                  preferredFamily={
                    muscle === "all"
                      ? "全部"
                      : muscleFamily(
                          muscleOptions.find(
                            (option) => option.value === muscle,
                          )?.label ?? "其他",
                        )
                  }
                  editing={editing}
                />
              </div>
            </div>
          </section>
          <aside
            ref={libraryRef}
            className={styles.library}
            data-offset={panelOffsets.right > 0 || undefined}
            data-collapsed={panelOffsets.right === 226 || undefined}
            aria-label="动作搜索库"
            onPointerDown={(event) => slidePanel(event, "right")}
          >
            <div
              className={styles.panelEdge}
              data-side="right"
              role="separator"
              aria-label="调整右侧动作库"
              aria-orientation="vertical"
              aria-valuemin={24}
              aria-valuemax={250}
              aria-valuenow={250 - panelOffsets.right}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  setPanelOffsets((old) => ({
                    ...old,
                    right: event.key === "ArrowRight" ? 226 : 0,
                  }));
                }
              }}
            />
            <div className={styles.searchRow}>
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
            </div>
            <div className={styles.libraryFilters}>
              <LibraryFilterMenu
                label="所有设备"
                kind="devices"
                options={deviceOptions}
                value={device}
                onSelect={setDevice}
                open={openFilter === "devices"}
                onOpenChange={(open) =>
                  setOpenFilter((current) =>
                    open ? "devices" : current === "devices" ? null : current,
                  )
                }
              />
              <LibraryFilterMenu
                label="所有肌肉"
                kind="muscles"
                options={muscleOptions}
                value={muscle}
                onSelect={setMuscle}
                open={openFilter === "muscles"}
                onOpenChange={(open) =>
                  setOpenFilter((current) =>
                    open ? "muscles" : current === "muscles" ? null : current,
                  )
                }
              />
            </div>
            {muscle === "other" && (
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
                Hevy 公开动作目录读取失败，
                <button onClick={base.reload}>重试</button>
              </p>
            )}
            {catalog.error && (
              <p role="alert">
                个人动作读取失败，<button onClick={catalog.reload}>重试</button>
              </p>
            )}
            <div ref={exerciseList} className={styles.exerciseList}>
              {!isFiltered && sections.popular.length > 0 && (
                <section aria-label="热门运动">
                  <h3 className={styles.librarySectionTitle}>热门运动</h3>
                  {sections.popular.map((exercise) => (
                    <LibraryExercise
                      key={exercise.id}
                      exercise={exercise}
                      instance="popular"
                    />
                  ))}
                </section>
              )}
              <section aria-label={isFiltered ? "筛选结果" : "所有运动"}>
                <h3 className={styles.librarySectionTitle}>
                  {isFiltered ? "筛选结果" : "所有运动"}
                </h3>
                {sections.all.slice(0, visibleCount).map((exercise) => (
                  <LibraryExercise key={exercise.id} exercise={exercise} />
                ))}
              </section>
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
      <DragOverlay
        zIndex={300000}
        dropAnimation={null}
        modifiers={outsideCanvas ? [followNotePointer] : []}
        style={
          dragging && dragging.kind !== "exercise"
            ? dragging.kind === "note" &&
              !outsideCanvas &&
              dragStartRect.current
              ? {
                  width: dragStartRect.current.width,
                  height: dragStartRect.current.height,
                }
              : { width: previewSize.width, height: previewSize.minHeight }
            : undefined
        }
      >
        {dragging?.kind === "note" && raisedNote && !outsideCanvas ? (
          <FullNotePreview
            note={state.notes.find((note) => note.id === dragging.id)!}
          />
        ) : dragging && (dragging.kind !== "note" || outsideCanvas) ? (
          <div
            className={styles.dragPreview}
            data-kind={dragging.kind}
            data-note-color={
              dragging.kind !== "exercise"
                ? state.notes.find((n) => n.id === dragging.id)?.color
                : undefined
            }
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
                  {dragging.exercise.id?.startsWith("hevy:") ? " · Hevy" : ""}
                </small>
              )}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
function NoteColumnLabels({ note }: { note: PlanNote }) {
  const cardioOnly = note.exercises.every(isCardioExercise);
  const fields = [...new Map(note.exercises.flatMap((exercise) =>
    cardioFields(exercise.name)).map((field) => [field.key, field])).values()];
  return (
    <div className={styles.columnLabels}>
      <span />
      <span>动作</span>
      {cardioOnly ? (
        <div className={`${styles.cardioFields} ${styles.cardioColumnLabels}`}>
          {fields.map((field) => <span key={field.key}>{field.key === "minutes" ? "分钟" : `${field.label} ${field.unit}`}</span>)}
        </div>
      ) : <><span>组</span><span>次</span><span>kg</span></>}
    </div>
  );
}

function FullNotePreview({ note }: { note: PlanNote }) {
  return (
    <div
      className={`${styles.workbench} ${styles.fullNotePreview}`}
      aria-hidden
    >
      <article
        className={styles.note}
        data-note-color={note.color}
        style={{
          position: "relative",
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <header>
          <button className={styles.notePin} tabIndex={-1}>
            <Pin />
          </button>
          <input
            readOnly
            tabIndex={-1}
            value={note.title === "未命名计划" ? "" : note.title}
            placeholder="未命名计划"
          />
          <NoteColorPicker color={note.color} onChange={() => {}} />
        </header>
        <div className={styles.noteBody}>
          {note.exercises.length ? (
            <>
              <NoteColumnLabels note={note} />
              {note.exercises.map((exercise) => (
                <div className={styles.exercise} key={exercise.id}>
                  <span aria-hidden />
                  <span
                    style={
                      isBenchExercise(exercise)
                        ? { gridColumn: "2 / -1" }
                        : undefined
                    }
                  >
                    {exercise.name}
                  </span>
                  {isCardioExercise(exercise) ? (
                    <div className={styles.cardioFields}>
                      {cardioFields(exercise.name).map((field) => (
                        <label key={field.key}>
                          <span hidden={note.exercises.every(isCardioExercise)}>{field.label} · {field.unit}</span>
                          <input readOnly value={exercise.cardio?.[field.key] ?? ""} placeholder="—" />
                        </label>
                      ))}
                    </div>
                  ) : !isBenchExercise(exercise) &&
                    (["sets", "reps", "weight"] as const).map((field) => (
                      <input
                        key={field}
                        readOnly
                        value={exercise[field] ?? ""}
                        placeholder="—"
                      />
                    ))}
                </div>
              ))}
            </>
          ) : (
            <div className={styles.noteEmpty}>
              <Plus />
              <p>将动作拖到这里</p>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
function NoteTrash({ active }: { active: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "note-trash" });
  const trashNode = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const startRect = useRef<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  } | null>(null);
  useDndMonitor({
    onDragStart(event) {
      const move = event.active.data.current as Move;
      const note =
        move.kind === "note"
          ? [...document.querySelectorAll<HTMLElement>("[data-note-id]")].find(
              (node) => node.dataset.noteId === move.id,
            )
          : null;
      startRect.current =
        note?.getBoundingClientRect() ?? event.active.rect.current.initial;
    },
    onDragMove(event) {
      const initial = startRect.current;
      const card = initial
        ? {
            left: initial.left + event.delta.x,
            right: initial.right + event.delta.x,
            top: initial.top + event.delta.y,
            bottom: initial.bottom + event.delta.y,
          }
        : null;
      const target = trashNode.current?.getBoundingClientRect();
      setNear(
        Boolean(
          card &&
          target &&
          event.active.data.current?.kind !== "exercise" &&
          nearTrashEdge(card, target),
        ),
      );
    },
    onDragEnd() {
      setNear(false);
    },
    onDragCancel() {
      setNear(false);
    },
  });
  return (
    <div
      ref={(node) => {
        trashNode.current = node;
        setNodeRef(node);
      }}
      className={styles.noteTrash}
      aria-hidden={!active}
      data-active={active || undefined}
      data-over={(active && (isOver || near)) || undefined}
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
function WarehouseGroup({
  group,
  title,
  children,
}: {
  group: "day" | "backup";
  title: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `warehouse-group:${group}`,
    data: { warehouseGroup: group },
  });
  return (
    <section
      ref={setNodeRef}
      className={styles.warehouseGroup}
      data-warehouse-group={group}
      data-over={isOver || undefined}
      aria-label={title}
    >
      <h3>{title}</h3>
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
  colors,
  onClick,
}: {
  date: string;
  active: boolean;
  count: number;
  colors: string[];
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
      aria-current={date === today() ? "date" : undefined}
      data-has-plans={count > 0 || undefined}
      style={
        colors.length
          ? ({
              "--plan-background": `linear-gradient(135deg, ${colors.flatMap((color, i) => [`${color}44 ${(i * 100) / colors.length}%`, `${color}44 ${((i + 1) * 100) / colors.length}%`]).join(", ")})`,
            } as CSSProperties)
          : undefined
      }
      data-over={isOver || undefined}
      onClick={onClick}
    >
      {Number(date.slice(-2))}
    </button>
  );
}
function WarehouseNote({
  note,
  selected,
  insertBefore,
  onSelect,
  onCopy,
  canCopy,
}: {
  note: PlanNote;
  selected: boolean;
  insertBefore: boolean;
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
      data-warehouse-id={note.id}
      data-insert-before={insertBefore || undefined}
      data-warehouse-note
      data-note-color={note.color}
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
  instance = "all",
}: {
  instance?: string;
  exercise: { id: string; name: string; muscle_group: string };
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `exercise:${instance}:${exercise.id}`,
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
            {exercise.id.startsWith("hevy:") ? " · Hevy" : ""}
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
  compactDrag,
  grabbed,
  onGrab,
  overlayActive,
  insertionIndex,
}: {
  note: PlanNote;
  selected: boolean;
  onSelect: () => void;
  onChange: (value: Partial<PlanNote>) => void;
  libraryRef: RefObject<HTMLElement | null>;
  compactDrag: boolean;
  grabbed: boolean;
  onGrab: () => void;
  overlayActive: boolean;
  insertionIndex: number | null;
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
      data-note-id={note.id}
      data-grabbed={grabbed || drag.isDragging || undefined}
      data-note-color={note.color}
      data-selected={selected}
      data-over={isOver || undefined}
      onPointerDown={onSelect}
      onPointerDownCapture={(event) => {
        if (
          event.button === 0 &&
          !(event.target as HTMLElement).closest(
            'input,button,a,select,textarea,[role="listitem"]',
          )
        )
          onGrab();
      }}
      onFocus={onSelect}
      style={{
        left: size?.x ?? note.x,
        top: size?.y ?? note.y,
        width: size?.width ?? note.width,
        height: size?.height ?? note.height,
        zIndex: grabbed ? 300001 : note.z + 2 + (note.pinned ? 100000 : 0),
        opacity: drag.isDragging && overlayActive ? 0 : 1,
        transform:
          drag.isDragging && !compactDrag && drag.transform
            ? `translate3d(${drag.transform.x}px, ${drag.transform.y}px, 0)`
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
        <button
          className={styles.notePin}
          aria-label="置顶便签"
          aria-pressed={note.pinned}
          onClick={() => onChange({ pinned: !note.pinned })}
        >
          <Pin />
        </button>
        <input
          aria-label="便签名称"
          value={note.title === "未命名计划" ? "" : note.title}
          placeholder="未命名计划"
          maxLength={60}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <NoteColorPicker
          color={note.color}
          onChange={(color) => onChange({ color })}
        />
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
            <NoteColumnLabels note={note} />
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
                {note.exercises.map((exercise, index) => (
                  <SortableItem
                    className={styles.exercise}
                    key={exercise.id}
                    value={exercise.id}
                    role="listitem"
                    data-exercise-row={exercise.id}
                    data-insert-before={insertionIndex === index || undefined}
                    data-insert-after={
                      (insertionIndex === note.exercises.length &&
                        index === note.exercises.length - 1) ||
                      undefined
                    }
                  >
                    {isCardioExercise(exercise) ? (
                      <>
                        <span aria-hidden />
                        <span title={exercise.name}>{exercise.name}</span>
                        <div className={styles.cardioFields}>
                          {cardioFields(exercise.name).map((field) => (
                            <label key={field.key}>
                              <span hidden={note.exercises.every(isCardioExercise)}>{field.label} · {field.unit}</span>
                              <input type="number" min={0} max={field.max} step={0.1}
                                aria-label={`${exercise.name}${field.label}（${field.unit}）`}
                                placeholder="—" value={exercise.cardio?.[field.key] ?? ""}
                                onChange={(event) => {
                                  const value = event.target.value === "" ? null : Number(event.target.value);
                                  if (value !== null && (!Number.isFinite(value) || value < 0 || value > field.max)) return;
                                  onChange({ exercises: note.exercises.map((item) => item.id === exercise.id
                                    ? { ...item, cardio: { ...item.cardio, [field.key]: value } } : item) });
                                }} />
                            </label>
                          ))}
                        </div>
                      </>
                    ) : isBenchExercise(exercise) ? (
                      <BenchExerciseFields
                        exercise={exercise}
                        onChange={(next) =>
                          onChange({
                            exercises: note.exercises.map((v) =>
                              v.id === exercise.id ? next : v,
                            ),
                          })
                        }
                      />
                    ) : (
                      <>
                        <span aria-hidden />
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
                                  (field !== "weight" &&
                                    !Number.isInteger(value)))
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
                      </>
                    )}
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

function NoteColorPicker({
  color,
  onChange,
}: {
  color: PlanNote["color"];
  onChange: (color: NonNullable<PlanNote["color"]>) => void;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  };
  useEffect(
    () => () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    },
    [],
  );
  useLayoutEffect(() => {
    const panel = menu.current;
    if (!panel) return;
    if (open && trigger.current) {
      const bounds = trigger.current.getBoundingClientRect();
      panel.style.left = `${Math.max(8, Math.min(bounds.left - 72, window.innerWidth - 204))}px`;
      panel.style.top = `${Math.max(8, bounds.top - 88)}px`;
      if (!panel.matches(":popover-open")) panel.showPopover();
    } else {
      const closing = window.setTimeout(() => {
        if (panel.matches(":popover-open")) panel.hidePopover();
      }, 260);
      return () => window.clearTimeout(closing);
    }
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!trigger.current?.parentElement?.contains(event.target as Node))
        setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  return (
    <div
      className={styles.noteColorCorner}
      data-open={open || undefined}
      onPointerEnter={(event) => {
        cancelLeave();
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "mouse" &&
          !event.currentTarget.contains(document.activeElement)
        )
          leaveTimer.current = setTimeout(() => setOpen(false), 150);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          trigger.current?.focus();
          setOpen(false);
        }
      }}
    >
      <div
        ref={menu}
        id={id}
        popover="manual"
        className={styles.noteColorMenu}
        role="group"
        aria-label="便签颜色"
        aria-hidden={!open}
        inert={!open}
      >
        {(
          [
            ["red", "红色", -24, 36],
            ["green", "绿色", 8, 36],
            ["yellow", "黄色", 36, 8],
            ["blue", "蓝色", 36, -24],
          ] as const
        ).map(([value, label, x, y], index) => (
          <button
            key={value}
            data-note-color={value}
            aria-label={label}
            aria-pressed={color === value}
            style={
              {
                "--color-x": `${x}px`,
                "--color-y": `${y}px`,
                "--color-index": index,
              } as CSSProperties
            }
            onClick={() => {
              onChange(value);
              trigger.current?.focus();
              setOpen(false);
            }}
          />
        ))}
      </div>
      <button
        ref={trigger}
        className={styles.noteColorTrigger}
        aria-label="选择便签颜色"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(true)}
      >
        <span className={styles.colorWheel} aria-hidden="true" />
      </button>
    </div>
  );
}
