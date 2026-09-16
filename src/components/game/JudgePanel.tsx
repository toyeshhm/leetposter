"use client";
import { useState, type ReactElement } from "react";
import { errorMessage, fetchProblemTests, loadCredentials } from "@/client/api";
import { runnable } from "@/client/pyRunner";
import { Button, Notice } from "@/components/ui";
import type { Action } from "@/game/types";
import { judge, sharedFile, type JudgeVerdict } from "./Judge";
import { CATEGORY_WORDS } from "./copy";

export interface JudgeActionProps {
  bankId: string;
  /** The hall code; the Herald's credentials for it are already in this browser. */
  code: string;
  act: (action: Action) => Promise<boolean>;
  busy: boolean;
  /** Hands the verdict up so a rejection prefills the report card the Herald still signs. */
  onJudged: (verdict: JudgeVerdict) => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "running"; passed: number; total: number }
  | { kind: "done"; verdict: JudgeVerdict }
  | { kind: "failed"; message: string };

/**
 * The Judge in the Hall. Bank problems carry their own tests, so the Herald does not read a verdict
 * off another site and copy it here: the file the hall last saved runs in the Herald's own browser
 * against the samples and then the hidden tests, and what it finds is the verdict. An Accepted ends
 * the round on the spot. A rejection only prefills the report card — the Herald still signs it, so a
 * Changeling in the Herald's seat can still write down the wrong case.
 */
export function JudgeAction({ bankId, code, act, busy, onJudged }: JudgeActionProps): ReactElement {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const working = phase.kind === "fetching" || phase.kind === "running";

  const run = async (): Promise<void> => {
    const creds = loadCredentials(code);
    if (creds === null) {
      setPhase({ kind: "failed", message: "This browser holds no seat at this hall." });
      return;
    }
    setPhase({ kind: "fetching" });
    try {
      const [{ samples, tests, timeLimitMs }, file] = await Promise.all([fetchProblemTests(creds, bankId), sharedFile(creds)]);
      if (!runnable(file.language)) {
        setPhase({ kind: "failed", message: `The Judge runs Python and JavaScript; the shared file is set to ${file.language}.` });
        return;
      }
      const cases = [...samples, ...tests];
      const verdict = await judge(file.language, file.code, cases, timeLimitMs, (passed) => {
        setPhase({ kind: "running", passed, total: cases.length });
      });
      setPhase({ kind: "done", verdict });
      onJudged(verdict);
      if (verdict.verdict === "accepted") await act({ type: "submit", verdict: "accepted" });
    } catch (error: unknown) {
      setPhase({ kind: "failed", message: errorMessage(error) });
    }
  };

  return (
    <div className="judge">
      <Button variant="primary" loading={working || busy} disabled={working || busy} onClick={() => void run()}>
        {phase.kind === "fetching" ? "Reading the file and the tests" : phase.kind === "running" ? `Case ${String(phase.passed + 1)} of ${String(phase.total)}` : "Submit to the Judge"}
      </Button>
      {phase.kind === "failed" ? <Notice kind="error">{phase.message}</Notice> : null}
      {phase.kind === "done" ? <Verdict verdict={phase.verdict} /> : null}
    </div>
  );
}

function Verdict({ verdict }: { verdict: JudgeVerdict }): ReactElement {
  if (verdict.verdict === "accepted") {
    return <Notice>Accepted on all {verdict.passed} cases. The round is over.</Notice>;
  }
  return (
    <Notice kind="error">
      Rejected after {verdict.passed} cases on {CATEGORY_WORDS[verdict.category].toLowerCase()} ({verdict.detail}). The case is on your report card; sign it and record the rejection.
    </Notice>
  );
}
