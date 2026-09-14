/** A line that belongs to an Example block: the header or one of its labelled lines. */
const EXAMPLE_LINE = /^(Example \d+:|Input:|Output:|Explanation:)/;

export interface StatementRun {
  kind: "prose" | "example";
  text: string;
}

/**
 * Split a statement into runs of prose and runs of example lines, so the examples can be set in
 * monospace inside one block of text. Blank lines stay with the run they follow; empty runs are dropped.
 */
export function statementRuns(statement: string): StatementRun[] {
  const runs: StatementRun[] = [];
  for (const line of statement.split("\n")) {
    const last = runs.at(-1);
    const kind: StatementRun["kind"] = line.trim() === "" ? (last?.kind ?? "prose") : EXAMPLE_LINE.test(line) ? "example" : "prose";
    if (last?.kind === kind) last.text += `\n${line}`;
    else runs.push({ kind, text: line });
  }
  return runs.map((run) => ({ kind: run.kind, text: run.text.trim() })).filter((run) => run.text !== "");
}
