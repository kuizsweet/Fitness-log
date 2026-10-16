"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { today } from "@/lib/domain";
import { checkinRankings, type CheckinDashboard } from "@/lib/checkins";
import { LeaderboardRankings } from "./ui/leaderboard-rankings";
import styles from "./Leaderboard.module.css";
import { useResource } from "./resource";

export function Checkins({
  toolbar = false,
  onData,
}: {
  toolbar?: boolean;
  onData?: (data: CheckinDashboard | null) => void;
}) {
  const source = useResource<CheckinDashboard>("checkins", true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const data = source.data;
  const reload = source.reload;
  useEffect(() => {
    onData?.(data);
  }, [data, onData]);
  useEffect(() => {
    const refresh = () => reload();
    window.addEventListener("focus", refresh);
    // Refresh after midnight without adding a recurring database poll.
    const timer = window.setInterval(() => {
      if (data && data.date !== today(data.timezone)) reload();
    }, 60000);
    return () => {
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [reload, data]);

  async function signin() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("checkins", { action: "checkin" });
      setMessage("今日签到已保存");
      source.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "签到失败，请重试");
    } finally {
      setBusy(false);
    }
  }

  if (toolbar)
    return (
      <div className="dashboard-checkin" aria-label="每日签到">
        <span>
          {data
            ? `连续签到 ${data.streak} 天`
            : source.error
              ? "签到暂不可用"
              : "—"}
        </span>
        <button
          disabled={!data || busy || data.checked_in || source.loading}
          onClick={() => void signin()}
        >
          {busy ? "签到中…" : data?.checked_in ? "今日已签到" : "今日签到"}
        </button>
        {source.error && <button onClick={reload}>重试</button>}
        {(source.error || error) && (
          <span role="alert">{source.error || error}</span>
        )}
        {message && (
          <span className="visually-hidden" role="status">
            {message}
          </span>
        )}
      </div>
    );

  const view = checkinRankings(data?.leaderboard ?? []);
  return (
    <section className={styles.page} aria-label="连续签到排行榜">
      <h1 className={styles.srOnly}>排行榜</h1>
      <LeaderboardRankings
        rankings={view.rankings}
        currentUserId={view.currentUserId}
        loading={source.loading && !data}
        refreshing={source.loading}
        error={source.error}
        onRefresh={reload}
      />
    </section>
  );
}
