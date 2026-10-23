export type CardioValues = {
  minutes?: number | null;
  speed?: number | null;
  incline?: number | null;
  distance?: number | null;
  resistance?: number | null;
};
export function isCardioExercise(exercise: { name: string; category?: string; muscle?: string }) {
  return exercise.category === "cardio" || /有氧/.test(exercise.muscle ?? "") || /跑步机|爬坡机|爬楼机|椭圆机|划船机|动感单车|风阻单车/.test(exercise.name);
}
export function cardioFields(name: string) {
  const fields: { key: keyof CardioValues; label: string; unit: string; max: number }[] = [
    { key: "minutes", label: "时长", unit: "分钟", max: 1440 },
  ];
  if (/跑步机|爬坡机/.test(name)) fields.push(
    { key: "incline", label: "坡度", unit: "%", max: 100 },
    { key: "speed", label: "速度", unit: "km/h", max: 100 },
  );
  else if (/单车|椭圆机|划船机|爬楼机/.test(name)) fields.push(
    { key: "resistance", label: /爬楼机/.test(name) ? "等级" : "阻力", unit: "档", max: 100 },
  );
  return fields;
}

export function canAddExercise(existing: { name: string; category?: string; muscle?: string }[], incoming: { name: string; category?: string; muscle?: string }) {
  return existing.every((exercise) => isCardioExercise(exercise) === isCardioExercise(incoming));
}
export function noteTrainingType(note: { exercises: { name: string; category?: string; muscle?: string }[] }) {
  if (!note.exercises.length) return null;
  if (note.exercises.every(isCardioExercise)) return "cardio";
  if (note.exercises.every((exercise) => !isCardioExercise(exercise))) return "strength";
  return null;
}
