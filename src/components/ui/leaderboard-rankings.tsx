"use client";

// Adapted from Trophy UI Leaderboard Rankings (MIT, copyright 2026 Trophy).
// https://ui.trophy.so/r/leaderboard-rankings.json
// Original row composition, crown, avatar fallback and current-user treatment.
// kuizFit: local CSS, fixed 10/page, exact streak days and a reserved blank byline.
// Full upstream license: /THIRD_PARTY_NOTICES.md.
import * as React from "react";
import { ChevronLeft, ChevronRight, Crown, RefreshCw } from "lucide-react";
import { leaderboardPage } from "@/lib/checkins";
import styles from "../Leaderboard.module.css";

export interface LeaderboardRankingItem {
  // Display key only. The check-in API intentionally does not expose account IDs.
  userId: string;
  userName: string | null;
  rank: number;
  value: number;
  byline?: string | null;
  avatarUrl?: string | null;
}
export interface LeaderboardRankingsProps extends React.HTMLAttributes<HTMLDivElement> {
  rankings: LeaderboardRankingItem[];
  currentUserId?: string;
  loading?: boolean;
  refreshing?: boolean;
  error?: string;
  onRefresh?: () => void;
}

const LeaderboardRankings = React.forwardRef<
  HTMLDivElement,
  LeaderboardRankingsProps
>(
  (
    {
      className,
      rankings,
      currentUserId,
      loading = false,
      refreshing = false,
      error,
      onRefresh,
      ...props
    },
    ref,
  ) => {
    const [requestedPage, setCurrentPage] = React.useState(1);
    const rankingPage = leaderboardPage(rankings, requestedPage);
    return (
      <div
        ref={ref}
        className={[styles.ranking, className].filter(Boolean).join(" ")}
        aria-busy={loading || refreshing}
        {...props}
      >
        <div
          role={rankingPage.rows.length ? "list" : undefined}
          aria-label={rankingPage.rows.length ? "连续签到排名" : undefined}
          className={styles.list}
        >
          {!rankingPage.rows.length && (
            <div role="status" className={styles.empty}>
              <p>
                {error ? "榜单暂不可用" : loading ? "读取中…" : "暂无上榜用户"}
              </p>
              {error && (
                <>
                  <p role="alert" className={styles.error}>
                    {error}
                  </p>
                  <button onClick={onRefresh} disabled={refreshing}>
                    重新加载
                  </button>
                </>
              )}
            </div>
          )}
          {rankingPage.rows.map((ranking) => {
            const displayName = ranking.userName || "未命名用户";
            const isCurrentUser = currentUserId === ranking.userId;
            return (
              <div
                key={ranking.userId}
                role="listitem"
                className={styles.row}
                data-current={isCurrentUser || undefined}
              >
                <div className={styles.position}>
                  <span>{ranking.rank}</span>
                  {ranking.rank >= 1 && ranking.rank <= 3 ? (
                    <Crown
                      className={styles.crown}
                      data-rank={ranking.rank}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
                {ranking.avatarUrl ? (
                  <img
                    src={ranking.avatarUrl}
                    alt=""
                    className={styles.avatar}
                  />
                ) : (
                  <div className={styles.avatar} aria-hidden="true">
                    {Array.from(ranking.userName ?? "")[0]?.toUpperCase() ||
                      "?"}
                  </div>
                )}
                <div className={styles.person}>
                  <p className={styles.name}>
                    {displayName}
                    {isCurrentUser && <span className={styles.self}>我</span>}
                  </p>
                  <p className={styles.byline} aria-hidden={!ranking.byline}>
                    {ranking.byline || "\u00a0"}
                  </p>
                </div>
                <p
                  className={styles.value}
                  aria-label={`连续签到 ${ranking.value} 天`}
                >
                  {ranking.value}
                  <span>天</span>
                </p>
              </div>
            );
          })}
        </div>
        {error && rankingPage.rows.length > 0 && (
          <p role="alert" className={styles.refreshError}>
            {error}
          </p>
        )}
        <footer className={styles.footer}>
          <nav className={styles.pagination} aria-label="排行榜分页">
            <button
              type="button"
              aria-label="上一页"
              disabled={loading || rankingPage.page === 1}
              onClick={() => setCurrentPage(rankingPage.page - 1)}
            >
              <ChevronLeft aria-hidden="true" size={18} />
            </button>
            <span role="status" aria-live="polite">
              第 {rankingPage.page} / {rankingPage.pages} 页
            </span>
            <button
              type="button"
              aria-label="下一页"
              disabled={loading || rankingPage.page === rankingPage.pages}
              onClick={() => setCurrentPage(rankingPage.page + 1)}
            >
              <ChevronRight aria-hidden="true" size={18} />
            </button>
          </nav>
          {onRefresh && (
            <button
              className={styles.refresh}
              type="button"
              disabled={refreshing}
              aria-label="刷新排行榜"
              title="刷新排行榜"
              onClick={onRefresh}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
          )}
        </footer>
      </div>
    );
  },
);
LeaderboardRankings.displayName = "LeaderboardRankings";
export { LeaderboardRankings };
