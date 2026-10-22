"use client";
import { useState, type ReactNode } from "react";
import { TrainingConsole } from "./TrainingConsole";
import type { CheckinDashboard } from "@/lib/checkins";
import { ItemsChecklist } from "./ItemsChecklist";

import { TrainingMonthCalendar } from "./TrainingMonthCalendar";
import { Checkins } from "../Checkins";
import { BodyGoalCard } from "./BodyGoalCard";
import type { DashboardData } from "./useDashboardData";
import styles from "./Dashboard.module.css";
import { BRAND_NAME } from "@/lib/brand";
import { TrainingLoadCard } from "./TrainingLoadCard";

export function DashboardWorkspace({ data }: { data: DashboardData }) {
  const { date, profile, calendar, setPicked } = data;
  const [checkin, setCheckin] = useState<CheckinDashboard | null>(null);

  return (
    <div className={styles.workspace}>
      <h1 className={styles.srOnly}>{BRAND_NAME} 训练控制台</h1>
      <Checkins dataOnly onData={setCheckin} />
      <div className={styles.grid}>
        <TrainingConsoleCard />
        <PlanCard />
        <div className={styles.calendarSlot}>
          <TrainingMonthCalendar
            date={date}
            timezone={profile.data?.timezone ?? "Asia/Shanghai"}
            weekStart={profile.data?.week_start ?? 1}
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
          后续按动作和时间范围查看进步。
        </EmptyCard>
        <BodyGoalCard />
        <EmptyCard
          className={styles.muscles}
          title="肌群分析"
          headline="肌群分析尚未接入"
        >
          后续查看训练分布与计划完成度。
        </EmptyCard>
        <TrainingLoadCard
          date={date}
          weekStart={profile.data?.week_start ?? 1}
        />
      </div>
    </div>
  );
}

function TrainingConsoleCard() {
  return (
    <section
      className={`${styles.card} ${styles.console} ${styles.consoleDemo}`}
      aria-label="训练控制台"
    >
      <TrainingConsole />
    </section>
  );
}

function PlanCard() {
  return (
    <section className={`${styles.card} ${styles.plan}`} aria-label="物品清单">
      <ItemsChecklist active controls={null} />
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
