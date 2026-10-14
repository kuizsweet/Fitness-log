import { z } from "zod";
import { dateSchema, modes, unitSchema, type Weight } from "../domain";

export const fields = [
  "date",
  "exercise",
  "equipment",
  "weight",
  "reps",
  "sets",
  "notes",
  "role",
  "kind",
] as const;
export type Field = (typeof fields)[number];
export type Mapping = Partial<Record<Field, number>>;
export type Sheet = {
  name: string;
  rows: { line: number; cells: string[] }[];
  header: number;
  mapping: Mapping;
};
export type ImageNotice = { sheet: string; anchor: string; reason: string };
export type Workbook = {
  sheets: Sheet[];
  images: ImageNotice[];
  warnings: string[];
};
export const importRowSchema = z.object({
  source: z.string().max(240),
  date: dateSchema,
  exercise: z.string().trim().min(1).max(120),
  equipment: z.string().max(120),
  weight: z.number().finite().nonnegative().max(10000).nullable(),
  unit: unitSchema,
  mode: z.enum(modes).refine((v) => v !== "unknown", "请确认重量含义"),
  reps: z.number().int().min(0).max(1000),
  sets: z.number().int().min(1).max(100),
  notes: z.string().max(2000),
  role: z.enum(["warmup", "work", "supplement"]),
  kind: z.enum(["actual", "planned"]),
  tags: z.array(z.string().max(60)).max(12),
});
export type ImportRow = z.infer<typeof importRowSchema>;
export type Candidate = Omit<ImportRow, "mode" | "date" | "kind" | "reps"> & {
  date: string;
  mode: Weight["mode"];
  kind: "actual" | "planned" | "unknown";
  reps: number | null;
  needs_weight_review: boolean;
  errors: string[];
  include: boolean;
};
export const aliases: Record<Field, string[]> = {
  date: ["日期", "训练日期", "date"],
  exercise: ["动作", "项目", "运动", "exercise"],
  equipment: ["器材", "设备", "equipment"],
  weight: ["重量", "负重", "训练内容", "实际完成", "weight"],
  reps: ["次数", "每组次数", "reps"],
  sets: ["组数", "sets"],
  notes: ["备注", "说明", "notes"],
  role: ["组别", "角色", "role"],
  kind: ["计划实际", "记录类型", "kind"],
};

export function parseExpression(input: string): {
  weight: number;
  unit: "kg" | "lb";
  reps: number | null;
  sets: number | null;
} | null {
  const s = input
    .trim()
    .toLowerCase()
    .replaceAll("公斤", "kg")
    .replaceAll("千克", "kg")
    .replaceAll("磅", "lb");
  let match = s.match(
    /^(\d+(?:\.\d+)?)\s*(kg|lb)?\s*[×x*]\s*(\d+)\s*组\s*[×x*]\s*(\d+)\s*次?$/,
  );
  if (match)
    return {
      weight: Number(match[1]),
      unit: match[2] === "lb" ? "lb" : "kg",
      sets: Number(match[3]),
      reps: Number(match[4]),
    };
  match = s.match(/^(\d+(?:\.\d+)?)\s*(kg|lb)?\s*[×x*]\s*(\d+)\s*次?$/);
  if (match)
    return {
      weight: Number(match[1]),
      unit: match[2] === "lb" ? "lb" : "kg",
      reps: Number(match[3]),
      sets: 1,
    };
  match = s.match(/^(\d+(?:\.\d+)?)\s*(kg|lb)?$/);
  return match
    ? {
        weight: Number(match[1]),
        unit: match[2] === "lb" ? "lb" : "kg",
        reps: null,
        sets: null,
      }
    : null;
}
export function parseDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})[年/.-](\d{1,2})[月/.-](\d{1,2})日?$/);
  if (!m) return null;
  const d = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return dateSchema.safeParse(d).success ? d : null;
}
export function mapSheet(
  sheet: Sheet,
  mapping: Mapping,
  header: number,
  defaultMode: Weight["mode"] = "unknown",
  defaultKind: Candidate["kind"] = "unknown",
): Candidate[] {
  let date = "";
  const result: Candidate[] = [];
  for (const row of sheet.rows.filter((r) => r.line > header)) {
    const get = (field: Field) =>
      mapping[field] === undefined
        ? ""
        : (row.cells[mapping[field]!] ?? "").trim();
    const rowDate = parseDate(get("date"));
    if (rowDate) date = rowDate;
    else if (get("date")) date = ""; // Never carry a prior date across an invalid date marker.
    const exercise = get("exercise");
    if (!exercise && !get("weight") && !get("reps")) continue;
    const expression = parseExpression(get("weight"));
    const reps = get("reps")
      ? Number(get("reps").replace(/次$/, ""))
      : (expression?.reps ?? NaN);
    const sets = get("sets")
      ? Number(get("sets").replace(/组$/, ""))
      : (expression?.sets ?? 1);
    const role = /热身/.test(get("role"))
      ? "warmup"
      : /补充/.test(get("role"))
        ? "supplement"
        : "work";
    const kind = /计划|目标/.test(get("kind"))
      ? "planned"
      : /实际|完成/.test(get("kind"))
        ? "actual"
        : defaultKind;
    const candidate: Candidate = {
      source: `${sheet.name}:${row.line}`,
      date,
      exercise,
      equipment: get("equipment"),
      weight: expression?.weight ?? null,
      unit: expression?.unit ?? "kg",
      mode: defaultMode,
      reps: Number.isFinite(reps) ? reps : null,
      needs_weight_review: !expression && Boolean(get("weight")),
      sets,
      notes: get("notes"),
      role,
      kind,
      tags: [],
      errors: [],
      include: true,
    };
    if (!date) candidate.errors.push("日期无法识别，需填写完整年月日");
    if (!exercise) candidate.errors.push("缺少动作名称");
    if (!expression && get("weight")) candidate.errors.push("重量表达无法识别");
    if (!Number.isFinite(reps)) candidate.errors.push("缺少次数");
    if (!Number.isInteger(sets) || sets < 1 || sets > 100)
      candidate.errors.push("组数无效");
    if (defaultMode === "unknown") candidate.errors.push("重量含义尚未确认");
    if (kind === "unknown") candidate.errors.push("计划/实际尚未确认");
    if (defaultMode === "per_side")
      candidate.errors.push(
        "单列重量无法可靠表示左右及初始重量，请改用“总装载质量”或排除此行后手动记录",
      );
    result.push(candidate);
  }
  return result;
}
