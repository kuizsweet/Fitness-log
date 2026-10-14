import type { Session } from "./domain";
import { weightText } from "./domain";
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}
export function exportCsv(sessions: Session[]): string {
  const rows: unknown[][] = [
    [
      "日期",
      "训练ID",
      "状态",
      "动作",
      "肌群",
      "器材",
      "组序号",
      "角色",
      "标记",
      "实际重量含义",
      "计划重量含义",
      "次数",
      "完成",
      "RIR",
      "RPE",
      "休息秒数",
      "备注",
    ],
  ];
  sessions.forEach((s) =>
    s.exercises.forEach((e) =>
      e.sets.forEach((st, i) =>
        rows.push([
          s.training_date,
          s.id,
          s.status,
          e.exercise_name,
          e.muscle_group,
          e.equipment_snapshot?.name,
          i + 1,
          st.role,
          st.tags.join("|"),
          weightText(st.weight),
          st.planned_weight ? weightText(st.planned_weight) : "",
          st.reps,
          st.completed,
          st.rir,
          st.rpe,
          st.rest_seconds,
          st.notes,
        ]),
      ),
    ),
  );
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
