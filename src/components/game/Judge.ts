import * as Y from "yjs";
import { loadDoc, type Credentials } from "@/client/api";
import { fromBase64 } from "@/client/docSync";
import { RUN_TIMEOUT_MS, runCode, type Runnable } from "@/client/pyRunner";
import type { ReportCategory } from "@/game/types";
import type { BankIo } from "@/problems/schema";

/**
 * The Judge in the Hall: the same file the crew wrote, run in the Herald's own browser against the
 * problem's samples and then its hidden tests. It answers with exactly what the report card asks
 * for — a category and the input that broke — so an honest Herald copies nothing by hand.
 */
export type JudgeVerdict =
  | { verdict: "accepted"; passed: number }
  | { verdict: "rejected"; category: ReportCategory; failingCase: string; passed: number; detail: string };

/** Trailing whitespace and blank last lines are not a wrong answer; anything else is. */
export function normalize(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

/** The report card takes 5000 characters, and a stress test is megabytes; show the head and say so. */
export const CASE_CHARS = 4800;

export function shownCase(input: string): string {
  const text = input.trim();
  return text.length <= CASE_CHARS ? text : `${text.slice(0, CASE_CHARS)}\n... (${String(text.length)} characters in all)`;
}

/**
 * Run every case in order and stop at the first failure. `onRunning` fires once the runtime is up
 * for each case (the first one waits on Pyodide's download), carrying how many cases are already
 * behind it, so the panel can count the Herald through.
 * ponytail: the browser runner cuts a run off at RUN_TIMEOUT_MS, so a problem allowed more than
 * that gets the shorter clock; per-run timeouts belong in pyRunner, which the hall shares.
 */
export async function judge(
  language: Runnable,
  code: string,
  cases: BankIo[],
  timeLimitMs: number,
  onRunning: (passed: number) => void,
): Promise<JudgeVerdict> {
  const limit = Math.min(timeLimitMs, RUN_TIMEOUT_MS);
  let passed = 0;
  for (const one of cases) {
    const outcome = await runCode(language, { code, stdin: one.input }, () => {
      onRunning(passed);
    });
    const reject = (category: ReportCategory, detail: string): JudgeVerdict => ({ verdict: "rejected", category, failingCase: shownCase(one.input), passed, detail });
    if (outcome.timedOut || outcome.ms > limit) return reject("time-limit", `over ${String(limit)} ms`);
    if (outcome.stderr !== "") return reject("runtime-error", outcome.stderr.trim().split("\n").at(-1) ?? "");
    if (normalize(outcome.stdout) !== normalize(one.output)) return reject("wrong-answer", `expected ${normalize(one.output)}, got ${normalize(outcome.stdout)}`);
    passed += 1;
  }
  return { verdict: "accepted", passed };
}

/**
 * The shared file as the hall last saved it, with the language the picker is on. The editor saves a
 * couple of seconds after the last keystroke, so the Judge reads the file the crew settled on, not
 * the half-typed line; a live handle would have to be threaded down through the editor.
 */
export async function sharedFile(creds: Credentials): Promise<{ code: string; language: string }> {
  const { doc: saved } = await loadDoc(creds);
  const doc = new Y.Doc();
  if (saved !== null) Y.applyUpdate(doc, fromBase64(saved));
  // The picker writes "language" into the shared meta map; an empty map means nobody has moved it off Python.
  const file = { code: doc.getText("code").toJSON(), language: doc.getMap<string>("meta").get("language") ?? "python" };
  doc.destroy();
  return file;
}
