"use client";
import { useState } from "react";
import Link from "next/link";
import { useUnsaved } from "./useUnsaved";
import { useResource } from "./resource";
import { useTrainingClock } from "./useTrainingClock";
import { api } from "@/lib/client";
import {
  newSession,
  newSet,
  sessionSchema,
  today,
  workingSets,
  modeNames,
  type Session,
  type Exercise,
  type Equipment,
  type Profile,
} from "@/lib/domain";
import {
  clockText,
  elapsedSeconds,
  repeatSession,
  trainingSummary,
} from "@/lib/training";
import { ExerciseEditor } from "./ExerciseEditor";
import { ExercisePicker } from "./ExercisePicker";
import { Feedback } from "./Feedback";
import styles from "./Training.module.css";

export function SessionLoader({
  id,
  date,
  active = false,
  planned = false,
  template,
}: {
  id?: string;
  date?: string;
  active?: boolean;
  planned?: boolean;
  template?: string;
}) {
  const profile = useResource<Profile>("profile");
  const sourceId = id ?? template;
  const query = useResource<Session[]>(
    `sessions?id=${sourceId}`,
    false,
    Boolean(sourceId),
  );
  if (profile.loading || (sourceId && query.loading))
    return <Feedback loading />;
  if (
    (!profile.data && profile.error) ||
    (sourceId && !query.data && query.error)
  )
    return (
      <>
        <Feedback error={profile.error || query.error} />
        <button
          onClick={() => {
            profile.reload();
            if (sourceId) query.reload();
          }}
        >
          重试
        </button>
      </>
    );
  if (sourceId && !query.data?.[0]) return <p>训练不存在或已删除。</p>;
  return (
    <>
      <Feedback error={profile.error || (sourceId ? query.error : "")} />
      <SessionEditor
        key={`${id ?? "new"}-${template ?? ""}-${date}-${active}-${planned}`}
        initial={id ? query.data?.[0] : undefined}
        source={template ? query.data?.[0] : undefined}
        date={date ?? today(profile.data?.timezone)}
        active={active}
        planned={planned}
        userId={profile.data?.user_id}
        defaultUnit={profile.data?.unit}
      />
    </>
  );
}

export function SessionEditor({
  initial,
  source,
  date,
  active,
  planned,
  userId,
  defaultUnit = "kg",
}: {
  initial?: Session;
  source?: Session;
  date?: string;
  active?: boolean;
  planned?: boolean;
  userId?: string;
  defaultUnit?: "kg" | "lb";
}) {
  const [session, setSession] = useState<Session>(() => {
    const s =
      initial ??
      (source
        ? repeatSession(source, date ?? today())
        : newSession(date ?? today(), active));
    return !initial && planned
      ? { ...s, status: "planned", started_at: null }
      : s;
  });
  const [dirty, setDirty] = useState(Boolean(source));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [summarized, setSummarized] = useState(false);
  const clock = useTrainingClock(userId, session.id);
  const catalog = useResource<{
    exercises: Exercise[];
    equipment: Equipment[];
  }>("catalog");
  useUnsaved(dirty);
  const live = session.status === "in_progress" || session.status === "paused";
  function change(s: Session) {
    setSession(s);
    setDirty(true);
    setMessage("");
    setSummarized(false);
  }
  async function save(candidate = session, finish = false) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const clean = sessionSchema.parse(candidate);
      const result = await api<{ revision: number }>("sessions", clean);
      setSession({ ...clean, revision: result.revision });
      setDirty(false);
      if (clean.status === "completed") clock.stopRest();
      if (finish) {
        clock.stopRest();
        setSummarized(true);
      } else
        setMessage(session.status === "planned" ? "计划已保存" : "训练已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }
  function finish() {
    if (!confirm("结束并保存本次训练？未完成的组仍会保留。")) return;
    const ended = {
      ...session,
      status: "completed" as const,
      ended_at: new Date().toISOString(),
      paused_at: null,
    };
    change(ended);
    void save(ended, true);
  }
  function move(index: number, step: number) {
    const exercises = [...session.exercises];
    [exercises[index], exercises[index + step]] = [
      exercises[index + step],
      exercises[index],
    ];
    change({ ...session, exercises });
  }
  function add(ex: Exercise) {
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
          sets: [newSet(defaultUnit)],
        },
      ],
    });
  }
  const summary = trainingSummary(session);
  if (summarized)
    return (
      <section
        className={styles.summary}
        aria-labelledby="training-summary-title"
      >
        <h1 id="training-summary-title">训练已保存</h1>
        <p className={styles.muted}>{session.training_date}</p>
        <dl>
          <div>
            <dt>训练历时</dt>
            <dd>
              {session.started_at
                ? clockText(
                    elapsedSeconds(
                      session.started_at,
                      session.ended_at,
                      clock.now ?? Date.now(),
                    ),
                  )
                : "—"}
            </dd>
          </div>
          <div>
            <dt>完成动作</dt>
            <dd>{summary.exercises}</dd>
          </div>
          <div>
            <dt>完成正式组</dt>
            <dd>{summary.workSets}</dd>
          </div>
          <div>
            <dt>完成总组数</dt>
            <dd>{summary.sets}</dd>
          </div>
        </dl>
        {summary.volumes.map((v) => (
          <p key={v.mode + v.unit}>
            {modeNames[v.mode]} × 次数：{v.value} {v.unit}·次
          </p>
        ))}
        <div className="row">
          <Link
            className="button primary"
            href={`/dashboard?date=${session.training_date}`}
          >
            完成
          </Link>
          <button onClick={() => setSummarized(false)}>查看记录</button>
          <Link
            className="button"
            href={`/session/new?template=${session.id}&planned=1&date=${session.training_date}`}
          >
            存为计划
          </Link>
        </div>
      </section>
    );
  return (
    <div className={styles.editor}>
      <div className={styles.heading}>
        <h1>
          {session.status === "planned"
            ? "训练计划"
            : live
              ? "训练记录"
              : "编辑训练记录"}
        </h1>
        <Link href="/config">配置</Link>
      </div>
      <Feedback error={catalog.error} loading={catalog.loading} />
      {catalog.error && (
        <button onClick={catalog.reload}>重新加载动作库</button>
      )}
      <fieldset disabled={busy}>
        <div className={styles.toolbar}>
          <div className={styles.clock}>
            <small>训练历时</small>
            <strong>
              {session.started_at && clock.now
                ? clockText(
                    elapsedSeconds(
                      session.started_at,
                      session.ended_at,
                      clock.now,
                    ),
                  )
                : "—"}
            </strong>
          </div>
          {live && (
            <div className={styles.clock}>
              <small>休息</small>
              <strong>
                {clock.rest && clock.now
                  ? clockText(
                      elapsedSeconds(clock.rest.started, null, clock.now),
                    )
                  : "00:00"}
              </strong>
            </div>
          )}
          {live && (
            <div className={styles.actions}>
              {session.status === "in_progress" && (
                <button
                  onClick={() =>
                    clock.rest ? clock.stopRest() : clock.startRest()
                  }
                >
                  {clock.rest ? "继续练习" : "开始休息"}
                </button>
              )}
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
                    ended_at: null,
                  })
                }
              >
                {session.status === "paused" ? "恢复训练" : "暂停训练"}
              </button>
              <button className="primary" onClick={finish}>
                结束训练
              </button>
            </div>
          )}
          {session.status === "planned" && session.revision > 0 && (
            <Link
              className="button primary"
              href={`/session/new?template=${session.id}&date=${today()}`}
            >
              开始计划
            </Link>
          )}
          {session.status === "completed" && !dirty && session.revision > 0 && (
            <button onClick={() => setSummarized(true)}>查看总结</button>
          )}
        </div>
        <details
          className={styles.settings}
          open={session.status === "planned" || undefined}
        >
          <summary>日期、类型与备注</summary>
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
                    started_at: ["in_progress", "paused"].includes(
                      e.target.value,
                    )
                      ? (session.started_at ?? new Date().toISOString())
                      : session.started_at,
                    ended_at:
                      e.target.value === "completed"
                        ? (session.ended_at ??
                          (session.started_at
                            ? new Date().toISOString()
                            : null))
                        : null,
                    paused_at:
                      e.target.value === "paused"
                        ? (session.paused_at ?? new Date().toISOString())
                        : null,
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
              maxLength={4000}
              value={session.notes}
              onChange={(e) => change({ ...session, notes: e.target.value })}
            />
          </label>
        </details>
      </fieldset>
      {session.exercises.map((ex, i) => (
        <ExerciseEditor
          key={ex.id}
          exercise={ex}
          disabled={busy}
          defaultUnit={defaultUnit}
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
          onComplete={(id, completed) => {
            if (session.status !== "in_progress") return;
            if (completed) clock.startRest(id);
            else if (clock.rest?.setId === id) clock.stopRest();
          }}
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
      <div>
        <ExercisePicker
          exercises={catalog.data?.exercises ?? []}
          disabled={busy || catalog.loading || Boolean(catalog.error)}
          add={add}
          reload={catalog.reload}
        />
      </div>
      <div className={styles.footer}>
        <span className={styles.muted}>
          {workingSets(session)} 个正式组 ·{" "}
          {dirty ? "未保存" : session.revision ? "已保存" : "尚未保存"}
        </span>
        <button
          className="primary"
          disabled={busy || catalog.loading || Boolean(catalog.error)}
          onClick={() => void save()}
        >
          {busy
            ? "保存中…"
            : session.status === "planned"
              ? "保存计划"
              : "保存训练"}
        </button>
        {session.status === "completed" && session.started_at && dirty && (
          <button disabled={busy} onClick={() => void save(session, true)}>
            保存并查看总结
          </button>
        )}
        <Link href={`/dashboard?date=${session.training_date}`}>
          返回控制台
        </Link>
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
      <Feedback error={error} message={message} />
    </div>
  );
}
