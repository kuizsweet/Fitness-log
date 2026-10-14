"use client";
import type { Candidate } from "@/lib/import/parser";
import { modes, modeNames } from "@/lib/domain";
export function ImportPreview({
  rows,
  change,
}: {
  rows: Candidate[];
  change: (index: number, row: Candidate) => void;
}) {
  return (
    <div className="scroll">
      <table>
        <thead>
          <tr>
            <th>导入</th>
            <th>来源 / 待核对</th>
            <th>日期</th>
            <th>动作 / 器材</th>
            <th>重量 / 含义</th>
            <th>组数 / 次数</th>
            <th>角色 / 类型</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={`${row.source}:${i}`}>
              <td>
                <label>
                  <input
                    type="checkbox"
                    checked={row.include}
                    onChange={(e) =>
                      change(i, { ...row, include: e.target.checked })
                    }
                  />
                  包括
                </label>
              </td>
              <td>
                {row.source}
                {row.errors.length > 0 && (
                  <p className="error">{row.errors.join("；")}</p>
                )}
              </td>
              <td>
                <input
                  aria-label={`${row.source} 日期`}
                  type="date"
                  value={row.date}
                  onChange={(e) => change(i, { ...row, date: e.target.value })}
                />
              </td>
              <td>
                <input
                  aria-label={`${row.source} 动作`}
                  value={row.exercise}
                  onChange={(e) =>
                    change(i, { ...row, exercise: e.target.value })
                  }
                />
                <input
                  aria-label={`${row.source} 器材`}
                  value={row.equipment}
                  onChange={(e) =>
                    change(i, { ...row, equipment: e.target.value })
                  }
                />
              </td>
              <td>
                <input
                  aria-label={`${row.source} 重量`}
                  type="number"
                  min="0"
                  step="0.25"
                  inputMode="decimal"
                  value={row.weight ?? ""}
                  onChange={(e) =>
                    change(i, {
                      ...row,
                      weight:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
                <select
                  aria-label={`${row.source} 单位`}
                  value={row.unit}
                  onChange={(e) =>
                    change(i, {
                      ...row,
                      unit: e.target.value as Candidate["unit"],
                    })
                  }
                >
                  <option>kg</option>
                  <option>lb</option>
                </select>
                <select
                  aria-label={`${row.source} 重量含义`}
                  value={row.mode}
                  onChange={(e) =>
                    change(i, {
                      ...row,
                      mode: e.target.value as Candidate["mode"],
                    })
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
              </td>
              <td>
                <label>
                  组数
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={row.sets}
                    onChange={(e) =>
                      change(i, { ...row, sets: Number(e.target.value) })
                    }
                  />
                </label>
                <label>
                  次数
                  <input
                    type="number"
                    min="0"
                    max="1000"
                    step="1"
                    value={row.reps ?? ""}
                    onChange={(e) =>
                      change(i, {
                        ...row,
                        reps:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </td>
              <td>
                <select
                  aria-label={`${row.source} 角色`}
                  value={row.role}
                  onChange={(e) =>
                    change(i, {
                      ...row,
                      role: e.target.value as Candidate["role"],
                    })
                  }
                >
                  <option value="warmup">热身</option>
                  <option value="work">正式</option>
                  <option value="supplement">补充</option>
                </select>
                <select
                  aria-label={`${row.source} 记录类型`}
                  value={row.kind}
                  onChange={(e) =>
                    change(i, {
                      ...row,
                      kind: e.target.value as Candidate["kind"],
                    })
                  }
                >
                  <option value="unknown">未确认</option>
                  <option value="actual">实际</option>
                  <option value="planned">计划</option>
                </select>
              </td>
              <td>
                <textarea
                  aria-label={`${row.source} 备注`}
                  value={row.notes}
                  onChange={(e) => change(i, { ...row, notes: e.target.value })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
