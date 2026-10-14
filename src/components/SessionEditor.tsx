"use client";
import { useState } from "react";
import { useUnsaved } from "./useUnsaved";
import { useResource } from "./resource";
import { api } from "@/lib/client";
import {
  newSession,
  sessionSchema,
  today,
  workingSets,
  type Session,
  type Exercise,
  type Equipment,
  type Profile,
} from "@/lib/domain";
import { ExerciseEditor } from "./ExerciseEditor";
import { Feedback } from "./Feedback";
export function SessionLoader({
  id,
  date,
  active = false,
}: {
  id?: string;
  date?: string;
  active?: boolean;
}) {
  const profile = useResource<Profile>("profile");
  const query = useResource<Session[]>(
    id
      ? `sessions?id=${id}`
      : `sessions?from=${date ?? today()}&to=${date ?? today()}`,
  );
  if (id && query.loading) return <Feedback loading />;
  if (id && query.error) return <Feedback error={query.error} />;
  const initial = id ? query.data?.[0] : undefined;
  if (id && !initial) return <p>训练不存在或已删除。</p>;
  if (!id && profile.loading) return <Feedback loading />;
  if (!id && profile.error) return <Feedback error={profile.error} />;
  return (
    <SessionEditor
      initial={initial}
      date={date ?? today(profile.data?.timezone)}
      active={active}
    />
  );
}
export function SessionEditor({
  initial,
  date,
  active,
}: {
  initial?: Session;
  date?: string;
  active?: boolean;
}) {
  const [session, setSession] = useState<Session>(
    () => initial ?? newSession(date ?? today(), active),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const profile = useResource<Profile>("profile");
  const catalog = useResource<{
    exercises: Exercise[];
    equipment: Equipment[];
  }>("catalog");
  useUnsaved(dirty);
  function change(s: Session) {
    setSession(s);
    setDirty(true);
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const clean = sessionSchema.parse(session);
      const result = await api<{ revision: number }>("sessions", clean);
      setSession((s) => ({ ...s, revision: result.revision }));
      setDirty(false);
      setMessage("训练已保存到数据库");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  function move(index: number, step: number) {
    const exercises = [...session.exercises];
    [exercises[index], exercises[index + step]] = [
      exercises[index + step],
      exercises[index],
    ];
    change({ ...session, exercises });
  }
  return (
    <>
      <h1>{active ? "训练" : "编辑训练记录"}</h1>
      <Feedback error={catalog.error} loading={catalog.loading} />
      <fieldset disabled={busy}>
        <legend>{session.revision ? "已保存的训练" : "新训练"}</legend>
        <div className="row">
          <label>
            训练日期
            <input
              required
              type="date"
              value={session.training_date}
              onChange={(e) =>
                e.target.value &&
                change({ ...session, training_date: e.target.value })
              }
            />
          </label>
          <label>
            状态
            <select
              value={session.status}
              onChange={(e) =>
                change({
                  ...session,
                  status: e.target.value as Session["status"],
                })
              }
            >
              <option value="planned">计划</option>
              <option value="in_progress">进行中</option>
              <option value="paused">暂停</option>
              <option value="completed">完成</option>
            </select>
          </label>
          <label>
            训练类型
            <select
              value={session.training_type ?? ""}
              onChange={(e) =>
                change({
                  ...session,
                  training_type: (e.target.value ||
                    null) as Session["training_type"],
                })
              }
            >
              <option value="">未分类</option>
              <option value="strength">力量</option>
              <option value="cardio">有氧</option>
            </select>
          </label>
        </div>
        <label>
          训练备注
          <textarea
            value={session.notes}
            onChange={(e) => change({ ...session, notes: e.target.value })}
          />
        </label>
        {session.status !== "planned" && (
          <div className="row">
            <button
              onClick={() =>
                change({
                  ...session,
                  status:
                    session.status === "paused" ? "in_progress" : "paused",
                  started_at: session.started_at ?? new Date().toISOString(),
                  paused_at:
                    session.status === "paused"
                      ? null
                      : new Date().toISOString(),
                })
              }
            >
              {session.status === "paused" ? "恢复训练" : "暂停训练"}
            </button>
            <button
              onClick={() =>
                change({
                  ...session,
                  status: "completed",
                  ended_at: new Date().toISOString(),
                })
              }
            >
              标记训练结束
            </button>
          </div>
        )}
        <small>完成组、暂停或结束后，点击“保存训练”提交。</small>
      </fieldset>
      {session.exercises.map((ex, i) => (
        <ExerciseEditor
          key={ex.id}
          exercise={ex}
          disabled={busy}
          defaultUnit={profile.data?.unit}
          equipment={catalog.data?.equipment ?? []}
          date={session.training_date}
          first={i === 0}
          last={i === session.exercises.length - 1}
          change={(e) =>
            change({
              ...session,
              exercises: session.exercises.map((item) =>
                item.id === e.id ? e : item,
              ),
            })
          }
          move={(step) => move(i, step)}
          remove={() => {
            if (confirm("删除此动作及其组？保存后生效。"))
              change({
                ...session,
                exercises: session.exercises.filter((e) => e.id !== ex.id),
              });
          }}
        />
      ))}
      <div className="row">
        <label>
          添加动作
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            <option value="">请选择</option>
            {catalog.data?.exercises
              .filter((e) => !e.hidden && !e.deleted_at)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </select>
        </label>
        <button
          disabled={busy || !exerciseId}
          onClick={() => {
            const ex = catalog.data!.exercises.find(
              (e) => e.id === exerciseId,
            )!;
            change({
              ...session,
              exercises: [
                ...session.exercises,
                {
                  id: crypto.randomUUID(),
                  exercise_id: ex.id,
                  exercise_name: ex.name,
                  muscle_group: ex.muscle_group,
                  equipment_id: null,
                  equipment_snapshot: null,
                  notes: "",
                  sets: [],
                },
              ],
            });
          }}
        >
          添加
        </button>
        <a href="/catalog">管理动作及器材</a>
      </div>
      {!catalog.loading &&
        !catalog.data?.exercises.some((e) => !e.deleted_at && !e.hidden) && (
          <p>先到“动作与器材”添加动作或从预设库选择。</p>
        )}
      <p>
        {workingSets(session)} 个正式组{dirty ? " · 有未保存的修改" : ""}
      </p>
      <div className="row">
        <button
          className="primary"
          disabled={busy || catalog.loading || Boolean(catalog.error)}
          onClick={() => void save()}
        >
          保存训练
        </button>
        <a href={`/dashboard?date=${session.training_date}`}>返回控制台</a>
        {session.revision > 0 && (
          <button
            disabled={busy}
            onClick={async () => {
              if (
                !confirm("删除本次训练？可以在当天控制台的已删除记录中恢复。")
              )
                return;
              setBusy(true);
              setError("");
              try {
                await api(
                  "sessions",
                  {
                    id: session.id,
                    revision: session.revision,
                    restore: false,
                  },
                  "PATCH",
                );
                setDirty(false);
                window.location.assign(
                  `/dashboard?date=${session.training_date}`,
                );
              } catch (e) {
                setError((e as Error).message);
                setBusy(false);
              }
            }}
          >
            删除训练
          </button>
        )}
      </div>
      <Feedback error={error} message={message} loading={busy} />
    </>
  );
}
