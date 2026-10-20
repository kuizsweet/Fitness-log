"use client";
import { useState, type ReactNode } from "react";
import { Stopwatch } from "../ui/stopwatch";
import type { CheckinDashboard } from "@/lib/checkins";
import { ItemsChecklist } from "./ItemsChecklist";

import { TrainingMonthCalendar } from "./TrainingMonthCalendar";
import { Checkins } from "../Checkins";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
        <TrainingConsole />
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

function TrainingConsole() {
  return (
    <section
      className={`${styles.card} ${styles.console} ${styles.stopwatchConsole}`}
      aria-label="Stopwatch"
    >
      <Stopwatch />
    </section>
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
