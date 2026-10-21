import popular from "@/data/hevy-popular.json";

export const deviceOptions = [
  { value: "bodyweight", label: "自重" },
  { value: "barbell", label: "杠铃" },
  { value: "weight-plate", label: "杠铃片" },
  { value: "kettlebell", label: "壶铃" },
  { value: "machines", label: "器械" },
  { value: "suspension-band", label: "悬挂带" },
  { value: "dumbbell", label: "哑铃" },
  { value: "resistance-band", label: "阻力带" },
];
export const muscleOptions = [
  { value: "lats", label: "背阔肌" },
  { value: "biceps", label: "二头肌" },
  { value: "abdominals", label: "腹肌" },
  { value: "quadriceps", label: "股四头肌" },
  { value: "hamstrings", label: "腘绳肌" },
  { value: "shoulders", label: "肩部" },
  { value: "neck", label: "颈部" },
  { value: "adductors", label: "内收肌" },
  { value: "forearms", label: "前臂" },
  { value: "full-body", label: "全身" },
  { value: "triceps", label: "三头肌" },
  { value: "upper-back", label: "上背部" },
  { value: "glutes", label: "臀大肌" },
  { value: "abductors", label: "外展肌" },
  { value: "lower-back", label: "下背部" },
  { value: "calves", label: "小腿" },
  { value: "traps", label: "斜方肌" },
  { value: "chest", label: "胸部" },
  { value: "cardio", label: "有氧运动" },
];
export type LibraryRecord = {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string | null;
  category?: string;
  originalName?: string;
  aliases?: string[];
  primaryMuscles?: string[];
};
const machineCodes = new Set([
  "machine",
  "cable",
  "plate-loaded",
  "selectorized",
  "smith",
]);
export function matchesDevice(equipment: string | null, selected: string) {
  if (selected === "all") return true;
  if (selected === "machines")
    return equipment !== null && machineCodes.has(equipment);
  if (selected === "bodyweight")
    return ["bodyweight", "body only", "none"].includes(equipment ?? "");
  if (selected === "barbell")
    return ["barbell", "e-z curl bar", "trap-bar"].includes(equipment ?? "");
  if (selected === "other")
    return ![
      "bodyweight",
      "body only",
      "none",
      "barbell",
      "e-z curl bar",
      "trap-bar",
      "weight-plate",
      "kettlebell",
      "kettlebells",
      "suspension-band",
      "dumbbell",
      "resistance-band",
      "bands",
      ...machineCodes,
    ].includes(equipment ?? "");
  if (selected === "resistance-band")
    return ["resistance-band", "bands"].includes(equipment ?? "");
  if (selected === "kettlebell")
    return ["kettlebell", "kettlebells"].includes(equipment ?? "");
  return equipment === selected;
}
const muscleAliases: Record<string, string[]> = {
  lats: ["背阔肌"],
  biceps: ["二头肌", "肱二头肌"],
  abdominals: ["腹肌", "核心"],
  quadriceps: ["股四头肌"],
  hamstrings: ["腘绳肌", "腿绳肌"],
  shoulders: ["肩", "三角肌"],
  neck: ["颈"],
  adductors: ["内收肌"],
  forearms: ["前臂"],
  "full-body": ["全身"],
  triceps: ["三头肌", "肱三头肌"],
  "upper-back": ["上背", "中背"],
  glutes: ["臀"],
  abductors: ["外展肌"],
  "lower-back": ["下背"],
  calves: ["小腿"],
  traps: ["斜方肌"],
  chest: ["胸"],
};
export function matchesMuscle(row: LibraryRecord, selected: string) {
  if (selected === "all") return true;
  if (selected === "cardio")
    return row.category === "cardio" || row.muscle_group === "有氧";
  if (row.category === "cardio") return false;
  if (row.primaryMuscles?.length)
    return selected === "other"
      ? row.primaryMuscles.every(
          (m) => !muscleOptions.some((o) => o.value === m && m !== "other"),
        )
      : row.primaryMuscles.includes(selected);
  if (selected === "other")
    return !Object.values(muscleAliases)
      .flat()
      .some((m) => row.muscle_group.includes(m));
  return (muscleAliases[selected] ?? []).some((m) =>
    row.muscle_group.includes(m),
  );
}
export function filterLibrary<T extends LibraryRecord>(
  rows: T[],
  device: string,
  muscle: string,
  query: string,
) {
  const q = query.trim().toLocaleLowerCase();
  return rows.filter(
    (row) =>
      matchesDevice(row.equipment, device) &&
      matchesMuscle(row, muscle) &&
      (!q ||
        [
          row.name,
          row.originalName ?? "",
          ...(row.aliases ?? []),
          row.muscle_group,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q)),
  );
}
export function librarySections<T extends LibraryRecord>(
  rows: T[],
  isFiltered: boolean,
) {
  const all = [...rows].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  return {
    popular: isFiltered
      ? []
      : popular.flatMap((id) => {
          const row = rows.find((r) => r.id === id);
          return row ? [row] : [];
        }),
    all,
  };
}
