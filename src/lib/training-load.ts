export type LoadColor = "red" | "green" | "yellow" | "blue";
export type LoadPeriod = "days" | "weeks";
export const LOAD_COLORS: LoadColor[] = ["red", "green", "yellow", "blue"];
export type LoadEntry = {
  date: string;
  noteId: string;
  noteTitle: string;
  noteColor: LoadColor;
  strengthSets: number;
  cardioMinutes: number;
};
export type LoadDay = {
  date: string;
  entries: LoadEntry[];
  strength: Record<LoadColor, number>;
  cardio: Record<LoadColor, number>;
  sets: number;
  minutes: number;
};
const DAY = 86400000;
const stamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
const iso = (value: number) => new Date(value).toISOString().slice(0, 10);
export function loadRanges(
  anchor: string,
  period: LoadPeriod,
  weekStart: 0 | 1 = 1,
) {
  const stride = period === "days" ? 1 : 7;
  const count = period === "days" ? 30 : 24;
  const value = stamp(anchor);
  const offset = (new Date(value).getUTCDay() - weekStart + 7) % 7;
  const end = period === "weeks" ? value + (6 - offset) * DAY : value;
  return Array.from({ length: count }, (_, i) => ({
    date: iso(end - ((count - 1 - i) * stride + stride - 1) * DAY),
    end: iso(end - (count - 1 - i) * stride * DAY),
  }));
}
const emptyColors = (): Record<LoadColor, number> => ({
  red: 0,
  green: 0,
  yellow: 0,
  blue: 0,
});
export function buildLoadDays(
  dates: string[],
  entries: LoadEntry[],
): LoadDay[] {
  const days = dates.map((date) => ({
    date,
    entries: [] as LoadEntry[],
    strength: emptyColors(),
    cardio: emptyColors(),
    sets: 0,
    minutes: 0,
  }));
  const lookup = new Map(days.map((day) => [day.date, day]));
  for (const entry of entries) {
    const day = lookup.get(entry.date);
    if (!day || !LOAD_COLORS.includes(entry.noteColor)) continue;
    const sets = Number.isFinite(entry.strengthSets)
      ? Math.max(0, entry.strengthSets)
      : 0;
    const minutes = Number.isFinite(entry.cardioMinutes)
      ? Math.max(0, entry.cardioMinutes)
      : 0;
    day.strength[entry.noteColor] += sets;
    day.cardio[entry.noteColor] += minutes;
    day.sets += sets;
    day.minutes += minutes;
    day.entries.push({ ...entry, strengthSets: sets, cardioMinutes: minutes });
  }
  return days;
}
export function buildRollingLoad(
  anchor: string,
  period: LoadPeriod,
  entries: LoadEntry[],
  weekStart: 0 | 1 = 1,
) {
  const ranges = loadRanges(anchor, period, weekStart);
  const start = stamp(ranges[0].date);
  const cutoff = stamp(anchor);
  const stride = period === "days" ? 1 : 7;
  const mapped = entries.flatMap((entry) => {
    const time = stamp(entry.date);
    if (!Number.isFinite(time) || time < start || time > cutoff) return [];
    const index = Math.floor((time - start) / (DAY * stride));
    return [{ ...entry, date: ranges[index].date }];
  });
  return buildLoadDays(
    ranges.map((range) => range.date),
    mapped,
  ).map((bucket, i) => {
    const notes = new Map<string, LoadEntry>();
    for (const entry of bucket.entries) {
      const key = JSON.stringify([entry.noteId, entry.noteColor]);
      const old = notes.get(key);
      if (old) {
        old.strengthSets += entry.strengthSets;
        old.cardioMinutes += entry.cardioMinutes;
      } else notes.set(key, { ...entry });
    }
    return { ...bucket, end: ranges[i].end, entries: [...notes.values()] };
  });
}

export type LoadSegment = {
  color: LoadColor;
  value: number;
  offset: number;
  height: number;
};
export function loadGeometry(days: LoadDay[], up = 84, down = 30) {
  const fitScale = (direction: "strength" | "cardio", budget: number) => {
    const candidates = days.flatMap((day) => {
      const values = LOAD_COLORS.map((color) => day[direction][color]).filter(
        (value) => value > 0,
      );
      const total = values.reduce((sum, value) => sum + value, 0);
      return total
        ? [Math.max(0, budget - (values.length - 1) * 2) / total]
        : [];
    });
    return candidates.length ? Math.min(...candidates) : 0;
  };
  const strengthScale = fitScale("strength", up);
  const cardioScale = fitScale("cardio", down);
  // One scale per direction across every day. Do not compare sets with minutes.
  const segments = (
    values: Record<LoadColor, number>,
    scale: number,
  ): LoadSegment[] => {
    let offset = 0;
    return LOAD_COLORS.filter((color) => values[color] > 0).map((color) => {
      const height = values[color] * scale;
      const segment = { color, value: values[color], height, offset };
      offset += height + 2;
      return segment;
    });
  };
  return days.map((day) => {
    const strength = segments(day.strength, strengthScale);
    const cardio = segments(day.cardio, cardioScale);
    return {
      strength,
      cardio,
      top: strength.length
        ? strength.at(-1)!.offset + strength.at(-1)!.height
        : 0,
      bottom: cardio.length ? cardio.at(-1)!.offset + cardio.at(-1)!.height : 0,
    };
  });
}

