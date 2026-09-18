import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { problemIndex } from "@/server/problems";
import "@/components/leaderboard/leaderboard.css";
import "./problems.css";

export const metadata: Metadata = {
  title: "The bank",
  description: "Every problem written for the Hall, with its rating and its tags.",
};

/**
 * The bank, hardest last. A server component: the bank is fixed at build time, so there is nothing
 * to fetch, poll or hydrate — the page is the list. Ratings and tags only; a statement is one click
 * away, and nothing here spoils a hall in progress.
 */
export default function ProblemsPage(): ReactElement {
  const problems = problemIndex({});
  // Read off the bank rather than restated: the 800-3500 ladder is the rating scale, not this bank's range.
  const ratings = problems.map((p) => p.rating);
  const low = Math.min(...ratings);
  const high = Math.max(...ratings);
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <h1>The bank</h1>
        <p className="muted prose">
          {problems.length} problems written for the Hall, rated {low} to {high}. A host rolls one by band in the lobby instead of pasting, and the Judge in the Hall
          runs the crew&apos;s file against its tests and records the verdict itself.
        </p>
        <table className="board">
          <thead>
            <tr>
              <th scope="col">Problem</th>
              <th scope="col" className="board-num">
                Rating
              </th>
              <th scope="col" className="problems-tags">
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/problems/${p.id}`}>{p.title}</Link>
                  <span className="problems-difficulty muted"> {p.difficulty}</span>
                </td>
                <td className="board-num">{p.rating}</td>
                <td className="problems-tags muted">{p.tags.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
      <SiteFooter />
    </>
  );
}
