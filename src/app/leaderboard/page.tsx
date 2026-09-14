import type { Metadata } from "next";
import type { ReactElement } from "react";
import { LeaderboardScreen } from "@/components/leaderboard/LeaderboardScreen";
import { SiteHeader } from "@/components/site/SiteHeader";
import "@/components/leaderboard/leaderboard.css";

export const metadata: Metadata = { title: "Leaderboard, Leetposter" };

/** Three Elo ladders and two counts, for anyone to read. */
export default function LeaderboardPage(): ReactElement {
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>Leaderboard</h1>
        <LeaderboardScreen />
      </main>
    </>
  );
}
