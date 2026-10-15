"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { today, workingSets, type Session } from "@/lib/domain";
import type { CheckinDashboard } from "@/lib/checkins";
import { nextStrengthPlan } from "@/lib/dashboard";
import { useResource } from "../resource";
import { TrainingCalendar } from "../TrainingCalendar";
import { MealsCard } from "../MealsCard";
import { Checkins } from "../Checkins";
import { Feedback } from "../Feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { DeletedRecords } from "./DeletedRecords";
import type { DashboardData } from "./useDashboardData";
import styles from "./Dashboard.module.css";

export function DesktopDashboard({ data }: { data: DashboardData }) {
  const { date, profile, sessions, meals, setPicked } = data;
  const [checkin, setCheckin] = useState<CheckinDashboard | null>(null);
  const mealsDialog = useRef<HTMLDialogElement>(null);
  const currentDay = today(profile.data?.timezone);
  return (
    <div className={styles.workspace}>
      <h1 className={styles.srOnly}>kuizFit 训练控制台</h1>
      <div className={styles.toolbar}>
        <div className={styles.dateContext}>
          <span>查看日期</span>
          <time dateTime={date}>{date}</time>
        </div>
        <div className={styles.quickActions}>
          <Checkins toolbar onData={setCheckin} />
          <span className={styles.toolbarDivider} aria-hidden="true" />
          <button onClick={() => mealsDialog.current?.showModal()}>
            三餐记录
          </button>
          <Link href="/leaderboard">排行榜与上榜设置</Link>
        </div>
      </div>
      <div className={styles.grid}>
        <TrainingConsole data={data} />
        <PlanCard currentDay={currentDay} />
        <div className={styles.calendarSlot}>
          <TrainingCalendar
            title="训练月历"
            date={date}
            timezone={profile.data?.timezone ?? "Asia/Shanghai"}
            sessions={sessions.data ?? []}
            loading={sessions.loading}
            error={sessions.error || profile.error}
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
        <EmptyCard
          className={styles.bodyGoals}
          title="身体目标"
          headline="身体目标尚未接入"
        >
          体重、体脂率与目标记录将在这里展示。
        </EmptyCard>
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
      {/* Native dialog keeps meal editors mounted while closed, retaining unsaved
          notes and the selected meal tab without creating another save flow. */}
      <dialog
        ref={mealsDialog}
        className={styles.mealsDialog}
        aria-labelledby="dashboard-meals-title"
      >
        <div className={styles.dialogHeading}>
          <div>
            <h2 id="dashboard-meals-title">三餐记录</h2>
            <time dateTime={date}>{date}</time>
          </div>
          <button
            onClick={() => mealsDialog.current?.close()}
            aria-label="关闭三餐记录"
          >
            关闭
          </button>
        </div>
        <MealsCard
          key={date}
          date={date}
          meals={meals.data ?? []}
          ready={Boolean(meals.data)}
          loading={meals.loading}
          error={meals.error}
          reload={meals.reload}
        />
      </dialog>
    </div>
  );
}

function TrainingConsole({ data }: { data: DashboardData }) {
  const { date, records, sessions, profile } = data;
  const [showDeleted, setShowDeleted] = useState(false);
  const active = records.find((s) =>
    ["in_progress", "paused"].includes(s.status),
  );
  const ready = !sessions.loading && !sessions.error && !profile.error;
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
        <p className={styles.consoleState}>
          {ready
            ? state
            : sessions.error || profile.error
              ? "训练记录暂不可用"
              : "读取当天训练…"}
        </p>
        <p className={styles.secondary}>
          动作、重量、次数与 RIR，沿用已有训练记录。
        </p>
        <div className={styles.consoleActions}>
          <Link
            className={styles.primaryAction}
            href={active ? `/session/${active.id}` : `/train?date=${date}`}
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
          <dt>当天记录</dt>
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
      </div>
      <div className={styles.reservedTools} aria-label="后续训练工具">
        <div>
          <span>训练计时</span>
          <small>暂未开放</small>
        </div>
        <div>
          <span>组间休息</span>
          <small>暂未开放</small>
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
        {showDeleted && (
          <DeletedRecords key={date} date={date} reload={sessions.reload} />
        )}
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
          {s.exercises.map((e) => e.exercise_name).join("、") || "未添加动作"}
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

function PlanCard({ currentDay }: { currentDay: string }) {
  // Use saved planned strength sessions, never infer a tomorrow schedule or
  // advance a non-existent rotation queue after cardio/check-ins.
  const source = useResource<Session[]>(
    `sessions?from=${currentDay}&to=2100-12-31`,
    true,
  );
  const reload = source.reload;
  useEffect(() => {
    const refresh = () => reload();
    const changed = (event: Event) => {
      if (
        ["sessions", "imports"].includes(
          (event as CustomEvent<{ resource: string }>).detail.resource,
        )
      )
        reload();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("fitness-data-change", changed);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("fitness-data-change", changed);
    };
  }, [reload]);
  const next = nextStrengthPlan(source.data ?? [], currentDay);
  return (
    <section
      className={`${styles.card} ${styles.plan}`}
      aria-labelledby="plan-title"
    >
      <div className={styles.cardHeading}>
        <h2 id="plan-title">训练清单</h2>
      </div>
      <Tabs defaultValue="plan" className={styles.tabs}>
        <TabsList aria-label="训练计划与物品清单">
          <TabsTrigger value="plan">训练计划</TabsTrigger>
          <TabsTrigger value="items">物品清单</TabsTrigger>
        </TabsList>
        <TabsContent value="plan">
          <p className={styles.planLabel}>下一次力量训练</p>
          <Feedback error={source.error} loading={source.loading} />
          {source.error && (
            <button onClick={source.reload}>重新加载计划</button>
          )}
          {!source.loading &&
            !source.error &&
            (next ? (
              <div className={styles.nextPlan}>
                <time dateTime={next.training_date}>{next.training_date}</time>
                <ol>
                  {next.exercises.map((exercise) => (
                    <li key={exercise.id}>{exercise.exercise_name}</li>
                  ))}
                </ol>
                {!next.exercises.length && <p>尚未添加动作</p>}
                <Link href={`/session/${next.id}`}>查看与调整计划</Link>
              </div>
            ) : (
              <div className={styles.planEmpty}>
                <strong>暂无已保存的力量训练计划</strong>
                <p>可在训练记录中选择“计划”和“力量”。自定义轮换尚未接入。</p>
                <Link href={`/session/new?date=${currentDay}`}>
                  打开训练记录
                </Link>
              </div>
            ))}
        </TabsContent>
        <TabsContent value="items">
          <div className={styles.planEmpty}>
            <strong>物品清单尚未接入</strong>
            <p>这里将保留物品配置，并单独记录每天的准备状态。</p>
          </div>
        </TabsContent>
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
