import type { Session } from "./domain";

export const TRAINING_FROM = "2020-01-01";
export const TRAINING_TO = "2030-12-31";
export const TRAINING_PAGE_SIZE = 20;
export const DAY_PAGE_SIZE = 100;
export type CalendarTraining = Pick<
  Session,
  "training_date" | "status" | "training_type"
> & {
  count: number;
  deleted_at?: string | null;
  locked?: boolean;
  day_revision?: string;
};
export function trainingRange(from = TRAINING_FROM, to = TRAINING_TO) {
  const start = from < TRAINING_FROM ? TRAINING_FROM : from;
  const end = to > TRAINING_TO ? TRAINING_TO : to;
  return start <= end ? { from: start, to: end } : null;
}
export function trainingDate(date: string) {
  return date < TRAINING_FROM
    ? TRAINING_FROM
    : date > TRAINING_TO
      ? TRAINING_TO
      : date;
}
export const trainingPaths = {
  calendar: (from: string, to: string) =>
    `sessions?view=calendar&from=${from}&to=${to}`,
  day: (date: string, page = 0) =>
    `sessions?from=${date}&to=${date}&limit=${DAY_PAGE_SIZE + 1}&offset=${page * DAY_PAGE_SIZE}&order=asc`,
  nextPlan: (date: string) =>
    `sessions?planned=1&type=strength&from=${date}&limit=1&order=asc`,
  plans: (page = 0) =>
    `sessions?planned=1&limit=${TRAINING_PAGE_SIZE + 1}&offset=${page * TRAINING_PAGE_SIZE}`,
  active: (page = 0) =>
    `sessions?active=1&limit=${TRAINING_PAGE_SIZE + 1}&offset=${page * TRAINING_PAGE_SIZE}`,
  detail: (id: string) => `sessions?id=${id}`,
  deleted: (date: string, page = 0) =>
    `sessions?from=${date}&to=${date}&deleted=1&limit=${TRAINING_PAGE_SIZE + 1}&offset=${page * TRAINING_PAGE_SIZE}`,
};
