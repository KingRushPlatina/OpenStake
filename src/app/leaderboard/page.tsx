import type { Metadata } from "next";
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";

export const metadata: Metadata = {
  title: "Leaderboard — OpenStake",
  description: "See the top players by net profit, biggest win and total wagered.",
};

export default function LeaderboardPage() {
  return <LeaderboardClient />;
}
