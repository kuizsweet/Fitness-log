import type { Session } from "./domain";
export function calendarMonth(date: string) {
  const year = Number(date.slice(0, 4)),
    month = Number(date.slice(5, 7));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  return {
    year,
    month,
    days,
    offset,
    from: `${date.slice(0, 7)}-01`,
    to: `${date.slice(0, 7)}-${days}`,
  };
}
export function changeCalendarMonth(date: string, year: number, month: number) {
  const day = Math.min(
    Number(date.slice(8)),
    new Date(Date.UTC(year, month, 0)).getUTCDate(),
  );
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function trainingMarkers(
  sessions: Session[],
  day: string,
): ("strength" | "cardio" | "idle")[] {
  const types = new Set(
    sessions
      .filter(
        (s) =>
          s.training_date === day && s.status !== "planned" && !s.deleted_at,
      )
      .map((s) => s.training_type),
  );
  const active = (["strength", "cardio"] as const).filter((type) =>
    types.has(type),
  );
  return active.length ? active : ["idle"];
}
