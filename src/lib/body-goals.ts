import { z } from "zod";

export const bodyMetric = z.enum(["weight", "body_fat"]);
export type BodyMetric = z.infer<typeof bodyMetric>;
export type GoalField = "start_value" | "target_value";
export type BodyGoal = {
  metric: BodyMetric;
  start_value: number | null;
  target_value: number | null;
  revision: number;
  mutation_id: string | null;
};
export type BodyMeasurement = {
  id: string;
  metric: BodyMetric;
  value: number;
  measured_at: string;
  source: string;
  source_record_id: string | null;
};
export type BodyOverview = {
  goals: BodyGoal[];
  measurements: BodyMeasurement[];
  // Client-cache metadata: optimistic values must not become a save baseline.
  confirmedGoals?: BodyGoal[];
  confirmedMeasurements?: BodyMeasurement[];
};
export const emptyGoal = (metric: BodyMetric): BodyGoal => ({
  metric,
  start_value: null,
  target_value: null,
  revision: 0,
  mutation_id: null,
});
export function validBodyValue(metric: BodyMetric, value: number | null) {
  return (
    value === null ||
    (Number.isFinite(value) &&
      value > 0 &&
      value <= (metric === "weight" ? 500 : 100))
  );
}
export function parseBodyInput(
  metric: BodyMetric,
  text: string,
): number | null | undefined {
  if (!text.trim()) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return undefined;
  const value = Number(text);
  return validBodyValue(metric, value) ? value : undefined;
}
// The measurement is a separate fact. A starting/target value never creates one.
export function bodyProgress(
  start: number | null,
  target: number | null,
  current: number | null,
) {
  if (
    start === null ||
    target === null ||
    current === null ||
    start === target ||
    ![start, target, current].every(Number.isFinite)
  )
    return null;
  return Math.max(
    0,
    Math.min(100, ((current - start) / (target - start)) * 100),
  );
}
export const bodyGoalPatch = z
  .object({
    metric: bodyMetric,
    mutation_id: z.uuid(),
    expected_start: z.number().nullable(),
    expected_target: z.number().nullable(),
    changes: z
      .object({
        start_value: z.number().nullable().optional(),
        target_value: z.number().nullable().optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (!Object.keys(p.changes).length)
      ctx.addIssue({ code: "custom", message: "缺少修改字段" });
    for (const [field, value] of Object.entries(p.changes))
      if (!validBodyValue(p.metric, value))
        ctx.addIssue({
          code: "custom",
          path: ["changes", field],
          message: "数值超出有效范围",
        });
  });

export const bodyMeasurementWrite = z
  .object({
    id: z.uuid(),
    metric: bodyMetric,
    value: z.number(),
    expected_value: z.number().nullable(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (!validBodyValue(p.metric, p.value))
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "数值超出有效范围",
      });
  });
export type BodyMeasurementWrite = z.infer<typeof bodyMeasurementWrite>;
