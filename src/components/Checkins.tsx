"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { today } from "@/lib/domain";
import type { CheckinDashboard } from "@/lib/checkins";
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

  return (
    <div className="leaderboard-page">
      <div className="page-heading">
        <h1>排行榜</h1>
        <Link href="/dashboard">返回控制台</Link>
      </div>
      <section className="module module-checkin" aria-label="我的签到">
        <div className="checkin-action">
          <div>
            <p className="checkin-count">
              {data ? (
                <>
                  连续 <strong>{data.streak}</strong> 天
                </>
              ) : source.error ? (
                "签到暂时不可用"
              ) : (
                "读取签到记录…"
              )}
            </p>
            {data && (
              <small>
                <>
                  <span className="checkin-date">{data.date}</span>
                  <span className="checkin-status">
                    {data.checked_in ? "今天已签到" : "今天还未签到"}
                  </span>
                </>
              </small>
            )}
          </div>
          <button
            className="primary"
            disabled={!data || busy || data.checked_in || source.loading}
            onClick={() => void signin()}
          >
            {data?.checked_in ? "今日已签到" : "今日签到"}
          </button>
        </div>
        {data && (
          <p className="checkin-rule">
            按 {data.timezone}{" "}
            每日签到一次。昨天的连续记录保留至今日结束，漏签一天重新计算，不支持补签。
          </p>
        )}
      </section>
      <Feedback
        error={source.error || error}
        message={message}
        loading={source.loading || busy}
      />
      {source.error && <button onClick={source.reload}>重新加载签到</button>}
      {data && (
        <div className="leaderboard-layout">
          <section
            className="module module-checkin"
            aria-labelledby="ranking-title"
          >
            <div className="module-heading">
              <h2 id="ranking-title">连续签到排名</h2>
              <button onClick={source.reload} disabled={source.loading || busy}>
                刷新榜单
              </button>
            </div>
            <p className="muted">
              仅展示主动上榜且连续签到至少 1 天的用户，最多 50
              位；天数相同并列排名。
            </p>
            {data.leaderboard.length ? (
              <ol className="ranking-list">
                {data.leaderboard.map((row, i) => (
                  <li key={i} className={row.is_self ? "ranking-self" : ""}>
                    <span
                      className="ranking-position"
                      aria-label={`第 ${row.rank} 名`}
                    >
                      {row.rank}
                    </span>
                    <span className="ranking-name">
                      {row.display_name}
                      {row.is_self && <small>你</small>}
                    </span>
                    <span className="ranking-days">
                      <strong>{row.streak}</strong> 天
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">
                暂时没有上榜用户。完成签到后，可以自主选择参与。
              </p>
            )}
          </section>
          <CheckinPreferences
            key={`${data.listed}:${data.display_name}`}
            data={data}
            reload={source.reload}
          />
        </div>
      )}
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
  return (
    <section
      className="module module-neutral"
      id="visibility"
      aria-labelledby="visibility-title"
    >
      <h2 id="visibility-title">我的上榜设置</h2>
      <p>
        默认不上榜。开启后，其他已登录用户可看到你的榜单昵称、连续天数和排名。
      </p>
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
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
            setError(e instanceof Error ? e.message : "设置保存失败");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="checkin-consent">
          <input
            type="checkbox"
            checked={listed}
            disabled={busy}
            onChange={(e) => setListed(e.target.checked)}
          />
          参与连续签到榜
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
        <button disabled={busy}>保存上榜设置</button>
      </form>
      <p className="muted">
        当前：{data.listed ? "已开启上榜" : "未参与榜单"}
        。关闭并保存后退出榜单，自己的签到记录仍保留。
      </p>
      <Feedback error={error} loading={busy} />
    </section>
  );
}
