"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useResource } from "./resource";
import {
  today,
  workingSets,
  type Profile,
  type Session,
  type Meal,
} from "@/lib/domain";
import { calendarMonth } from "@/lib/calendar";
import { TrainingCalendar } from "./TrainingCalendar";
import { MealsCard } from "./MealsCard";
import { Feedback } from "./Feedback";
import { Checkins } from "./Checkins";
import { api } from "@/lib/client";
export function Dashboard({ initialDate }: { initialDate?: string }) {
  const profile = useResource<Profile>("profile");
  const [picked, setPicked] = useState(initialDate ?? "");
  const [showDeleted, setShowDeleted] = useState(false);
  const date = picked || today(profile.data?.timezone);
  const month = calendarMonth(date);
  const sessions = useResource<Session[]>(
    `sessions?from=${month.from}&to=${month.to}`,
    true,
  );
  const meals = useResource<Meal[]>(`meals?date=${date}`, true);
  const records = sessions.data?.filter((s) => s.training_date === date) ?? [];
  const refreshSessions = sessions.reload;
  const refreshMeals = meals.reload;
  useEffect(() => {
    const refresh = () => {
      refreshSessions();
      refreshMeals();
    };
    const changed = (event: Event) => {
      const resource = (event as CustomEvent<{ resource: string }>).detail
        .resource;
      if (["sessions", "imports"].includes(resource)) refreshSessions();
      if (["meals", "photos"].includes(resource)) refreshMeals();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("fitness-data-change", changed);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [refreshSessions, refreshMeals]);
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
function DeletedRecords({
  date,
  reload,
}: {
  date: string;
  reload: () => void;
}) {
  const source = useResource<Session[]>(
    `sessions?from=${date}&to=${date}&deleted=1`,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Feedback
        error={source.error || error}
        loading={source.loading || busy}
      />
      {!source.loading && !source.error && !source.data?.length && (
        <p>这一天没有已删除的训练。</p>
      )}
      {source.data?.map((s) => (
        <div className="entry" key={s.id}>
          <p>
            {s.exercises.map((e) => e.exercise_name).join("、") || "未添加动作"}{" "}
            · {workingSets(s)} 个正式组
          </p>
          <button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(
                  "sessions",
                  { id: s.id, revision: s.revision, restore: true },
                  "PATCH",
                );
                source.reload();
                reload();
              } catch (e) {
                setError(e instanceof Error ? e.message : "恢复失败，请重试");
              } finally {
                setBusy(false);
              }
            }}
          >
            恢复训练
          </button>
        </div>
      ))}
    </>
  );
}
