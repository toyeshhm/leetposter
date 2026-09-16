import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { GameError } from "@/game/errors";
import { BANK, bankById } from "@/problems";
import type { BankIo, BankProblem, BANK_TAGS } from "@/problems/schema";
import { bankTag, bankTests } from "@/problems/schema";
import { loadRoom } from "@/server/store";

/** One line of the bank index: enough to pick a problem, nothing that spoils one. */
export interface ProblemSummary {
  id: string;
  title: string;
  rating: number;
  tags: string[];
  difficulty: BankProblem["difficulty"];
  cluster: string;
}

/**
 * Everything a statement page (or the host's draft) may hold: the problem as the crew will read it.
 * No samples, no hidden tests, no reference solution, no brute: those belong to the Judge alone.
 */
export interface ProblemDetail {
  id: string;
  title: string;
  lore: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  tags: string[];
  hints: string[];
  difficulty: BankProblem["difficulty"];
  rating: number;
  timeLimitMs: number;
  cluster: string;
}

/** What the Judge in the Hall runs: the public samples first, then the hidden tests. */
export interface ProblemTests {
  id: string;
  timeLimitMs: number;
  samples: BankIo[];
  tests: BankIo[];
}

/** Query over the index: a rating window (the lobby's bands) and one tag. */
export interface ProblemQuery {
  min?: number | undefined;
  max?: number | undefined;
  tag?: (typeof BANK_TAGS)[number] | undefined;
}

export const problemQuery = z.object({
  min: z.coerce.number().int().min(800).max(3500).optional(),
  max: z.coerce.number().int().min(800).max(3500).optional(),
  tag: bankTag.optional(),
});

/** An id as the bank spells them (schema.ts: lowercase, digits and dashes). */
export const problemId = z.string().regex(/^[a-z0-9-]{3,60}$/, "not a bank id");

export function summary(p: BankProblem): ProblemSummary {
  return { id: p.id, title: p.title, rating: p.rating, tags: [...p.tags], difficulty: p.difficulty, cluster: p.cluster };
}

/**
 * The index, hardest last. `min` and `max` are inclusive on the low end and exclusive on the high
 * end, so the lobby's bands (800-1200, 1200-1600, ...) tile the ladder without overlapping.
 * ponytail: a linear scan over ~100 problems held in memory; an index when the bank is thousands.
 */
export function problemIndex(query: ProblemQuery): ProblemSummary[] {
  return BANK.filter(
    (p) =>
      (query.min === undefined || p.rating >= query.min) &&
      (query.max === undefined || p.rating < query.max) &&
      (query.tag === undefined || p.tags.some((t) => t === query.tag)),
  )
    .map(summary)
    .sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
}

/** One problem, statement side only. GameError("not-found") when the bank has no such id. */
export function problemDetail(id: string): ProblemDetail {
  const p = required(id);
  return {
    id: p.id,
    title: p.title,
    lore: p.lore,
    statement: p.statement,
    inputFormat: p.inputFormat,
    outputFormat: p.outputFormat,
    constraints: p.constraints,
    tags: [...p.tags],
    hints: [...p.hints],
    difficulty: p.difficulty,
    rating: p.rating,
    timeLimitMs: p.timeLimitMs,
    cluster: p.cluster,
  };
}

function required(id: string): BankProblem {
  const p = bankById(id);
  if (p === null) throw new GameError("not-found", `No problem called ${id}.`);
  return p;
}

/**
 * The tests, for the one seat entitled to them: the Herald of a hall that is playing this very
 * problem. Anything else — no such hall, a token that sits at no table, a seat that is not the
 * Herald's, a hall playing something else — is one unauthorized answer, so a prober learns nothing.
 */
export async function problemTests(id: string, code: string, token: string): Promise<ProblemTests> {
  const p = required(id);
  const row = await loadRoom(code);
  const player = row?.state.players.find((x) => x.token === token);
  if (row === null || player === undefined || !player.seats.includes("runner") || row.state.problem?.bankId !== id) {
    throw new GameError("unauthorized", "Only the Herald of a hall playing this problem may read its tests.");
  }
  return { id: p.id, timeLimitMs: p.timeLimitMs, samples: [...p.samples], tests: await hallTests(p.id) };
}

/**
 * A problem's hidden tests, read from its own file. They are not imported: the stress set behind
 * them is 800 MB, and a static import of the bank's tests exhausts both the bundler and a test
 * worker. The path is built from the bank's own id, never from the caller's string, so no request
 * can steer the read. `next.config.ts` traces this directory into the deployed function.
 */
async function hallTests(id: string): Promise<BankIo[]> {
  const file = path.join(process.cwd(), "src", "problems", "tests", `${id}.json`);
  const parsed = bankTests.parse(JSON.parse(await readFile(file, "utf8")));
  return parsed.tests;
}
