"use client";
import {
  calendarMonth,
  changeCalendarMonth,
  calendarDayState,
  type CalendarDayState,
} from "@/lib/calendar";
import { today } from "@/lib/domain";
import {
  TRAINING_FROM,
  TRAINING_TO,
  trainingPaths,
  type CalendarTraining,
} from "@/lib/training-queries";
import { useMemo, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarWriter } from "@/lib/calendar-writer";
import { api } from "@/lib/client";
import { resourceKey } from "@/lib/resource-keys";
import { applyResourceChange } from "@/lib/training-cache";
import { useResourceUser } from "../ResourceProvider";
import { Button } from "../ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Dashboard.module.css";

export function TrainingMonthCalendar({
  date,
  timezone,
  sessions,
  loading,
  error,
  onSelect,
  checkedDate,
}: {
  date: string;
  timezone: string;
  sessions: CalendarTraining[];
  loading: boolean;
  error: string;
  onSelect: (date: string) => void;
  checkedDate?: string;
}) {
  const info = calendarMonth(date);
  const currentDay = today(timezone);
  const user = useResourceUser();
  const client = useQueryClient();
  const writer = useMemo(
    () =>
      new CalendarWriter(async (day, mode) => {
        try {
          const result = await api<CalendarDayState>(
            "calendar",
            {
              owner_id: user,
              date: day.training_date,
              mode,
              version: day.version,
            },
            "POST",
            { notify: false, signal: AbortSignal.timeout(15000) },
          );
          await applyResourceChange(client, user, {
            owner: user,
            resource: "calendar",
            method: "POST",
            result,
          });
          return result;
        } catch (error) {
          const month = calendarMonth(day.training_date);
          void client.invalidateQueries({
            queryKey: resourceKey(
              user,
              trainingPaths.calendar(month.from, month.to),
            ),
            exact: true,
          });
          throw error;
        }
      }),
    [client, user],
  );
  const edits = useSyncExternalStore(
    writer.subscribe,
    writer.getSnapshot,
    writer.getSnapshot,
  );
  const modeNames = {
    rest: "休息",
    strength: "力量",
    cardio: "有氧",
    mixed: "力量与有氧",
  };
  function step(amount: number) {
    const next = new Date(Date.UTC(info.year, info.month - 1 + amount, 1));
    onSelect(
      changeCalendarMonth(date, next.getUTCFullYear(), next.getUTCMonth() + 1),
    );
  }
  return (
    <section
      className={styles.monthCalendar}
      aria-label="训练月历"
      aria-busy={loading}
    >
      <div className={styles.calendarHeading}>
        <Button
          className={styles.calendarMonthArrow}
          aria-label="上一月"
          disabled={info.from <= TRAINING_FROM}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </Button>
        <div className={styles.calendarPeriod}>
          <select
            aria-label="年份"
            value={info.year}
            onChange={(e) =>
              onSelect(
                changeCalendarMonth(date, Number(e.target.value), info.month),
              )
            }
          >
            {Array.from({ length: 11 }, (_, i) => 2020 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button onClick={() => onSelect(currentDay)}>今天</Button>
          <select
            aria-label="月份"
            value={info.month}
            onChange={(e) =>
              onSelect(
                changeCalendarMonth(date, info.year, Number(e.target.value)),
              )
            }
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>
        <Button
          className={styles.calendarMonthArrow}
          aria-label="下一月"
          disabled={info.to >= TRAINING_TO}
          onClick={() => step(1)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
      <div className={styles.calendarGrid}>
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span className={styles.calendarWeekday} key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const number = i - info.offset + 1;
          if (number < 1 || number > info.days)
            return (
              <span
                className={styles.calendarBlank}
                key={i}
                aria-hidden="true"
              />
            );
          const day = `${date.slice(0, 7)}-${String(number).padStart(2, "0")}`;
          const state = calendarDayState(sessions, day);
          const edit = edits[day];
          const mode = edit
            ? edit.error
              ? state.mode
              : edit.desired
            : state.mode;
          const description =
            loading || error
              ? "记录未载入"
              : `${modeNames[mode]}${state.locked ? "，已有训练内容" : ""}`;
          return (
            <button
              className={styles.calendarDay}
              key={i}
              aria-label={`${day}，${description}${day === checkedDate ? "，已签到" : ""}`}
              title={`${day}，${description}${day === checkedDate ? "，已签到" : ""}`}
              data-mode={
                loading || (error && !sessions.length) ? undefined : mode
              }
              data-checked-in={day === checkedDate || undefined}
              aria-pressed={date === day}
              aria-current={day === currentDay ? "date" : undefined}
              onClick={() => {
                onSelect(day);
                if (!loading && !error && !state.locked) writer.cycle(state);
              }}
            >
              <span>{number}</span>
              {day === checkedDate && (
                <span className={styles.calendarCheck} aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className={styles.calendarFooter}>
        <div className={styles.calendarLegend} aria-label="训练类型图例">
          <span>
            <i
              className={`${styles.dayDot} ${styles["dot-strength"]}`}
              aria-hidden="true"
            />
            力量
          </span>
          <span>
            <i
              className={`${styles.dayDot} ${styles["dot-cardio"]}`}
              aria-hidden="true"
            />
            有氧
          </span>
          <span title="力量与有氧">
            <i
              className={`${styles.dayDot} ${styles["dot-mixed"]}`}
              aria-hidden="true"
            />
            混合
          </span>
          <span>
            <i
              className={`${styles.dayDot} ${styles["dot-idle"]}`}
              aria-hidden="true"
            />
            休息
          </span>
        </div>
      </div>
      {Object.entries(edits)
        .filter(([, edit]) => edit.error)
        .map(([day, edit]) => (
          <div key={day} className={styles.calendarError}>
            <span role="alert">
              {day}：{edit.error}
            </span>
            <Button
              onClick={async () => {
                try {
                  const fresh = await api<CalendarDayState>(
                    `calendar?date=${day}`,
                  );
                  writer.retry(fresh);
                } catch {
                  /* Keep the failed edit and its retry control available. */
                }
              }}
            >
              重试
            </Button>
          </div>
        ))}
    </section>
  );
}
