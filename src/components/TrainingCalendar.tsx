"use client";
import {
  calendarMonth,
  changeCalendarMonth,
  trainingMarkers,
} from "@/lib/calendar";
import { today, type Session } from "@/lib/domain";
import { Feedback } from "./Feedback";

export function TrainingCalendar({
  date,
  timezone,
  sessions,
  loading,
  error,
  onSelect,
  checkedDate,
  title = "训练日历",
}: {
  date: string;
  timezone: string;
  sessions: Session[];
  loading: boolean;
  error: string;
  onSelect: (date: string) => void;
  checkedDate?: string;
  title?: string;
}) {
  const info = calendarMonth(date);
  const currentDay = today(timezone);
  function step(amount: number) {
    const next = new Date(Date.UTC(info.year, info.month - 1 + amount, 1));
    onSelect(
      changeCalendarMonth(date, next.getUTCFullYear(), next.getUTCMonth() + 1),
    );
  }
  return (
    <section
      className="module training-calendar"
      aria-label={title}
      aria-busy={loading}
    >
      <div className="calendar-heading">
        <h2>{title}</h2>
        <div className="calendar-period">
          <select
            aria-label="年份"
            value={info.year}
            onChange={(e) =>
              onSelect(
                changeCalendarMonth(date, Number(e.target.value), info.month),
              )
            }
          >
            {Array.from({ length: 201 }, (_, i) => 1900 + i).map((year) => (
              <option key={year} value={year}>
                {year} 年
              </option>
            ))}
          </select>
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
                {month} 月
              </option>
            ))}
          </select>
        </div>
        <div className="calendar-actions">
          <button
            aria-label="上一月"
            disabled={info.year === 1900 && info.month === 1}
            onClick={() => step(-1)}
          >
            ‹
          </button>
          <button
            aria-label="下一月"
            disabled={info.year === 2100 && info.month === 12}
            onClick={() => step(1)}
          >
            ›
          </button>
          <button onClick={() => onSelect(currentDay)}>今天</button>
        </div>
      </div>
      <div className="training-calendar-grid">
        {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
          <span className="calendar-weekday" key={day}>
            {day}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const number = i - info.offset + 1;
          if (number < 1 || number > info.days)
            return (
              <span className="calendar-blank" key={i} aria-hidden="true" />
            );
          const day = `${date.slice(0, 7)}-${String(number).padStart(2, "0")}`;
          const markers = trainingMarkers(sessions, day);
          const description =
            loading || error
              ? "记录未载入"
              : markers.includes("strength") || markers.includes("cardio")
                ? markers
                    .map((m) =>
                      m === "strength" ? "力量" : m === "cardio" ? "有氧" : "",
                    )
                    .filter(Boolean)
                    .join("、")
                : "无分类标记";
          return (
            <button
              className="calendar-day"
              key={i}
              aria-label={`${day}，${description}${day === checkedDate ? "，已签到" : ""}`}
              title={`${day}，${description}${day === checkedDate ? "，已签到" : ""}`}
              data-checked-in={day === checkedDate || undefined}
              aria-pressed={date === day}
              aria-current={day === currentDay ? "date" : undefined}
              onClick={() => onSelect(day)}
            >
              <span>{number}</span>
              <span className="calendar-dots" aria-hidden="true">
                {markers.map((type) => (
                  <i key={type} className={`day-dot dot-${type}`} />
                ))}
              </span>
              {day === checkedDate && (
                <span className="calendar-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Feedback error={error} loading={loading} />
    </section>
  );
}
