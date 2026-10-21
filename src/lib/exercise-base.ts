import shoulderRegions from "../data/exercise-shoulder-regions.json";
import chestRegions from "../data/exercise-chest-regions.json";
import names from "../data/hevy-exercises-zh.json";
export type BaseExercise = {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string | null;
  category: string;
  localizedName?: string;
  aliases?: string[];
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
  "upper-back": "上背",
  "lower-back": "下背",
  "full-body": "全身",
  olympic: "全身",
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
    (names as Record<string, string>)[id.replace(/^hevy:/, "")] ?? fallback
  );
}
export function chestRegion(name: string) {
  if (/上斜.*俯卧撑/.test(name)) return "下胸";
  if (/下斜.*俯卧撑/.test(name)) return "上胸";
  if (/上斜/.test(name)) return "上胸";
  if (/下斜/.test(name)) return "下胸";
  if (/decline.*push.?up|feet.*elevated.*push.?up/i.test(name)) return "上胸";
  if (/incline.*push.?up/i.test(name)) return "下胸";
  if (/incline/i.test(name)) return "上胸";
  if (/decline|dips?.*chest|chest.*dips?/i.test(name)) return "下胸";
  if (/双杠|撑体/.test(name)) return "下胸";
  if (
    /俯卧撑|卧推|推胸|夹胸|飞鸟|bench press|flyes|flys|push.?up|butterfly|chest press/i.test(
      name,
    )
  )
    return "中胸";
  return "";
}
export function exerciseDetail(group: string) {
  if (/^(胸|肩) \/ /.test(group)) return group.slice(4);
  return group;
}
export function baseChestRegion(id: string) {
  return (chestRegions as Record<string, { region: string }>)[
    id.replace(/^free-db:/, "")
  ]?.region;
}
export function baseShoulderRegion(id: string) {
  return (shoulderRegions as Record<string, { region: string }>)[
    id.replace(/^free-db:/, "")
  ]?.region;
}
export function adaptBaseExercise(item: BaseExercise) {
  const region =
    baseChestRegion(item.id) ?? chestRegion(item.localizedName ?? item.name);
  return {
    id: `hevy:${item.id}`,
    name: item.localizedName ?? localizedExerciseName(item.id, item.name),
    originalName: item.name,
    aliases: item.aliases ?? [],
    primaryMuscles: item.primaryMuscles,
    equipment: item.equipment,
    category: item.category,
    muscle_group: item.primaryMuscles.includes("chest")
      ? region
        ? `胸 / ${region}`
        : "胸"
      : item.primaryMuscles.includes("shoulders")
        ? "肩"
        : item.primaryMuscles.map((m) => muscles[m] ?? m).join(" / "),
    source: "base" as const,
  };
}

// Real source IDs; incline walking uses the treadmill entry, not a fabricated machine.
export const cardioEquipment: Record<string, string> = {
  Bicycling_Stationary: "固定单车",
  Recumbent_Bike: "卧式单车",
  Elliptical_Trainer: "椭圆机",
  Jogging_Treadmill: "跑步机",
  Running_Treadmill: "跑步机",
  Walking_Treadmill: "跑步机",
  Stairmaster: "爬楼机",
  Step_Mill: "爬楼机",
  Rowing_Stationary: "划船机",
  Rope_Jumping: "跳绳",
  Bicycling: "户外骑行",
  Prowler_Sprint: "雪橇",
  Skating: "滑行",
  Trail_Running_Walking: "户外跑走",
};
export function cardioDetail(id: string) {
  return cardioEquipment[id.replace(/^free-db:/, "")];
}
export function matchesLibraryFamily(
  item: { source: string; category?: string; muscle_group: string },
  family: string,
  muscle: string,
) {
  if (family === "全部") return true;
  const cardio = item.category === "cardio" || item.muscle_group === "有氧";
  if (family === "有氧") return cardio;
  if (family === "其他" && item.source === "custom") return true;
  return !cardio && muscle === family;
}

export const equipmentFilters = {
  smith: "史密斯",
  "plate-loaded": "挂片器械",
  "trap-bar": "六角杠",
  dumbbell: "哑铃",
  barbell: "杠铃",
  cable: "绳索",
  "resistance-band": "弹力带",
  "suspension-band": "悬挂带",
  bodyweight: "自重",
  none: "无器械",
  "weight-ball": "负重球",
  "weight-plate": "杠铃片",
  kettlebells: "壶铃",
  bands: "弹力带",
  machine: "固定器械",
  "body only": "自重",
  "e-z curl bar": "曲杆杠铃",
  "medicine ball": "药球",
  "exercise ball": "健身球",
  "foam roll": "泡沫轴",
  other: "其他器材",
  unknown: "未标注",
} as const;
export function matchesEquipment(
  equipment: string | null | undefined,
  selected: string[],
) {
  return !selected.length || selected.includes(equipment ?? "unknown");
}
