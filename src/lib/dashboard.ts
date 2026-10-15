import type { Session } from "./domain";

/** Read a saved plan; this does not create or advance a training rotation. */
export function nextStrengthPlan(sessions: Session[], from: string) {
  return sessions
    .filter(
      (s) =>
        s.training_date >= from &&
        s.status === "planned" &&
        s.training_type === "strength" &&
        !s.deleted_at,
    )
    .sort(
      (a, b) =>
        a.training_date.localeCompare(b.training_date) ||
        a.id.localeCompare(b.id),
    )[0];
}
