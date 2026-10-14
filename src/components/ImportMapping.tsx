"use client";
import {
  fields,
  type Sheet,
  type Mapping,
  type Field,
  type Candidate,
} from "@/lib/import/parser";
import { modes, modeNames, type Weight } from "@/lib/domain";
export type SheetConfig = {
  mapping: Mapping;
  header: number;
  mode: Weight["mode"];
  kind: Candidate["kind"];
};
const names: Record<Field, string> = {
  date: "日期",
  exercise: "动作",
  equipment: "器材",
  weight: "重量 / 表达式",
  reps: "次数",
  sets: "组数",
  notes: "备注",
  role: "组别角色",
  kind: "计划 / 实际",
};
export function ImportMapping({
  sheet,
  config,
  change,
}: {
  sheet: Sheet;
  config: SheetConfig;
  change: (config: SheetConfig) => void;
}) {
  return (
    <details open>
      <summary>{sheet.name} · 字段映射</summary>
      <div className="row">
        <label>
          数据从此行之后开始
          <input
            type="number"
            min="0"
            max="5000"
            value={config.header}
            onChange={(e) =>
              change({ ...config, header: Number(e.target.value) })
            }
          />
        </label>
        <label>
          本表默认重量含义
          <select
            value={config.mode}
            onChange={(e) =>
              change({ ...config, mode: e.target.value as Weight["mode"] })
            }
          >
            {modes
              .filter((m) => m !== "per_side")
              .map((m) => (
                <option key={m} value={m}>
                  {modeNames[m]}
                </option>
              ))}
          </select>
        </label>
        <label>
          本表默认记录类型
          <select
            value={config.kind}
            onChange={(e) =>
              change({ ...config, kind: e.target.value as Candidate["kind"] })
            }
          >
            <option value="unknown">未确认</option>
            <option value="actual">实际完成</option>
            <option value="planned">计划</option>
          </select>
        </label>
      </div>
      <div className="row">
        {fields.map((field) => (
          <label key={field}>
            {names[field]}
            <select
              value={config.mapping[field] ?? ""}
              onChange={(e) =>
                change({
                  ...config,
                  mapping: {
                    ...config.mapping,
                    [field]:
                      e.target.value === ""
                        ? undefined
                        : Number(e.target.value),
                  },
                })
              }
            >
              <option value="">不映射</option>
              {Array.from(
                {
                  length: Math.max(0, ...sheet.rows.map((r) => r.cells.length)),
                },
                (_, i) => (
                  <option key={i} value={i}>
                    第 {i + 1} 列 ·{" "}
                    {sheet.rows.find((r) => r.line === config.header)?.cells[
                      i
                    ] ?? ""}
                  </option>
                ),
              )}
            </select>
          </label>
        ))}
      </div>
      <details>
        <summary>原始行（前 15 行）</summary>
        <div className="scroll">
          <table>
            <tbody>
              {sheet.rows.slice(0, 15).map((r) => (
                <tr key={r.line}>
                  <th>{r.line}</th>
                  {r.cells.map((c, i) => (
                    <td key={i}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </details>
  );
}
