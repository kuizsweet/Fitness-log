import {
  emptyGoal,
  parseBodyInput,
  type BodyGoal,
  type BodyMetric,
  type GoalField,
} from "./body-goals";
import { bodyGoalPatch, bodyMetric } from "./body-goals";
import { z } from "zod";

type Draft = { text: string; sequence: number; expected: number | null };
type Drafts = Partial<Record<BodyMetric, Partial<Record<GoalField, Draft>>>>;
type Flight = {
  metric: BodyMetric;
  mutation_id: string;
  changes: Partial<Record<GoalField, number | null>>;
  expected_start: number | null;
  expected_target: number | null;
  sequences: Partial<Record<GoalField, number>>;
};
export type GoalEditorState = {
  goals: BodyGoal[];
  drafts: Drafts;
  error: string;
  conflict: boolean;
};
type Persistence = { read(): string | null; write(value: string): void };
const fields: GoalField[] = ["start_value", "target_value"];
const draftSchema = z.object({
  text: z.string().max(20),
  sequence: z.number().int().nonnegative(),
  expected: z.number().nullable(),
});
const metricDraft = z.object({
  start_value: draftSchema.optional(),
  target_value: draftSchema.optional(),
});
const savedSchema = z.object({
  version: z.literal(1),
  sequence: z.number().int().nonnegative(),
  goals: z.array(
    z.object({
      metric: bodyMetric,
      start_value: z.number().nullable(),
      target_value: z.number().nullable(),
      revision: z.number().int().nonnegative(),
      mutation_id: z.string().nullable(),
    }),
  ),
  drafts: z.object({
    weight: metricDraft.optional(),
    body_fat: metricDraft.optional(),
  }),
  flight: bodyGoalPatch
    .extend({
      sequences: z.object({
        start_value: z.number().optional(),
        target_value: z.number().optional(),
      }),
    })
    .optional(),
  recovered: z.boolean().optional(),
});

// One serialized writer survives component unmounts. Durable snapshots are written
// before requests; only the exact acknowledged edit is removed from the outbox.
export class GoalEditor {
  private state: GoalEditorState = {
    goals: [],
    drafts: {},
    error: "",
    conflict: false,
  };
  private listeners = new Set<() => void>();
  private sequence = 0;
  private flight?: Flight;
  private running = false;
  private timer?: ReturnType<typeof setTimeout>;
  private storageError = false;
  private recovered = false;
  constructor(
    private persistence: Persistence,
    private send: (flight: Flight) => Promise<BodyGoal>,
    private confirmed: (goal: BodyGoal) => void,
    private uuid: () => string,
  ) {
    try {
      const raw = persistence.read();
      if (raw) {
        const saved = savedSchema.parse(JSON.parse(raw));
        this.state = {
          ...this.state,
          goals: saved.goals ?? [],
          drafts: saved.drafts ?? {},
        };
        this.flight = saved.flight;
        this.sequence = saved.sequence ?? 0;
        if (saved.recovered) {
          this.recovered = true;
          this.state.conflict = true;
          this.state.error = "已恢复其他窗口的未提交输入，请核对后重试。";
        }
      }
    } catch {
      this.state.error = "本地草稿无法读取，请勿关闭页面。";
      this.storageError = true;
    }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.state = { ...this.state };
    this.listeners.forEach((fn) => fn());
  }
  private persist() {
    try {
      this.persistence.write(
        JSON.stringify({
          version: 1,
          goals: this.state.goals,
          drafts: this.state.drafts,
          flight: this.flight,
          sequence: this.sequence,
          recovered: this.recovered,
        }),
      );
      this.storageError = false;
    } catch {
      this.storageError = true;
      this.state.error = "本地草稿无法保留，请勿关闭页面。";
    }
  }
  receive(goals: BodyGoal[]) {
    for (const goal of goals) {
      const old = this.state.goals.find((g) => g.metric === goal.metric);
      if (!old || old.revision <= goal.revision)
        this.state.goals = [
          ...this.state.goals.filter((g) => g.metric !== goal.metric),
          goal,
        ];
    }
    // A recovered outbox may already have been committed by its original tab.
    // Only confirmed server values may satisfy intent; never optimistic cache.
    if (this.recovered && !this.running) {
      for (const goal of goals) {
        const known = this.state.goals.find((g) => g.metric === goal.metric);
        if (known && known.revision > goal.revision) continue;
        const drafts = this.state.drafts[goal.metric];
        for (const field of fields) {
          const draft = drafts?.[field];
          if (draft && parseBodyInput(goal.metric, draft.text) === goal[field])
            delete drafts![field];
        }
        if (this.flight?.metric === goal.metric) {
          const flight = this.flight;
          const committed = Object.entries(flight.changes).every(
            ([field, value]) => goal[field as GoalField] === value,
          );
          const superseded = fields.every((field) => !drafts?.[field]);
          if (committed || superseded) {
            if (committed)
              for (const field of fields) {
                const draft = drafts?.[field];
                if (draft && flight.sequences[field] !== undefined)
                  draft.expected = goal[field];
              }
            this.flight = undefined;
          }
        }
      }
      if (!this.hasPending()) {
        this.recovered = false;
        this.state.conflict = false;
        this.state.error = "";
      }
      this.persist();
    }
    this.emit();
  }
  edit(metric: BodyMetric, field: GoalField, text: string) {
    const goal =
      this.state.goals.find((g) => g.metric === metric) ?? emptyGoal(metric);
    const previous = this.state.drafts[metric]?.[field];
    this.state.drafts = {
      ...this.state.drafts,
      [metric]: {
        ...this.state.drafts[metric],
        [field]: {
          text,
          sequence: ++this.sequence,
          expected: previous ? previous.expected : goal[field],
        },
      },
    };
    this.persist();
    this.emit();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 300);
  }
  hasPending() {
    return Boolean(
      this.flight ||
      Object.values(this.state.drafts).some(
        (draft) => draft && Object.keys(draft).length,
      ),
    );
  }
  // A different tab must never silently replace an outstanding local draft.
  otherTabChanged() {
    if (!this.hasPending()) return;
    this.state.error = "其他窗口也有目标修改。当前输入已保留，请核对后重试。";
    this.state.conflict = true;
    this.emit();
  }
  async retry(latest: BodyGoal[]) {
    if (this.running) return;
    this.receive(latest);
    if (this.state.conflict) {
      this.flight = undefined;
      for (const metric of ["weight", "body_fat"] as const) {
        const goal =
          latest.find((g) => g.metric === metric) ?? emptyGoal(metric);
        for (const field of fields) {
          const draft = this.state.drafts[metric]?.[field];
          if (draft) draft.expected = goal[field];
        }
      }
    }
    this.state.conflict = false;
    this.recovered = false;
    this.state.error = "";
    this.persist();
    return this.flush();
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.running || this.state.conflict) return;
    this.running = true;
    try {
      while (true) {
        if (!this.flight) {
          for (const metric of ["weight", "body_fat"] as const) {
            const goal =
              this.state.goals.find((g) => g.metric === metric) ??
              emptyGoal(metric);
            const flight: Flight = {
              metric,
              mutation_id: this.uuid(),
              changes: {},
              sequences: {},
              expected_start: goal.start_value,
              expected_target: goal.target_value,
            };
            for (const field of fields) {
              const draft = this.state.drafts[metric]?.[field];
              if (!draft) continue;
              const value = parseBodyInput(metric, draft.text);
              if (value === undefined) continue;
              flight.changes[field] = value;
              flight.sequences[field] = draft.sequence;
              if (field === "start_value")
                flight.expected_start = draft.expected;
              else flight.expected_target = draft.expected;
            }
            if (Object.keys(flight.changes).length) {
              this.flight = flight;
              break;
            }
          }
        }
        if (!this.flight) break;
        this.persist();
        const sent = this.flight;
        const goal = await this.send(sent);
        const known = this.state.goals.find((g) => g.metric === goal.metric);
        if (!known || known.revision <= goal.revision)
          this.state.goals = [
            ...this.state.goals.filter((g) => g.metric !== goal.metric),
            goal,
          ];
        for (const field of fields) {
          const draft = this.state.drafts[goal.metric]?.[field];
          if (!draft || sent.sequences[field] === undefined) continue;
          if (draft.sequence === sent.sequences[field])
            delete this.state.drafts[goal.metric]![field];
          else draft.expected = goal[field];
        }
        this.flight = undefined;
        this.state.error = "";
        this.persist();
        this.confirmed(
          this.state.goals.find((g) => g.metric === goal.metric) ?? goal,
        );
        this.emit();
      }
    } catch (error) {
      this.state.conflict =
        error instanceof Error && error.message.includes("版本冲突");
      this.state.error = this.state.conflict
        ? "目标已在其他窗口修改。输入已保留，核对后可重试。"
        : error instanceof Error &&
            "status" in error &&
            (error.status === 401 || error.status === 403)
          ? "登录或请求验证失败，输入已保留。请重新登录后重试。"
          : error instanceof Error && "status" in error && error.status === 400
            ? "数值未被接受，输入已保留。请检查后重试。"
            : "未能写入，输入已保留。恢复网络后将重试。";
      this.persist();
    } finally {
      this.running = false;
      if (this.storageError)
        this.state.error = "本地草稿无法保留，请勿关闭页面。";
      this.emit();
    }
  }
}
