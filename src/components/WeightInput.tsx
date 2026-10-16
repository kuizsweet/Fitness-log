"use client";
import {
  modeNames,
  modes,
  totalWeight,
  type Weight,
  type Equipment,
} from "@/lib/domain";
import styles from "./Training.module.css";
export function WeightInput({
  value: w,
  onChange,
  equipment,
  label = "实际重量",
  compact = false,
}: {
  value: Weight;
  onChange: (w: Weight) => void;
  equipment?: Equipment | null;
  label?: string;
  compact?: boolean;
}) {
  const number = (key: "value" | "left" | "right" | "base", title: string) => (
    <label>
      {title}
      <input
        type="number"
        min="0"
        max="10000"
        step="0.25"
        inputMode="decimal"
        value={w[key] ?? ""}
        onChange={(e) =>
          onChange({
            ...w,
            [key]: e.target.value === "" ? null : Number(e.target.value),
          })
        }
      />
    </label>
  );
  const values = (
    <div className={compact ? styles.weight : "row"}>
      {w.mode === "bodyweight" && compact ? (
        <span>自重</span>
      ) : w.mode === "per_side" ? (
        <>
          {number("left", "左侧")}
          {number("right", "右侧")}
          {number("base", "杆重")}
        </>
      ) : w.mode === "display" && equipment?.increments.length ? (
        <label>
          显示档位
          <select
            aria-label={label + "显示档位"}
            value={w.value ?? ""}
            onChange={(e) =>
              onChange({
                ...w,
                value: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          >
            <option value="">—</option>
            {[
              ...new Set([
                ...equipment.increments,
                ...(w.value !== null ? [w.value] : []),
              ]),
            ]
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n}>{n}</option>
              ))}
          </select>
        </label>
      ) : (
        number("value", compact ? w.unit : "重量（未知留空）")
      )}
    </div>
  );
  if (compact) return values;
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className="row">
        <label>
          计量含义
          <select
            value={w.mode}
            onChange={(e) =>
              onChange({
                ...w,
                mode: e.target.value as Weight["mode"],
                value: null,
                left: null,
                right: null,
              })
            }
          >
            {modes.map((m) => (
              <option key={m} value={m}>
                {modeNames[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          单位
          <select
            value={w.unit}
            onChange={(e) =>
              onChange({ ...w, unit: e.target.value as Weight["unit"] })
            }
          >
            <option>kg</option>
            <option>lb</option>
          </select>
        </label>
      </div>
      {values}
      {w.mode === "per_side" && (
        <p>
          装载总质量：{totalWeight(w) ?? "未知（初始质量或侧重未填写）"}{" "}
          {w.unit}。这不是器械实际阻力。
        </p>
      )}
      {w.mode === "single" && <small>记录单只哑铃重量。</small>}
      {w.mode === "assistance" && (
        <small>记录辅助重量，不推算实际举起重量。</small>
      )}
      {w.mode === "unknown" && (
        <p className="error">重量含义未确认；请选明确的计量规则。</p>
      )}
    </fieldset>
  );
}
