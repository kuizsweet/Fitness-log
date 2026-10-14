import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarMonth,
  changeCalendarMonth,
  trainingMarkers,
} from "../src/lib/calendar";
import { newSession } from "../src/lib/domain";
test("日历跨年、闰年与月末日期保持有效", () => {
  assert.equal(calendarMonth("2024-02-29").days, 29);
  assert.equal(calendarMonth("2026-02-01").days, 28);
  assert.equal(calendarMonth("2026-10-14").offset, 3);
  assert.equal(changeCalendarMonth("2026-01-31", 2026, 2), "2026-02-28");
  assert.equal(changeCalendarMonth("2026-12-31", 2027, 1), "2027-01-31");
});
test("日历按真实分类显示双标记，未分类、计划和删除不冒充训练日", () => {
  const date = "2026-10-14";
  const strength = { ...newSession(date), training_type: "strength" as const };
  const cardio = { ...newSession(date), training_type: "cardio" as const };
  assert.deepEqual(trainingMarkers([], date), ["idle"]);
  assert.deepEqual(trainingMarkers([newSession(date)], date), ["idle"]);
  assert.deepEqual(trainingMarkers([strength, cardio, strength], date), [
    "strength",
    "cardio",
  ]);
  assert.deepEqual(
    trainingMarkers(
      [
        { ...strength, status: "planned" },
        { ...cardio, deleted_at: new Date().toISOString() },
      ],
      date,
    ),
    ["idle"],
  );
  assert.deepEqual(trainingMarkers([strength], "2026-10-15"), ["idle"]);
});
