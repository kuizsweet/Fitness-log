"use client";
import { useState } from "react";
import Link from "next/link";
import { workingSets, type Session } from "@/lib/domain";
import { DeletedRecords } from "./DeletedRecords";
import type { DashboardData } from "./useDashboardData";
import styles from "./Dashboard.module.css";

export function LegacyTrainingConsole({ data }: { data: DashboardData }) {
  const { date, records, sessions } = data;
  const [showDeleted, setShowDeleted] = useState(false);
  const active = records.find((s) =>
    ["in_progress", "paused"].includes(s.status),
  );
  const ready = Boolean(sessions.data);
  const state = active
    ? active.status === "paused"
      ? "训练已暂停"
      : "训练进行中"
    : records.length
      ? "查看当天训练"
      : "准备开始训练";
  return (
    <section
      className={`${styles.card} ${styles.console}`}
      aria-labelledby="console-title"
    >
      <div className={styles.cardHeading}>
        <h2 id="console-title">训练控制台</h2>
        <time dateTime={date}>{date}</time>
      </div>
      <div className={styles.consoleIntro}>
        <p
          className={`${styles.consoleState} ${!ready ? styles.placeholder : ""}`}
          aria-busy={!ready}
        >
          {ready ? state : <span aria-hidden="true">&nbsp;</span>}
        </p>
        <p className={styles.secondary}>
          动作、重量、次数与 RIR，沿用已有训练记录。
        </p>
        <div className={styles.consoleActions}>
          <Link
            className={styles.primaryAction}
            href={
              active
                ? `/session/${active.id}`
                : `/session/new?active=1&date=${date}`
            }
          >
            {active ? "继续训练" : "开始训练"}
          </Link>
          <Link
            className={styles.secondaryAction}
            href={`/session/new?date=${date}`}
          >
            新增训练记录
          </Link>
        </div>
      </div>
      <dl className={styles.summary}>
        <div>
          <dt>{data.hasMore || data.dayPage ? "本页记录" : "当天记录"}</dt>
          <dd>
            {ready ? records.length : "—"}
            <span>次</span>
          </dd>
        </div>
        <div>
          <dt>动作</dt>
          <dd>
            {ready ? records.reduce((n, s) => n + s.exercises.length, 0) : "—"}
            <span>个</span>
          </dd>
        </div>
        <div>
          <dt>正式组</dt>
          <dd>
            {ready ? records.reduce((n, s) => n + workingSets(s), 0) : "—"}
            <span>组</span>
          </dd>
        </div>
      </dl>
      <div className={styles.sessionArea}>
        <div className={styles.sectionHeading}>
          <h3>当天训练记录</h3>
          <span>{date}</span>
        </div>
        {!sessions.data && !sessions.error && (
          <div className={styles.recordSkeleton} aria-hidden="true" />
        )}
        {ready && !records.length && (
          <div className={styles.sessionEmpty}>
            <p>这一天还没有训练记录</p>
            <span>开始一次训练，或补录已经完成的训练。</span>
          </div>
        )}
        <div className={styles.sessionList}>
          {records.map((s) => (
            <SessionRow key={s.id} session={s} />
          ))}
        </div>
        {(data.hasMore || data.dayPage > 0) && (
          <div className={styles.consoleActions}>
            <button
              disabled={data.dayPage === 0}
              onClick={() => data.setDayPage(data.dayPage - 1)}
            >
              上一页
            </button>
            <span>第 {data.dayPage + 1} 页</span>
            <button
              disabled={!data.hasMore}
              onClick={() => data.setDayPage(data.dayPage + 1)}
            >
              下一页
            </button>
          </div>
        )}
      </div>
      <div className={styles.reservedTools} aria-label="训练工具">
        <div>
          <span>训练计时</span>
          <small>训练中查看</small>
        </div>
        <div>
          <span>组间休息</span>
          <small>完成组后正计时</small>
        </div>
        <div>
          <span>力竭分析</span>
          <small>暂未接入</small>
        </div>
      </div>
      <details
        className={styles.deleted}
        onToggle={(event) => setShowDeleted(event.currentTarget.open)}
      >
        <summary>已删除记录</summary>
        {showDeleted && <DeletedRecords key={date} date={date} />}
      </details>
    </section>
  );
}

function SessionRow({ session: s }: { session: Session }) {
  const label = {
    planned: "计划",
    in_progress: "进行中",
    paused: "已暂停",
    completed: "已完成",
  }[s.status];
  return (
    <article className={styles.sessionRow}>
      <Link href={`/session/${s.id}`}>
        <span
          className={styles.sessionStatus}
          data-active={s.status === "in_progress" || undefined}
        >
          {label}
        </span>
        <strong>
          {s.exercises.map((e) => e.exercise_name).join("、") ||
            (s.training_type === "strength"
              ? "力量训练"
              : s.training_type === "cardio"
                ? "有氧训练"
                : "未添加动作")}
        </strong>
        <span className={styles.sessionMeta}>
          {s.exercises.length} 个动作 · {workingSets(s)} 个正式组
          {s.import_batch_id ? " · Excel 导入" : ""}
        </span>
      </Link>
      {s.notes && <p>{s.notes}</p>}
    </article>
  );
}
