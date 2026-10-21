import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLoadDays,
  buildRollingLoad,
  loadRanges,
  loadGeometry,
  type LoadEntry,
} from "../src/lib/training-load";
import { calendarMonth, fiveRowCalendarDays } from "../src/lib/calendar";

test("week-start preference aligns weekly aggregation and five-row calendars", () => {
  const monday = loadRanges("2026-10-07", "weeks", 1)[23];
  const sunday = loadRanges("2026-10-07", "weeks", 0)[23];
  assert.deepEqual(monday, { date: "2026-10-05", end: "2026-10-11" });
  assert.deepEqual(sunday, { date: "2026-10-04", end: "2026-10-10" });
  assert.equal(calendarMonth("2026-10-07", 1).offset, 3);
  assert.equal(calendarMonth("2026-10-07", 0).offset, 4);
  for (const start of [0, 1] as const) {
    const cells = fiveRowCalendarDays("2026-08-07", start);
    assert.equal(cells.length, 35);
    assert.equal(new Set(cells.filter((day) => day !== null)).size, 31);
  }
});

test("rolling windows contain thirty days or twenty-four Monday-to-Sunday calendar weeks", () => {
  const days = loadRanges("2026-01-05", "days");
  assert.equal(days.length, 30);
  assert.equal(days[0].date, "2025-12-07");
  assert.equal(days[29].end, "2026-01-05");
  const weeks = loadRanges("2026-01-05", "weeks");
  assert.equal(weeks.length, 24);
  assert.equal(weeks[23].date, "2026-01-05");
  assert.equal(weeks[23].end, "2026-01-11");
  assert.deepEqual(loadRanges("2026-10-07", "weeks")[23], {
    date: "2026-10-05",
    end: "2026-10-11",
  });
  assert.deepEqual(loadRanges("2026-10-11", "weeks")[23], {
    date: "2026-10-05",
    end: "2026-10-11",
  });
  for (const week of weeks) {
    assert.equal(new Date(week.date).getUTCDay(), 1);
    assert.equal(new Date(week.end).getUTCDay(), 0);
  }
  for (let i = 1; i < weeks.length; i++)
    assert.equal(
      Date.parse(weeks[i].date) - Date.parse(weeks[i - 1].end),
      86400000,
    );
  assert.equal(loadRanges("2024-03-01", "days")[28].date, "2024-02-29");
});
test("rolling week sums days once, groups notes and ignores future and out-of-window entries", () => {
  const base: LoadEntry = {
    date: "2026-01-05",
    noteId: "chest",
    noteTitle: "胸部",
    noteColor: "red",
    strengthSets: 5,
    cardioMinutes: 0,
  };
  const days = buildRollingLoad("2026-01-05", "weeks", [
    base,
    { ...base, date: "2025-12-30", strengthSets: 30 },
    { ...base, date: "2026-01-06", strengthSets: 999 },
    { ...base, date: "2020-01-01", strengthSets: 999 },
    { ...base, date: "2025-12-29", strengthSets: 7 },
  ]);
  assert.equal(days.length, 24);
  assert.equal(days[23].sets, 5);
  assert.equal(days[23].entries.length, 1);
  assert.equal(days[22].sets, 37);
  assert.equal(
    days.reduce((sum, bucket) => sum + bucket.sets, 0),
    42,
  );
});
test("load retains every note colour and gives 30 sets six times the height of 5", () => {
  const entry = (
    date: string,
    sets: number,
    color: LoadEntry["noteColor"],
  ): LoadEntry => ({
    date,
    noteId: color,
    noteTitle: color,
    noteColor: color,
    strengthSets: sets,
    cardioMinutes: 0,
  });
  const days = buildLoadDays(
    ["2026-10-19", "2026-10-20"],
    [entry("2026-10-19", 5, "blue"), entry("2026-10-20", 30, "red")],
  );
  const shape = loadGeometry(days);
  assert.equal(shape[1].strength[0].height / shape[0].strength[0].height, 6);
  assert.equal(shape[0].strength[0].color, "blue");
  assert.equal(shape[1].strength[0].color, "red");
});
test("load scales sets and minutes independently, keeps gaps and skips invalid magnitudes", () => {
  const entries: LoadEntry[] = ["red", "green", "yellow", "blue"].map(
    (color, i) => ({
      date: "2026-10-20",
      noteId: `${i}`,
      noteTitle: color,
      noteColor: color as LoadEntry["noteColor"],
      strengthSets: i + 1,
      cardioMinutes: (i + 1) * 10,
    }),
  );
  const snapshot = JSON.stringify(entries);
  const days = buildLoadDays(
    ["2026-10-20", "2026-10-21"],
    [
      ...entries,
      {
        ...entries[0],
        date: "2026-10-21",
        strengthSets: NaN,
        cardioMinutes: -10,
      },
    ],
  );
  const shape = loadGeometry(days);
  assert.equal(days[0].sets, 10);
  assert.equal(days[0].minutes, 100);
  assert.equal(shape[0].top, 84);
  assert.equal(shape[0].bottom, 30);
  assert.ok(
    Math.abs(shape[0].strength[1].offset - shape[0].strength[0].height - 2) <
      1e-8,
  );
  assert.deepEqual(shape[1].strength, []);
  assert.deepEqual(shape[1].cardio, []);
  assert.equal(JSON.stringify(entries), snapshot);
});
test("an extreme day shrinks other bars without raising the fixed plot ceiling", () => {
  const make = (date: string, sets: number): LoadEntry => ({
    date,
    noteId: "chest",
    noteTitle: "胸部",
    noteColor: "red",
    strengthSets: sets,
    cardioMinutes: 0,
  });
  const before = loadGeometry(
    buildLoadDays(
      ["2026-10-01", "2026-10-02"],
      [make("2026-10-01", 5), make("2026-10-02", 30)],
    ),
    44,
    16,
  );
  const after = loadGeometry(
    buildLoadDays(
      ["2026-10-01", "2026-10-02"],
      [make("2026-10-01", 5), make("2026-10-02", 3000)],
    ),
    44,
    16,
  );
  assert.equal(before[1].top, after[1].top);
  assert.ok(after[1].top <= 44);
  assert.ok(after[0].top < before[0].top / 99);
});
