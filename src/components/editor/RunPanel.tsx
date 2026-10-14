"use client";
import { useState, type ReactElement } from "react";
import { errorMessage } from "@/client/api";
import { RUN_TIMEOUT_MS, inBrowser, runCode, type RunOutcome } from "@/client/pyRunner";
import { Button, Notice, TextareaField } from "@/components/ui";
import type { Language } from "./languages";

export interface RunPanelProps {
  language: Language;
  /** The shared file as it stands when Run is pressed. */
  getCode: () => string;
}

export const LOCAL_NOTE = "Runs on your machine only; nobody else sees the output.";
export const JUDGE_NOTE = "Compiled and run on Judge0, an outside judge, not on your machine. Nobody else in the hall sees the output.";
export const JAVA_NOTE = "Java is compiled as Main.java, so the class that holds main must be called Main.";

type Phase = { kind: "idle" } | { kind: "fetching" } | { kind: "running" } | { kind: "done"; outcome: RunOutcome } | { kind: "failed"; message: string };

/** Run the shared file with the Input box as stdin: here for Python and JavaScript, on the judge for the compiled four. Collapsed to one row until opened. */
export function RunPanel({ language, getCode }: RunPanelProps): ReactElement {
  const [stdin, setStdin] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const busy = phase.kind === "fetching" || phase.kind === "running";
  const run = async (): Promise<void> => {
    setPhase({ kind: "fetching" });
    try {
      const outcome = await runCode(language, { code: getCode(), stdin }, () => {
        setPhase({ kind: "running" });
      });
      setPhase({ kind: "done", outcome });
    } catch (error: unknown) {
      setPhase({ kind: "failed", message: errorMessage(error) });
    }
  };
  return (
    <details className="run">
      <summary className="run-summary">Run the file</summary>
      <div className="run-body">
        <TextareaField
          label="Input"
          className="run-stdin"
          value={stdin}
          spellCheck={false}
          autoComplete="off"
          onChange={(e) => {
            setStdin(e.target.value);
          }}
        />
        <div className="run-row">
          <Button variant="primary" loading={busy} onClick={() => void run()}>
            {phase.kind === "fetching" && language === "python" ? "Fetching the Python runtime, about 10 MB, once." : busy ? "Running" : "Run"}
          </Button>
          <span className="run-note muted">
            {inBrowser(language) ? LOCAL_NOTE : JUDGE_NOTE}
            {language === "java" ? ` ${JAVA_NOTE}` : null}
          </span>
        </div>
        {phase.kind === "failed" ? <Notice kind="error">{phase.message}</Notice> : null}
        {phase.kind === "done" ? <Output outcome={phase.outcome} /> : null}
      </div>
    </details>
  );
}

function endLine(text: string): string {
  return text === "" || text.endsWith("\n") ? text : `${text}\n`;
}

function Output({ outcome }: { outcome: RunOutcome }): ReactElement {
  return (
    <pre className="run-out" aria-label="Output" aria-live="polite">
      {endLine(outcome.stdout)}
      {outcome.stderr === "" ? null : <span className="run-err">{endLine(outcome.stderr)}</span>}
      <span className="muted">{outcome.timedOut ? `Stopped after ${String(RUN_TIMEOUT_MS / 1000)} s: the run took too long.` : `exit in ${String(outcome.ms)} ms`}</span>
    </pre>
  );
}
