import names from "../data/free-exercise-db-zh.json";
export type BaseExercise = {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  category: string;
};
const muscles: Record<string, string> = {
  abdominals: "腹肌",
  hamstrings: "腘绳肌",
  adductors: "内收肌",
  quadriceps: "股四头肌",
  biceps: "肱二头肌",
  shoulders: "三角肌",
  chest: "胸",
  "middle back": "中背",
  calves: "小腿",
  glutes: "臀肌",
  "lower back": "下背",
  lats: "背阔肌",
  triceps: "肱三头肌",
  traps: "斜方肌",
  forearms: "前臂",
  neck: "颈部",
  abductors: "外展肌",
};
export function localizedExerciseName(id: string, fallback: string) {
  return (
    (names as Record<string, string>)[id.replace(/^free-db:/, "")] ?? fallback
  );
}
export function chestRegion(name: string) {
  if (/decline.*push.?up|feet.*elevated.*push.?up/i.test(name)) return "上胸";
  if (/incline.*push.?up/i.test(name)) return "下胸";
  if (/incline/i.test(name)) return "上胸";
  if (/decline|dips?.*chest|chest.*dips?/i.test(name)) return "下胸";
  if (/bench press|flyes|flys|push.?up|butterfly|chest press/i.test(name))
    return "中胸";
  return "未细分";
}
export function exerciseDetail(group: string) {
  if (group.startsWith("胸 / ")) return group.slice(4);
  return group === "胸" ? "未细分" : group;
}
export function adaptBaseExercise(item: BaseExercise) {
  return {
    id: `free-db:${item.id}`,
    name: localizedExerciseName(item.id, item.name),
    originalName: item.name,
    muscle_group: item.primaryMuscles.includes("chest")
      ? `胸 / ${chestRegion(item.name)}`
      : item.primaryMuscles.map((m) => muscles[m] ?? m).join(" / "),
    source: "base" as const,
  };
}
