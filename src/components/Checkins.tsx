"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { today } from "@/lib/domain";
import { leaderboardPage, type CheckinDashboard } from "@/lib/checkins";
import styles from "./Leaderboard.module.css";
import { useResource } from "./resource";
import { Feedback } from "./Feedback";

export function Checkins({
  toolbar = false,
  onData,
}: {
  toolbar?: boolean;
  onData?: (data: CheckinDashboard | null) => void;
}) {
  const source = useResource<CheckinDashboard>("checkins", true);
  const [page, setPage] = useState(1);
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
              : "读取签到…"}
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

  const ranking = leaderboardPage(data?.leaderboard ?? [], page);
  return (
    <div className={styles.layout}>
      <h1 className={styles.srOnly}>排行榜</h1>
      <section
        className={styles.ranking}
        aria-label="连续签到排行榜"
        aria-busy={source.loading}
      >
        <div className={styles.rankingBar}>
          <span>
            {data
              ? `${ranking.total} 人`
              : source.error
                ? "暂不可用"
                : "读取中…"}
          </span>
          <button
            onClick={reload}
            disabled={source.loading}
            aria-label="刷新排行榜"
            title="刷新排行榜"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <path d="M20 7v5h-5M4 17v-5h5" />
              <path d="M6.1 6a8 8 0 0 1 13 2M4.9 16a8 8 0 0 0 13 2" />
            </svg>
          </button>
        </div>
        <Feedback error={source.error} />
        <table className={styles.table}>
          <caption className={styles.srOnly}>按连续签到天数排名</caption>
          <thead>
            <tr>
              <th scope="col">排名</th>
              <th scope="col">用户</th>
              <th scope="col">连续签到</th>
            </tr>
          </thead>
          <tbody>
            {ranking.rows.map((row, i) => (
              <tr
                key={`${ranking.page}:${i}`}
                data-self={row.is_self || undefined}
              >
                <td>
                  <span
                    className={styles.rank}
                    data-top={row.rank <= 3 || undefined}
                  >
                    {row.rank}
                  </span>
                </td>
                <td>
                  <div className={styles.person}>
                    <span className={styles.avatar} aria-hidden="true">
                      {row.display_name.slice(0, 1)}
                    </span>
                    <span>{row.display_name}</span>
                    {row.is_self && <small>我</small>}
                  </div>
                </td>
                <td>
                  <strong>{row.streak}</strong>
                  <span className={styles.unit}>天</span>
                </td>
              </tr>
            ))}
            {!ranking.rows.length && (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  {source.error
                    ? "榜单暂不可用"
                    : source.loading && !data
                      ? "读取中…"
                      : "暂无上榜用户"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <nav className={styles.pagination} aria-label="排行榜分页">
          <button
            disabled={ranking.page <= 1}
            onClick={() => setPage(ranking.page - 1)}
            aria-label="上一页"
          >
            上一页
          </button>
          <span role="status" aria-live="polite">
            {ranking.page} / {ranking.pages}
          </span>
          <button
            disabled={ranking.page >= ranking.pages}
            onClick={() => setPage(ranking.page + 1)}
            aria-label="下一页"
          >
            下一页
          </button>
        </nav>
      </section>
      <aside className={styles.side} aria-label="签到与上榜设置">
        <section className={styles.panel} aria-labelledby="checkin-heading">
          <h2 id="checkin-heading">签到</h2>
          <p className={styles.streak}>
            <strong>{data?.streak ?? "—"}</strong>
            <span>连续天数</span>
          </p>
          <button
            className="primary"
            disabled={!data || busy || data.checked_in || source.loading}
            onClick={() => void signin()}
          >
            {busy ? "签到中…" : data?.checked_in ? "今日已签到" : "今日签到"}
          </button>
          <Feedback error={error} message={message} />
        </section>
        {data && (
          <CheckinPreferences
            key={`${data.listed}:${data.display_name}`}
            data={data}
            reload={reload}
          />
        )}
      </aside>
    </div>
  );
}

function CheckinPreferences({
  data,
  reload,
}: {
  data: CheckinDashboard;
  reload: () => void;
}) {
  const [listed, setListed] = useState(data.listed);
  const [name, setName] = useState(data.display_name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const changed = listed !== data.listed || name.trim() !== data.display_name;
  return (
    <section
      className={styles.panel}
      id="visibility"
      aria-labelledby="visibility-title"
    >
      <h2 id="visibility-title">上榜设置</h2>
      <form
        className={styles.preferences}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("checkins", {
              action: "preferences",
              listed,
              display_name: name,
            });
            reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : "保存失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className={styles.toggle}>
          <span>参与上榜</span>
          <input
            type="checkbox"
            role="switch"
            checked={listed}
            disabled={busy}
            onChange={(e) => setListed(e.target.checked)}
          />
        </label>
        <label>
          榜单昵称
          <input
            value={name}
            required={listed}
            maxLength={40}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button disabled={busy || !changed}>
          {busy ? "保存中…" : "保存设置"}
        </button>
      </form>
      <Feedback error={error} />
    </section>
  );
}
