"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { workingSets, type Session } from "@/lib/domain";
import type { CheckinDashboard } from "@/lib/checkins";
import { ItemsChecklist } from "./ItemsChecklist";

import { TrainingMonthCalendar } from "./TrainingMonthCalendar";
import { Checkins } from "../Checkins";
import { Feedback } from "../Feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DeletedRecords } from "./DeletedRecords";
import { BodyGoalCard } from "./BodyGoalCard";
import type { DashboardData } from "./useDashboardData";
import styles from "./Dashboard.module.css";
import { BRAND_NAME } from "@/lib/brand";

export function DashboardWorkspace({ data }: { data: DashboardData }) {
  const { date, profile, calendar, setPicked } = data;
  const [checkin, setCheckin] = useState<CheckinDashboard | null>(null);

  return (
    <div className={styles.workspace}>
      <h1 className={styles.srOnly}>{BRAND_NAME} 训练控制台</h1>
      <Checkins dataOnly onData={setCheckin} />
      <div className={styles.grid}>
        <TrainingConsole data={data} />
        <PlanCard />
        <div className={styles.calendarSlot}>
          <TrainingMonthCalendar
            date={date}
            timezone={profile.data?.timezone ?? "Asia/Shanghai"}
            sessions={calendar.data ?? []}
            loading={!calendar.data}
            error={calendar.error || profile.error}
            onSelect={setPicked}
            checkedDate={checkin?.checked_in ? checkin.date : undefined}
          />
        </div>
        <EmptyCard
          className={styles.strength}
          title="力量进步"
          headline="力量趋势尚未接入"
        >
          后续按动作和时间范围查看进步，当前训练记录可在左侧打开。
        </EmptyCard>
        <BodyGoalCard />
        <EmptyCard
          className={styles.muscles}
          title="肌群分析"
          headline="肌群分析尚未接入"
        >
          后续查看训练分布与计划完成度。
        </EmptyCard>
        <EmptyCard
          className={styles.load}
          title="每周训练负荷"
          headline="每周负荷尚未接入"
        >
          力量有效组数和有氧时长将分别展示。
        </EmptyCard>
      </div>
    </div>
  );
}

function TrainingConsole({ data }: { data: DashboardData }) {
  const { date, records, sessions, profile } = data;
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
          className={`${styles.consoleState} ${!ready && !sessions.error && !profile.error ? styles.placeholder : ""}`}
          aria-busy={!ready}
        >
          {ready ? (
            state
          ) : sessions.error || profile.error ? (
            "训练记录暂不可用"
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
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
        <Feedback error={sessions.error || profile.error} />
        {(sessions.error || profile.error) && (
          <button
            onClick={() => {
              sessions.reload();
              profile.reload();
            }}
          >
            重试
          </button>
        )}
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

function PlanCard() {
  const [tab, setTab] = useState("items");
  return (
    <section
      className={`${styles.card} ${styles.plan}`}
      aria-label="训练计划与物品清单"
    >
      <Tabs value={tab} onValueChange={setTab} className={styles.tabs}>
        <ItemsChecklist
          active={tab === "items"}
          controls={
            <TabsList aria-label="训练计划与物品清单">
              <TabsTrigger value="plan">Plan</TabsTrigger>
              <TabsTrigger value="items">List</TabsTrigger>
            </TabsList>
          }
        />
        <TabsContent value="plan" />
      </Tabs>
    </section>
  );
}
function EmptyCard({
  className,
  title,
  headline,
  children,
}: {
  className: string;
  title: string;
  headline: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${styles.card} ${styles.statistic} ${className}`}
      aria-label={title}
    >
      <div className={styles.cardHeading}>
        <h2>{title}</h2>
      </div>
      <div className={styles.statisticEmpty}>
        <strong>{headline}</strong>
        <p>{children}</p>
      </div>
    </section>
  );
}
