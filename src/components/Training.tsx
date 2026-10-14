"use client";
import { useState } from "react";
import { useResource } from "./resource";
import { SessionEditor } from "./SessionEditor";
import { today, type Session, type Profile } from "@/lib/domain";
import { Feedback } from "./Feedback";
export function Training({ initialDate }: { initialDate?: string }) {
  const profile = useResource<Profile>("profile");
  const date = initialDate ?? today(profile.data?.timezone);
  const sessions = useResource<Session[]>("sessions?active=1");
  const [creating, setCreating] = useState(false);
  const active =
    sessions.data?.filter(
      (s) => s.status === "in_progress" || s.status === "paused",
    ) ?? [];
  if (creating) return <SessionEditor date={date} active />;
  return (
    <>
      <h1>训练</h1>
      <p>逐组记录重量与次数，完成后保存。休息计时器将在后续阶段提供。</p>
      <Feedback
        error={sessions.error || profile.error}
        loading={sessions.loading}
      />
      {active.map((s) => (
        <p key={s.id}>
          <a href={`/session/${s.id}`}>
            继续 {s.training_date} 的训练 ·{" "}
            {s.exercises.map((e) => e.exercise_name).join("、") ||
              "尚未添加动作"}
          </a>
        </p>
      ))}
      <button
        className="primary"
        disabled={
          sessions.loading ||
          profile.loading ||
          Boolean(sessions.error || profile.error)
        }
        onClick={() => setCreating(true)}
      >
        开始新的训练
      </button>
    </>
  );
}
