"use client";
import Link from "next/link";
import { useResource } from "./resource";
import { Catalog } from "./Catalog";
import { today, type Session, type Profile } from "@/lib/domain";
import { Feedback } from "./Feedback";
import styles from "./Training.module.css";

export function Training({ initialDate }: { initialDate?: string }) {
  const profile = useResource<Profile>("profile");
  const date = initialDate ?? today(profile.data?.timezone);
  const active = useResource<Session[]>("sessions?active=1");
  const plans = useResource<Session[]>("sessions?planned=1");
  return (
    <div className={styles.configuration}>
      <section aria-labelledby="training-heading">
        <div className={styles.heading}>
          <h1 id="training-heading">训练</h1>
          <div className="row">
            <Link
              className="button"
              href={`/session/new?planned=1&date=${date}`}
            >
              新建计划
            </Link>
            <Link
              className="button primary"
              href={`/session/new?active=1&date=${date}`}
            >
              开始训练
            </Link>
          </div>
        </div>
        <Feedback
          error={active.error || profile.error}
          loading={active.loading}
        />
        {active.data?.map((s) => (
          <div className={styles.listRow} key={s.id}>
            <div>
              <strong>
                {s.exercises.map((e) => e.exercise_name).join("、") ||
                  "未命名训练"}
              </strong>
              <small>
                {s.training_date} ·{" "}
                {s.status === "paused" ? "已暂停" : "进行中"}
              </small>
            </div>
            <Link className="button" href={`/session/${s.id}`}>
              继续训练
            </Link>
          </div>
        ))}
        <h2>训练计划</h2>
        <Feedback error={plans.error} loading={plans.loading} />
        {!plans.loading && !plans.error && !plans.data?.length && (
          <p className={styles.muted}>暂无训练计划</p>
        )}
        {plans.data?.map((s) => (
          <div className={styles.listRow} key={s.id}>
            <div>
              <strong>
                {s.exercises.map((e) => e.exercise_name).join("、") ||
                  "未添加动作"}
              </strong>
              <small>
                {s.training_date} · {s.exercises.length} 个动作 ·{" "}
                {s.exercises.reduce((n, e) => n + e.sets.length, 0)} 组
              </small>
            </div>
            <div className="row">
              <Link href={`/session/${s.id}`}>编辑</Link>
              <Link
                className="button"
                href={`/session/new?template=${s.id}&date=${date}`}
              >
                开始计划
              </Link>
            </div>
          </div>
        ))}
      </section>
      <section id="catalog" aria-label="动作与器材">
        <Catalog />
      </section>
    </div>
  );
}
