"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { workingSets } from "@/lib/domain";
import { TrainingCalendar } from "./TrainingCalendar";
import { MealsCard } from "./MealsCard";
import { Feedback } from "./Feedback";
import { Checkins } from "./Checkins";
import { DeletedRecords } from "./dashboard/DeletedRecords";
import {
  useDashboardData,
  type DashboardData,
} from "./dashboard/useDashboardData";
import { DesktopDashboard } from "./dashboard/DesktopDashboard";

const desktopQuery = "(min-width: 961px)";
function subscribeDesktop(change: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", change);
  return () => media.removeEventListener("change", change);
}
export function Dashboard({ initialDate }: { initialDate?: string }) {
  const data = useDashboardData(initialDate);
  const desktop = useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => null,
  );
  if (desktop === null) return <p role="status">加载控制台…</p>;
  return desktop ? (
    <DesktopDashboard data={data} />
  ) : (
    <LegacyDashboard data={data} />
  );
}

// Retained for the existing small-screen presentation, outside this PC phase.
function LegacyDashboard({ data }: { data: DashboardData }) {
  const { profile, date, sessions, meals, records, setPicked } = data;
  const [showDeleted, setShowDeleted] = useState(false);
  return (
    <div className="dashboard-board">
      <TrainingCalendar
        date={date}
        timezone={profile.data?.timezone ?? "Asia/Shanghai"}
        sessions={sessions.data ?? []}
        loading={sessions.loading}
        error={sessions.error || profile.error}
        onSelect={setPicked}
      />
      <section
        className="module module-training daily-training"
        aria-labelledby="training-title"
      >
        <Feedback
          error={sessions.error || profile.error}
          loading={sessions.loading}
        />
        <div className="module-heading">
          <h2 id="training-title">当天训练</h2>
          <span>{date}</span>
        </div>
        {!sessions.loading && !sessions.error && !records.length && (
          <p className="empty-state">这一天还没有训练记录，可以只记录饮食。</p>
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
              {s.exercises.map((e) => e.exercise_name).join("、") ||
                "未添加动作"}
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
        <details
          className="deleted-records"
          onToggle={(event) => setShowDeleted(event.currentTarget.open)}
        >
          <summary>已删除记录</summary>
          {showDeleted && (
            <DeletedRecords key={date} date={date} reload={sessions.reload} />
          )}
        </details>
      </section>
      <section
        className="module module-checkin daily-checkin"
        aria-label="签到与排行榜"
      >
        <Checkins compact />
      </section>
      <MealsCard
        key={date}
        date={date}
        meals={meals.data ?? []}
        ready={Boolean(meals.data)}
        loading={meals.loading}
        error={meals.error}
        reload={meals.reload}
      />
      <div className="module reserved-card" aria-hidden="true" />
    </div>
  );
}
