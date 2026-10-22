"use client";
import { useState } from "react";
import { ChevronDown, Copy } from "lucide-react";
import {
  benchGroups,
  copyExerciseGroup,
  type PlanExercise,
  type ExerciseGroup,
} from "@/lib/training-workbench";
import {
  Sortable,
  SortableContent,
  SortableItem,
  SortableItemHandle,
} from "../ui/sortable";
import styles from "./TrainingWorkbench.module.css";
const names = { warmup: "热身组", working: "正式组", backoff: "回退组" };
export function BenchExerciseFields({
  exercise,
  onChange,
}: {
  exercise: PlanExercise;
  onChange: (exercise: PlanExercise) => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = benchGroups(exercise);
  function update(groups: ExerciseGroup[]) {
    onChange({ ...exercise, groups, sets: null, reps: null, weight: null });
  }
  return (
    <>
      <button
        className={styles.benchHeading}
        aria-expanded={open}
        aria-controls={`groups-${exercise.id}`}
        onClick={() => setOpen(!open)}
      >
        <ChevronDown aria-hidden data-open={open || undefined} />
        <span>{exercise.name}</span>
      </button>
      {open && (
        <div className={styles.benchChildren} id={`groups-${exercise.id}`}>
          <Sortable
            value={groups}
            getItemValue={(g) => g.id}
            onValueChange={update}
            orientation="vertical"
            autoScroll={false}
          >
            <SortableContent
              role="list"
              aria-label={`${exercise.name}子词条排序`}
            >
              {groups.map((group, index) => (
                <SortableItem
                  key={group.id}
                  value={group.id}
                  role="listitem"
                  className={styles.benchGroup}
                >
                  <span className={styles.groupBranch} aria-hidden></span>
                  <div className={styles.groupName}>
                    <SortableItemHandle
                      className={styles.groupLabel}
                      aria-label={`排序${names[group.kind]} ${index + 1}`}
                    >
                      {names[group.kind]}
                    </SortableItemHandle>
                    <button
                      aria-label={`复制${names[group.kind]} ${index + 1}`}
                      title={`复制${names[group.kind]}`}
                      onClick={() =>
                        update(copyExerciseGroup(groups, group.id))
                      }
                    >
                      <Copy aria-hidden />
                    </button>
                  </div>
                  {(["sets", "reps", "weight"] as const).map((field) => (
                    <input
                      key={field}
                      type="number"
                      min={0}
                      max={field === "weight" ? 10000 : 1000}
                      step={field === "weight" ? 0.5 : 1}
                      placeholder="—"
                      aria-label={`${exercise.name}${names[group.kind]} ${index + 1}${field === "sets" ? "组数" : field === "reps" ? "次数" : "重量"}`}
                      value={group[field] ?? ""}
                      onChange={(event) => {
                        const value =
                          event.target.value === ""
                            ? null
                            : Number(event.target.value);
                        if (
                          value !== null &&
                          (!Number.isFinite(value) ||
                            value < 0 ||
                            value > (field === "weight" ? 10000 : 1000) ||
                            (field !== "weight" && !Number.isInteger(value)))
                        )
                          return;
                        update(
                          groups.map((g) =>
                            g.id === group.id ? { ...g, [field]: value } : g,
                          ),
                        );
                      }}
                    />
                  ))}
                </SortableItem>
              ))}
            </SortableContent>
          </Sortable>
        </div>
      )}
    </>
  );
}
