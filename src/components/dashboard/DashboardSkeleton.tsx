import styles from "./Dashboard.module.css";
// Same grid and intrinsic sizes as the mounted page; no invented records.
export function DashboardSkeleton() {
  return (
    <div className={styles.workspace} aria-label="控制台" aria-busy="true">
      <div
        className={`${styles.toolbar} ${styles.placeholder}`}
        aria-hidden="true"
      />
      <div className={styles.grid} aria-hidden="true">
        <section className={`${styles.card} ${styles.console}`}>
          <h2>训练控制台</h2>
          <div className={styles.recordSkeleton} />
          <div className={styles.summary}>
            <div className={styles.placeholder} />
            <div className={styles.placeholder} />
            <div className={styles.placeholder} />
          </div>
        </section>
        <section className={`${styles.card} ${styles.plan}`}>
          <h2>训练清单</h2>
          <div className={styles.recordSkeleton} />
        </section>
        <div className={styles.calendarSlot}>
          <section className={styles.monthCalendar}>
            <h2>训练月历</h2>
            <div className={styles.recordSkeleton} />
          </section>
        </div>
        <section className={`${styles.card} ${styles.strength}`}>
          <h2>力量进步</h2>
        </section>
        <section className={`${styles.card} ${styles.bodyGoals}`}>
          <div className={styles.recordSkeleton} />
        </section>
        <section className={`${styles.card} ${styles.muscles}`}>
          <h2>肌群分析</h2>
        </section>
        <section className={`${styles.card} ${styles.load}`}>
          <h2>每周训练负荷</h2>
        </section>
      </div>
    </div>
  );
}
