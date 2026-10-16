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

export function leaderboardPage(
  rows: CheckinDashboard["leaderboard"],
  requested: number,
) {
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
