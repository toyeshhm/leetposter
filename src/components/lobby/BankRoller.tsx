"use client";
import { useEffect, useState, type ReactElement } from "react";
import { errorMessage, fetchProblemDetail, fetchProblemIndex } from "@/client/api";
import { Button, Notice } from "@/components/ui";
import type { Problem } from "@/game/types";
import type { ProblemSummary } from "@/server/problems";

/**
 * Roll a problem out of the bank instead of pasting one. This is what makes the bank and the Judge
 * in the Hall reachable at all: nothing else in the app sets `bankId`, and without it the Herald's
 * Submit falls back to recording a verdict by hand and the hidden tests are never fetched.
 *
 * The whole index is one unauthenticated GET of about 118 short rows, so the bands are counted and
 * filtered here rather than asking the server once per band.
 */

/** The ladder from README "Ratings". `max` is exclusive, so the bands tile without overlapping. */
const BANDS: readonly { id: string; label: string; min: number; max: number }[] = [
  { id: "any", label: "Any rating", min: 0, max: 10_000 },
  { id: "b1", label: "800 to 1100, loops and simulation", min: 800, max: 1100 },
  { id: "b2", label: "1100 to 1400, sorting and hashing", min: 1100, max: 1400 },
  { id: "b3", label: "1400 to 1700, two pointers and greedy", min: 1400, max: 1700 },
  { id: "b4", label: "1700 to 2000, basic DP and graph search", min: 1700, max: 2000 },
  { id: "b5", label: "2000 to 2300, harder DP and shortest paths", min: 2000, max: 2300 },
  { id: "b6", label: "2300 and up, segment trees and constructions", min: 2300, max: 10_000 },
];

type Load = { kind: "loading" } | { kind: "failed"; message: string } | { kind: "ready"; problems: ProblemSummary[] };

/** The bank problem as the hall reads it: one statement, with the input and output formats after it. */
function asProblem(
  detail: Awaited<ReturnType<typeof fetchProblemDetail>>,
  origin: string,
): Problem {
  return {
    title: detail.title,
    // The statement lives here, not on leetcode.com: this problem was written for the game.
    url: `${origin}/problems/${detail.id}`,
    statement: `${detail.statement}\n\nInput\n${detail.inputFormat}\n\nOutput\n${detail.outputFormat}`,
    tags: [...detail.tags],
    hints: [...detail.hints],
    constraints: detail.constraints,
    bankId: detail.id,
    rating: detail.rating,
  };
}

export function BankRoller({ onRolled, disabled }: { onRolled: (problem: Problem) => void; disabled: boolean }): ReactElement {
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [band, setBand] = useState("any");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [rolled, setRolled] = useState<ProblemSummary | null>(null);

  useEffect(() => {
    let live = true;
    fetchProblemIndex()
      .then(({ problems }) => {
        if (live) setLoad({ kind: "ready", problems });
      })
      .catch((error: unknown) => {
        if (live) setLoad({ kind: "failed", message: errorMessage(error) });
      });
    return () => {
      live = false;
    };
  }, []);

  if (load.kind === "loading") return <p className="muted">Opening the bank.</p>;
  if (load.kind === "failed") return <Notice kind="error">The bank did not answer: {load.message}</Notice>;

  const inBand = (b: (typeof BANDS)[number]): ProblemSummary[] => load.problems.filter((p) => p.rating >= b.min && p.rating < b.max);
  const chosen = BANDS.find((b) => b.id === band) ?? BANDS[0];
  const pool = chosen === undefined ? [] : inBand(chosen);

  const roll = async (): Promise<void> => {
    setBusy(true);
    setFailed(null);
    try {
      // Never the same problem twice in a row while the host keeps rolling one band.
      const options = pool.length > 1 && rolled !== null ? pool.filter((p) => p.id !== rolled.id) : pool;
      const pick = options[Math.floor(Math.random() * options.length)];
      if (pick === undefined) throw new Error("No problem sits in that band.");
      const detail = await fetchProblemDetail(pick.id);
      setRolled(pick);
      onRolled(asProblem(detail, window.location.origin));
    } catch (error: unknown) {
      setFailed(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lobby-bank">
      <p className="muted prose">
        Roll one of the {load.problems.length} problems written for the Hall. The Judge in the Hall runs the crew&apos;s file against its tests and records the verdict
        itself, so the Herald never reads one off another site.
      </p>
      <div className="lobby-bank-row">
        <label className="field-label" htmlFor="bank-band">
          Rating band
        </label>
        <select
          id="bank-band"
          className="field-control"
          value={band}
          disabled={disabled || busy}
          onChange={(e) => {
            setBand(e.target.value);
          }}
        >
          {BANDS.map((b) => {
            const n = inBand(b).length;
            return (
              <option key={b.id} value={b.id} disabled={n === 0}>
                {b.label} ({n})
              </option>
            );
          })}
        </select>
        <Button variant="secondary" loading={busy} disabled={disabled || pool.length === 0} onClick={() => void roll()}>
          {rolled === null ? "Roll a problem" : "Roll another"}
        </Button>
      </div>
      {failed !== null ? <Notice kind="error">{failed}</Notice> : null}
      {rolled !== null ? (
        <p className="lobby-bank-got">
          Rolled <strong>{rolled.title}</strong>, rated {rolled.rating}. It is in the fields below; set it when you are ready.
        </p>
      ) : null}
    </div>
  );
}
