"use client";
import {
  modeNames,
  modes,
  totalWeight,
  type Weight,
  type Equipment,
} from "@/lib/domain";
export function WeightInput({
  value: w,
  onChange,
  equipment,
  label = "实际重量",
}: {
  value: Weight;
  onChange: (w: Weight) => void;
  equipment?: Equipment | null;
  label?: string;
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
      <div className="row">
        {w.mode === "per_side" ? (
          <>
            {number("left", "左侧挂片")}
            {number("right", "右侧挂片")}
            {number("base", "杆重 / 初始质量（未知留空）")}
          </>
        ) : w.mode === "display" && equipment?.increments.length ? (
          <label>
            显示档位
            <select
              value={w.value ?? ""}
              onChange={(e) =>
                onChange({
                  ...w,
                  value: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            >
              <option value="">未填写</option>
              {[
                ...new Set([
                  ...equipment.increments,
                  ...(w.value !== null ? [w.value] : []),
                ]),
              ]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
            </select>
          </label>
        ) : (
          number("value", "重量（未知留空）")
        )}
      </div>
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
