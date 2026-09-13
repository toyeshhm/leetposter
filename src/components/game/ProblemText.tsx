import type { ReactElement } from "react";
import type { PlayerView } from "@/game/types";

/** The public half of the problem: statement and examples, in a readable measure. */
export function ProblemText({ problem }: { problem: PlayerView["problem"] }): ReactElement {
  if (problem === null) return <p className="muted">No problem has been set.</p>;
  return (
    <article className="problem" aria-labelledby="problem-title">
      <h2 id="problem-title" className="section-title">
        The problem
      </h2>
      <p className="problem-statement">{problem.statement}</p>
      <h3 className="section-title">Examples</h3>
      <pre className="mono problem-examples">{problem.examples}</pre>
    </article>
  );
}
