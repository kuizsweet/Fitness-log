"use client";
import { useState } from "react";
import Link from "next/link";
import { useResource } from "./resource";
import {
  today,
  shiftDate,
  workingSets,
  type Profile,
  type Session,
  type Meal,
} from "@/lib/domain";
import { Meals } from "./Meals";
import { Feedback } from "./Feedback";
export function Journal({ initialDate }: { initialDate?: string }) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const date = picked || today(profile.data?.timezone);
  const monthStart = date.slice(0, 7) + "-01";
  const monthEnd = new Date(
    Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
  const sessions = useResource<Session[]>(
    `sessions?from=${monthStart}&to=${monthEnd}`,
  );
  const meals = useResource<Meal[]>(`meals?date=${date}`);
  const records = sessions.data?.filter((s) => s.training_date === date) ?? [];
  const count = Number(monthEnd.slice(8));
  const offset = (new Date(`${monthStart}T12:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <>
      <h1>日志</h1>
      <div className="row">
        <button onClick={() => setPicked(shiftDate(date, -1))}>前一天</button>
        <label>
          记录日期
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setPicked(e.target.value)}
          />
        </label>
        <button onClick={() => setPicked(shiftDate(date, 1))}>后一天</button>
        <button onClick={() => setPicked(today(profile.data?.timezone))}>
          今天
        </button>
      </div>
      <small>日期时区：{profile.data?.timezone ?? "Asia/Shanghai"}</small>
      <details>
        <summary>月历 · {date.slice(0, 7)}</summary>
        <div className="row">
          <button onClick={() => setPicked(shiftDate(monthStart, -1))}>
            上一月
          </button>
          <button onClick={() => setPicked(shiftDate(monthEnd, 1))}>
            下一月
          </button>
        </div>
        <div className="calendar">
          {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
            <span key={d}>{d}</span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={`blank${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = `${date.slice(0, 7)}-${String(i + 1).padStart(2, "0")}`;
            const n =
              sessions.data?.filter((s) => s.training_date === d).length ?? 0;
            return (
              <button
                key={d}
                aria-label={`${d}${n ? `，${n} 次训练` : ""}`}
                aria-pressed={date === d}
                onClick={() => setPicked(d)}
              >
                {i + 1}
                {n > 0 && <small>{n}次</small>}
              </button>
            );
          })}
        </div>
      </details>
      <Feedback
        error={sessions.error || profile.error}
        loading={sessions.loading}
      />
      <h2>{date} · 训练</h2>
      {!sessions.loading && !sessions.error && !records.length && (
        <p className="muted">这一天还没有训练记录，可以只记录饮食。</p>
      )}
      {records.map((s) => (
        <article className="entry" key={s.id}>
          <Link href={`/session/${s.id}`}>
            {s.status === "planned"
              ? "计划训练"
              : s.status === "in_progress"
                ? "进行中"
                : s.status === "paused"
                  ? "已暂停"
                  : "训练记录"}{" "}
            ·{" "}
            {s.exercises.map((e) => e.exercise_name).join("、") || "未添加动作"}
          </Link>
          <p>
            {s.exercises.length} 个动作 · {workingSets(s)} 个正式组
            {s.import_batch_id ? " · Excel 导入" : ""}
          </p>
          {s.notes && <p>{s.notes}</p>}
        </article>
      ))}
      <div className="row">
        <Link className="button primary" href={`/session/new?date=${date}`}>
          新增训练记录
        </Link>
        <Link className="button" href={`/train?date=${date}`}>
          开始训练
        </Link>
      </div>
      <h2>三餐</h2>
      <Feedback error={meals.error} loading={meals.loading} />
      {!meals.loading && !meals.error && (
        <Meals
          key={date}
          date={date}
          meals={meals.data ?? []}
          reload={meals.reload}
        />
      )}
    </>
  );
}
