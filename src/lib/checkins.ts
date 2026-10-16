export type CheckinDashboard = {
  date: string;
  timezone: string;
  checked_in: boolean;
  streak: number;
  listed: boolean;
  display_name: string;
  leaderboard: {
    rank: number;
    display_name: string;
    streak: number;
    is_self: boolean;
  }[];
};

export function leaderboardPage<T>(rows: T[], requested: number) {
  const pages = Math.max(1, Math.ceil(rows.length / 10));
  const page = Math.min(
    pages,
    Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1),
  );
  return {
    page,
    pages,
    total: rows.length,
    rows: rows.slice((page - 1) * 10, page * 10),
  };
}

export function checkinRankings(rows: CheckinDashboard["leaderboard"]) {
  // Only keys for the UI component, never account IDs or API parameters.
  const rankings = rows.map((row, index) => ({
    userId: `entry-${index}`,
    userName: row.display_name,
    rank: row.rank,
    value: row.streak,
  }));
  const self = rows.findIndex((row) => row.is_self);
  return {
    rankings,
    currentUserId: self >= 0 ? rankings[self].userId : undefined,
  };
}
