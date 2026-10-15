import assert from "node:assert/strict";
import test from "node:test";
import { newSession } from "../src/lib/domain";
import { nextStrengthPlan } from "../src/lib/dashboard";

test("下一次力量训练取最早的已保存力量计划，不默认明天，也不让有氧或已删除记录占位", () => {
  const strength = {
    ...newSession("2026-10-19"),
    status: "planned" as const,
    training_type: "strength" as const,
  };
  const past = { ...strength, id: "past", training_date: "2026-10-14" };
  const cardio = {
    ...strength,
    id: "cardio",
    training_date: "2026-10-16",
    training_type: "cardio" as const,
  };
  const deleted = {
    ...strength,
    id: "deleted",
    training_date: "2026-10-15",
    deleted_at: "2026-10-15T12:00:00Z",
  };
  const completed = {
    ...strength,
    id: "completed",
    training_date: "2026-10-15",
    status: "completed" as const,
  };
  const later = { ...strength, id: "later", training_date: "2026-10-21" };
  const unknown = {
    ...strength,
    id: "unknown",
    training_date: "2026-10-16",
    training_type: null,
  };
  const records = [later, cardio, deleted, past, completed, unknown, strength];
  const order = records.map((s) => s.id);
  assert.equal(nextStrengthPlan(records, "2026-10-15")?.id, strength.id);
  assert.deepEqual(
    records.map((s) => s.id),
    order,
  );
  assert.equal(
    nextStrengthPlan([cardio, past, deleted, completed, unknown], "2026-10-15"),
    undefined,
  );
});
