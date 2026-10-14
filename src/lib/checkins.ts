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
