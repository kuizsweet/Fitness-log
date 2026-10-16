import { z } from "zod";
import {
  bodyMeasurementWrite,
  parseBodyInput,
  type BodyMeasurement,
  type BodyMeasurementWrite,
  type BodyMetric,
} from "./body-goals";

type Draft = { text: string; sequence: number; expected: number | null };
type Flight = BodyMeasurementWrite & { sequence: number };
type Persistence = { read(): string | null; write(value: string): void };
export type MeasurementEditorState = {
  measurements: BodyMeasurement[];
  drafts: Partial<Record<BodyMetric, Draft>>;
  error: string;
  conflict: boolean;
};
const draftSchema = z.object({
  text: z.string().max(20),
  sequence: z.number().int().nonnegative(),
  expected: z.number().nullable(),
});
const savedSchema = z.object({
  version: z.literal(1),
  sequence: z.number().int().nonnegative(),
  recovered: z.boolean().optional(),
  measurements: z.array(
    z.object({
      id: z.string(),
      metric: z.enum(["weight", "body_fat"]),
      value: z.number(),
      measured_at: z.iso.datetime({ offset: true }),
      source: z.string(),
      source_record_id: z.string().nullable(),
    }),
  ),
  drafts: z.object({
    weight: draftSchema.optional(),
    body_fat: draftSchema.optional(),
  }),
  flight: bodyMeasurementWrite
    .extend({ sequence: z.number().int().nonnegative() })
    .optional(),
});
// Same durable, serialized contract as goal editing; readings remain distinct facts.
export class MeasurementEditor {
  private state: MeasurementEditorState = {
    measurements: [],
    drafts: {},
    error: "",
    conflict: false,
  };
  private listeners = new Set<() => void>();
  private sequence = 0;
  private flight?: Flight;
  private running = false;
  private recovered = false;
  private storageError = false;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(
    private persistence: Persistence,
    private send: (flight: Flight) => Promise<BodyMeasurement>,
    private confirmed: (m: BodyMeasurement) => void,
    private uuid: () => string,
  ) {
    try {
      const raw = persistence.read();
      if (raw) {
        const saved = savedSchema.parse(JSON.parse(raw));
        this.state.measurements = saved.measurements;
        this.state.drafts = saved.drafts;
        this.sequence = saved.sequence;
        this.flight = saved.flight;
        this.recovered = saved.recovered ?? false;
        if (this.recovered) this.otherTabChanged();
      }
    } catch {
      this.storageError = true;
      this.state.error = "本地测量草稿无法读取，请勿关闭页面。";
    }
  }
  getSnapshot = () => this.state;
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
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
          sequence: this.sequence,
          measurements: this.state.measurements,
          drafts: this.state.drafts,
          flight: this.flight,
          recovered: this.recovered,
        }),
      );
      this.storageError = false;
    } catch {
      this.storageError = true;
      this.state.error = "本地测量草稿无法保留，请勿关闭页面。";
    }
  }
  private merge(m: BodyMeasurement) {
    const old = this.state.measurements.find((x) => x.metric === m.metric);
    if (!old || Date.parse(m.measured_at) >= Date.parse(old.measured_at))
      this.state.measurements = [
        ...this.state.measurements.filter((x) => x.metric !== m.metric),
        m,
      ];
  }
  receive(measurements: BodyMeasurement[]) {
    measurements.forEach((m) => this.merge(m));
    if (this.recovered && !this.running) {
      for (const m of measurements) {
        const known = this.state.measurements.find(
          (x) => x.metric === m.metric,
        );
        if (known && Date.parse(known.measured_at) > Date.parse(m.measured_at))
          continue;
        const draft = this.state.drafts[m.metric];
        if (draft && parseBodyInput(m.metric, draft.text) === m.value)
          delete this.state.drafts[m.metric];
        if (
          this.flight?.metric === m.metric &&
          (this.flight.value === m.value || !this.state.drafts[m.metric])
        ) {
          if (this.state.drafts[m.metric])
            this.state.drafts[m.metric]!.expected = m.value;
          this.flight = undefined;
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
  edit(metric: BodyMetric, text: string) {
    const previous = this.state.drafts[metric];
    this.state.drafts = {
      ...this.state.drafts,
      [metric]: {
        text,
        sequence: ++this.sequence,
        expected: previous
          ? previous.expected
          : (this.state.measurements.find((x) => x.metric === metric)?.value ??
            null),
      },
    };
    this.persist();
    this.emit();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 300);
  }
  hasPending() {
    return Boolean(this.flight || Object.keys(this.state.drafts).length);
  }
  otherTabChanged() {
    if (!this.hasPending()) return;
    this.state.conflict = true;
    this.state.error = "其他窗口有未提交的测量输入，请核对后重试。";
    this.emit();
  }
  async retry(measurements: BodyMeasurement[]) {
    if (this.running) return;
    this.receive(measurements);
    if (this.state.conflict) {
      this.flight = undefined;
      for (const metric of ["body_fat", "weight"] as const)
        if (this.state.drafts[metric])
          this.state.drafts[metric]!.expected =
            measurements.find((m) => m.metric === metric)?.value ?? null;
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
          for (const metric of ["body_fat", "weight"] as const) {
            const draft = this.state.drafts[metric];
            if (!draft) continue;
            const value = parseBodyInput(metric, draft.text);
            if (value == null) continue;
            this.flight = {
              id: this.uuid(),
              metric,
              value,
              expected_value: draft.expected,
              sequence: draft.sequence,
            };
            break;
          }
        }
        if (!this.flight) break;
        this.persist();
        const sent = this.flight;
        const m = await this.send(sent);
        this.merge(m);
        const draft = this.state.drafts[m.metric];
        if (draft?.sequence === sent.sequence)
          delete this.state.drafts[m.metric];
        else if (draft) draft.expected = m.value;
        this.flight = undefined;
        this.state.error = "";
        this.persist();
        this.confirmed(
          this.state.measurements.find((x) => x.metric === m.metric) ?? m,
        );
        this.emit();
      }
    } catch (error) {
      this.state.conflict =
        error instanceof Error && error.message.includes("版本冲突");
      this.state.error = this.state.conflict
        ? "目前数值已在其他窗口修改。输入已保留，请核对后重试。"
        : error instanceof Error &&
            "status" in error &&
            (error.status === 401 || error.status === 403)
          ? "登录或请求验证失败，测量输入已保留。请重新登录后重试。"
          : error instanceof Error && "status" in error && error.status === 400
            ? "测量数值未被接受，输入已保留。请检查后重试。"
            : "测量未能写入，输入已保留。恢复网络后将重试。";
      this.persist();
    } finally {
      this.running = false;
      if (this.storageError)
        this.state.error = "本地测量草稿无法保留，请勿关闭页面。";
      this.emit();
    }
  }
}
