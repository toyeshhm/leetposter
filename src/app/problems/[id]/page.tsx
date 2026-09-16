import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactElement } from "react";
import { SiteHeader } from "@/components/site/SiteHeader";
import { statementRuns } from "@/components/game/statement";
import { bankById } from "@/problems";
import { problemDetail, problemId, type ProblemDetail } from "@/server/problems";
import "@/components/leaderboard/leaderboard.css";
import "../problems.css";

/** The one problem this page is about, or null for anything the bank does not hold. */
function found(id: string): ProblemDetail | null {
  const parsed = problemId.safeParse(id);
  return parsed.success && bankById(parsed.data) !== null ? problemDetail(parsed.data) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const p = found((await params).id);
  return p === null ? { title: "No such problem" } : { title: p.title, description: p.lore };
}

/** One bank problem as the crew reads it. Never the samples, the tests, the solution or the brute. */
export default async function ProblemPage({ params }: { params: Promise<{ id: string }> }): Promise<ReactElement> {
  const p = found((await params).id);
  if (p === null) notFound();
  return (
    <>
      <SiteHeader />
      <main className="board-page">
        <p className="muted">
          <Link href="/problems">The bank</Link>
        </p>
        <h1>{p.title}</h1>
        <p className="problems-meta muted">
          {p.rating} · {p.difficulty} · {p.tags.join(", ")} · {p.timeLimitMs / 1000}s
        </p>
        <p className="problems-lore prose">{p.lore}</p>

        <article className="problem">
          {statementRuns(p.statement).map((run, i) =>
            run.kind === "example" ? (
              <pre key={String(i)} className="mono problem-examples">
                {run.text}
              </pre>
            ) : (
              <p key={String(i)} className="problem-statement">
                {run.text}
              </p>
            ),
          )}
        </article>

        <section className="problems-block">
          <h2 className="section-title">Input</h2>
          <p className="problem-statement">{p.inputFormat}</p>
          <h2 className="section-title">Output</h2>
          <p className="problem-statement">{p.outputFormat}</p>
          <h2 className="section-title">Constraints</h2>
          <pre className="mono problem-examples">{p.constraints}</pre>
        </section>

        {/* Folded away: the Oracle's channel is these hints, and a player browsing the bank should
            have to reach for them rather than read them by accident. */}
        <details className="problems-hints">
          <summary>{p.hints.length} hints, as the Oracle sees them</summary>
          <ol className="problems-hint-list">
            {p.hints.map((hint) => (
              <li key={hint} className="problem-statement">
                {hint}
              </li>
            ))}
          </ol>
        </details>
      </main>
    </>
  );
}
