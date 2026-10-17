import {
  nextCalendarMode,
  type CalendarDayState,
  type CalendarMode,
} from "./calendar";
type Edit = {
  confirmed: CalendarDayState;
  desired: CalendarMode;
  pending: boolean;
  error: string;
};
export class CalendarWriter {
  private edits: Record<string, Edit> = {};
  private listeners = new Set<() => void>();
  constructor(
    private write: (
      day: CalendarDayState,
      mode: CalendarMode,
    ) => Promise<CalendarDayState>,
  ) {}
  getSnapshot = () => this.edits;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private publish(date: string, edit?: Edit) {
    this.edits = { ...this.edits };
    if (edit) this.edits[date] = { ...edit };
    else delete this.edits[date];
    this.listeners.forEach((fn) => fn());
  }
  cycle(day: CalendarDayState) {
    if (day.locked) return;
    const old = this.edits[day.training_date];
    const edit = {
      confirmed: old?.pending ? old.confirmed : day,
      desired: nextCalendarMode(old?.pending ? old.desired : day.mode),
      pending: old?.pending ?? false,
      error: "",
    };
    this.publish(day.training_date, edit);
    if (!edit.pending) void this.flush(day.training_date);
  }
  retry(day: CalendarDayState) {
    const edit = this.edits[day.training_date];
    if (!edit || edit.pending) return;
    if (day.locked) {
      this.publish(day.training_date);
      return;
    }
    this.publish(day.training_date, { ...edit, confirmed: day });
    void this.flush(day.training_date);
  }
  private async flush(date: string) {
    let edit = this.edits[date];
    if (!edit) return;
    this.publish(date, { ...edit, pending: true, error: "" });
    try {
      while (
        (edit = this.edits[date]) &&
        edit.desired !== edit.confirmed.mode
      ) {
        const confirmed = await this.write(edit.confirmed, edit.desired);
        if (confirmed.locked) {
          this.publish(date);
          return;
        }
        // A newer click changes desired while this request is in flight.
        this.publish(date, {
          ...this.edits[date],
          confirmed,
          pending: true,
          error: "",
        });
      }
      this.publish(date);
    } catch (error) {
      this.publish(date, {
        ...this.edits[date],
        pending: false,
        error: error instanceof Error ? error.message : "未能保存，请重试",
      });
    }
  }
}
