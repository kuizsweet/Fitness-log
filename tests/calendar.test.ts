import test from "node:test";
import assert from "node:assert/strict";
import {
  calendarMonth,
  fiveRowCalendarDays,
  changeCalendarMonth,
  trainingMarkers,
} from "../src/lib/calendar";
import { newSession } from "../src/lib/domain";
test("固定五行日历完整保留日期和星期，第六行折回首行空格", () => {
  assert.deepEqual(fiveRowCalendarDays("2026-08-01").slice(0, 7), [
    31,
    null,
    null,
    null,
    null,
    1,
    2,
  ]);
  for (let year = 2020; year <= 2030; year++) {
    for (let month = 1; month <= 12; month++) {
      const date = `${year}-${String(month).padStart(2, "0")}-01`;
      const cells = fiveRowCalendarDays(date);
      assert.equal(cells.length, 35);
      assert.equal(
        new Set(cells.filter((day) => day !== null)).size,
        calendarMonth(date).days,
      );
      cells.forEach((day, index) => {
        if (day !== null)
          assert.equal(
            index % 7,
            (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7,
          );
      });
    }
  }
});
test("日历跨年、闰年与月末日期保持有效", () => {
  assert.equal(calendarMonth("2024-02-29").days, 29);
  assert.equal(calendarMonth("2026-02-01").days, 28);
  assert.equal(calendarMonth("2026-10-14").offset, 3);
  assert.equal(changeCalendarMonth("2026-01-31", 2026, 2), "2026-02-28");
  assert.equal(changeCalendarMonth("2026-12-31", 2027, 1), "2027-01-31");
});
test("日历显示训练分类与真实计划，未分类及删除记录不冒充分类", () => {
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
    ["strength"],
  );
  assert.deepEqual(trainingMarkers([strength], "2026-10-15"), ["idle"]);
});
