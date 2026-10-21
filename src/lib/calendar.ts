import type { Session } from "./domain";
import type { CalendarTraining } from "./training-queries";
export type CalendarMode = "rest" | "strength" | "cardio" | "mixed";
export const EMPTY_DAY_VERSION = "d41d8cd98f00b204e9800998ecf8427e";
export type CalendarDayState = {
  training_date: string;
  mode: CalendarMode;
  locked: boolean;
  version: string;
  rows: CalendarTraining[];
  affected_ids?: string[];
};
export function nextCalendarMode(mode: CalendarMode): CalendarMode {
  const modes: CalendarMode[] = ["rest", "strength", "cardio", "mixed"];
  return modes[(modes.indexOf(mode) + 1) % modes.length];
}
export function calendarDayState(
  rows: CalendarTraining[],
  date: string,
): CalendarDayState {
  const day = rows.filter((r) => r.training_date === date && !r.deleted_at);
  const types = new Set(day.map((r) => r.training_type));
  return {
    training_date: date,
    mode:
      types.has("strength") && types.has("cardio")
        ? "mixed"
        : types.has("strength")
          ? "strength"
          : types.has("cardio")
            ? "cardio"
            : "rest",
    locked: day.some((r) => r.locked),
    version: day[0]?.day_revision ?? EMPTY_DAY_VERSION,
    rows: day,
  };
}
export function calendarMonth(date: string, weekStart: 0 | 1 = 1) {
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset =
    (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() - weekStart + 7) % 7;
  return {
    year,
    month,
    days,
    offset,
    from: `${date.slice(0, 7)}-01`,
    to: `${date.slice(0, 7)}-${days}`,
  };
}
/** Keep weekday columns stable; overflow dates wrap into unused first-row cells. */
export function fiveRowCalendarDays(
  date: string,
  weekStart: 0 | 1 = 1,
): (number | null)[] {
  const { offset, days } = calendarMonth(date, weekStart);
  const cells: (number | null)[] = Array(35).fill(null);
  for (let day = 1; day <= days; day++) {
    cells[(offset + day - 1) % 35] = day;
  }
  return cells;
}
export function changeCalendarMonth(date: string, year: number, month: number) {
  const day = Math.min(
    Number(date.slice(8)),
    new Date(Date.UTC(year, month, 0)).getUTCDate(),
  );
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function trainingMarkers(
  sessions: Pick<
    Session,
    "training_date" | "status" | "training_type" | "deleted_at"
  >[],
  day: string,
): ("strength" | "cardio" | "idle")[] {
  const types = new Set(
    sessions
      .filter((s) => s.training_date === day && !s.deleted_at)
      .map((s) => s.training_type),
  );
  const active = (["strength", "cardio"] as const).filter((type) =>
    types.has(type),
  );
  return active.length ? active : ["idle"];
}
