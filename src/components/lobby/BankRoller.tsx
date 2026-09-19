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

/* Module scope on purpose: React's rules-of-hooks lint treats an impure call inside a function
   defined during render as a render-time call, even when it only ever runs from a click. */
function pickOne(items: readonly ProblemSummary[]): ProblemSummary | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

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
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState("");
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
  // What the chooser lists: the band, narrowed by a plain substring over the title and the tags.
  const needle = search.trim().toLowerCase();
  const shown = needle === "" ? pool : pool.filter((p) => p.title.toLowerCase().includes(needle) || p.tags.some((t) => t.includes(needle)));

  /** Put one named problem in the form. Both the chooser and the dice end up here. */
  const take = async (pick: ProblemSummary | undefined): Promise<void> => {
    setBusy(true);
    setFailed(null);
    try {
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

  const roll = (): Promise<void> => {
    // Never the same problem twice in a row while the host keeps rolling one band.
    const options = pool.length > 1 && rolled !== null ? pool.filter((p) => p.id !== rolled.id) : pool;
    return take(pickOne(options));
  };

  return (
    <div className="lobby-bank">
      <p className="muted prose">
        Pick one of the {load.problems.length} problems written for the Hall, or roll at random. The Judge in the Hall runs the crew&apos;s file against its tests and records the verdict
        itself, so the Herald never reads one off another site.
      </p>
      <div className="lobby-bank-row">
        <div className="lobby-bank-field">
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
              setPicked("");
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
        </div>
        <div className="lobby-bank-field">
          <label className="field-label" htmlFor="bank-search">
            Search the bank
          </label>
          <input
            id="bank-search"
            className="field-control"
            type="search"
            value={search}
            placeholder="candle, prefix-sums, ..."
            autoComplete="off"
            disabled={disabled || busy}
            onChange={(e) => {
              setSearch(e.target.value);
              setPicked("");
            }}
          />
        </div>
      </div>

      <div className="lobby-bank-row">
        <div className="lobby-bank-field lobby-bank-wide">
          <label className="field-label" htmlFor="bank-pick">
            From the bank
          </label>
          <select
            id="bank-pick"
            className="field-control"
            value={picked}
            disabled={disabled || busy || shown.length === 0}
            onChange={(e) => {
              setPicked(e.target.value);
            }}
          >
            <option value="">{shown.length === 0 ? "Nothing matches" : `Choose one of ${String(shown.length)}`}</option>
            {shown.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} · {p.rating} · {p.tags.join(", ")}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="primary"
          loading={busy}
          disabled={disabled || picked === ""}
          onClick={() => void take(shown.find((p) => p.id === picked))}
        >
          Use this one
        </Button>
        <Button variant="secondary" loading={busy} disabled={disabled || pool.length === 0} onClick={() => void roll()}>
          {rolled === null ? "Or roll at random" : "Roll another"}
        </Button>
      </div>
      {failed !== null ? <Notice kind="error">{failed}</Notice> : null}
      {rolled !== null ? (
        <p className="lobby-bank-got">
          <strong>{rolled.title}</strong>, rated {rolled.rating}. It is in the fields below; set it when you are ready.
        </p>
      ) : null}
    </div>
  );
}
