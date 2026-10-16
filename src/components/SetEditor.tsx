"use client";
import { useState, useId } from "react";
import type { WorkoutSet, Equipment } from "@/lib/domain";
import { emptyWeight } from "@/lib/domain";
import { WeightInput } from "./WeightInput";
import { shortWeight } from "@/lib/training";
import styles from "./Training.module.css";
export function SetEditor({
  set,
  index,
  equipment,
  change,
  move,
  remove,
  last,
  previous,
  onComplete,
}: {
  set: WorkoutSet;
  index: number;
  equipment: Equipment | null;
  change: (s: WorkoutSet) => void;
  move: (step: number) => void;
  remove: () => void;
  last: boolean;
  previous?: WorkoutSet;
  onComplete?: (id: string, completed: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailId = useId();
  function number(
    key: "rir" | "rpe" | "rest_seconds",
    title: string,
    max: number,
  ) {
    return (
      <label>
        {title}
        <input
          type="number"
          min="0"
          max={max}
          step={key === "rest_seconds" ? 1 : 0.5}
          inputMode="decimal"
          value={set[key] ?? ""}
          onChange={(e) =>
            change({
              ...set,
              [key]: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </label>
    );
  }
  return (
    <tbody>
      <tr className={set.completed ? styles.done : undefined}>
        <td>
          <span
            title={
              { warmup: "热身组", work: "正式组", supplement: "补充组" }[
                set.role
              ]
            }
          >
            {set.role === "warmup"
              ? "W"
              : set.role === "supplement"
                ? "S"
                : index + 1}
          </span>
        </td>
        <td className={styles.previous}>
          {previous
            ? `${shortWeight(previous.weight)} × ${previous.reps}`
            : "—"}
        </td>
        <td>
          <WeightInput
            compact
            label={`第 ${index + 1} 组重量`}
            value={set.weight}
            equipment={equipment}
            onChange={(weight) => change({ ...set, weight })}
          />
        </td>
        <td>
          <input
            aria-label={`第 ${index + 1} 组次数`}
            type="number"
            min="0"
            max="1000"
            step="1"
            inputMode="numeric"
            value={set.reps}
            onChange={(e) => change({ ...set, reps: Number(e.target.value) })}
          />
        </td>
        <td className={styles.complete}>
          <input
            type="checkbox"
            aria-label={`完成第 ${index + 1} 组`}
            checked={set.completed}
            onChange={(e) => {
              change({
                ...set,
                completed: e.target.checked,
                completed_at: e.target.checked
                  ? new Date().toISOString()
                  : null,
              });
              onComplete?.(set.id, e.target.checked);
            }}
          />
        </td>
        <td>
          <button
            className={styles.more}
            aria-label={`第 ${index + 1} 组更多设置`}
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => setExpanded(!expanded)}
          >
            •••
          </button>
        </td>
      </tr>
      <tr hidden={!expanded} id={detailId}>
        <td colSpan={6}>
          <div className={styles.setDetail}>
            <div className="row">
              <label>
                组别角色
                <select
                  value={set.role}
                  onChange={(e) =>
                    change({
                      ...set,
                      role: e.target.value as WorkoutSet["role"],
                    })
                  }
                >
                  <option value="warmup">热身组</option>
                  <option value="work">正式组</option>
                  <option value="supplement">补充组</option>
                </select>
              </label>
            </div>
            <WeightInput
              value={set.weight}
              equipment={equipment}
              onChange={(weight) => change({ ...set, weight })}
            />
            <details>
              <summary>附加标记、计划及备注</summary>
              <div className="row">
                {["递增热身", "新重量挑战", "力竭"].map((tag) => (
                  <label key={tag}>
                    <input
                      type="checkbox"
                      checked={set.tags.includes(tag)}
                      onChange={(e) =>
                        change({
                          ...set,
                          tags: e.target.checked
                            ? [...set.tags, tag]
                            : set.tags.filter((t) => t !== tag),
                        })
                      }
                    />
                    {tag}
                  </label>
                ))}
              </div>
              <label>
                自定义标记（用逗号分隔）
                <input
                  value={set.tags
                    .filter(
                      (t) => !["递增热身", "新重量挑战", "力竭"].includes(t),
                    )
                    .join(",")}
                  onChange={(e) =>
                    change({
                      ...set,
                      tags: [
                        ...set.tags.filter((t) =>
                          ["递增热身", "新重量挑战", "力竭"].includes(t),
                        ),
                        ...e.target.value
                          .split(/[,，]/)
                          .map((s) => s.trim())
                          .filter(Boolean),
                      ],
                    })
                  }
                />
              </label>
              <label>
                组内备注
                <textarea
                  value={set.notes}
                  onChange={(e) => change({ ...set, notes: e.target.value })}
                />
              </label>
              <div className="row">
                {number("rir", "RIR（可选）", 10)}
                {number("rpe", "RPE（可选）", 10)}
                {number("rest_seconds", "实际休息秒数（可选）", 86400)}
              </div>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(set.planned_weight)}
                  onChange={(e) =>
                    change({
                      ...set,
                      planned_weight: e.target.checked
                        ? emptyWeight(set.weight.unit, set.weight.mode)
                        : null,
                    })
                  }
                />
                记录计划重量
              </label>
              {set.planned_weight && (
                <WeightInput
                  label="计划重量"
                  value={set.planned_weight}
                  equipment={equipment}
                  onChange={(planned_weight) =>
                    change({ ...set, planned_weight })
                  }
                />
              )}
            </details>
            <div className="row">
              <button disabled={index === 0} onClick={() => move(-1)}>
                上移
              </button>
              <button disabled={last} onClick={() => move(1)}>
                下移
              </button>
              <button onClick={remove}>删除组</button>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  );
}
