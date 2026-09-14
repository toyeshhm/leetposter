import type { ReactElement } from "react";
import type { PlayerView } from "@/game/types";
import { statementRuns } from "./statement";

/** The public half of the problem: the statement with its examples, in a readable measure. */
export function ProblemText({ problem }: { problem: PlayerView["problem"] }): ReactElement {
  if (problem === null) return <p className="muted">No problem has been set.</p>;
  return (
    <article className="problem" aria-labelledby="problem-title">
      <h2 id="problem-title" className="section-title">
        The problem
      </h2>
      {statementRuns(problem.statement).map((run, i) =>
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
  );
}
