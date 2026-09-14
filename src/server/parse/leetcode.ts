import type { Problem } from "@/game/types";
import type { ParsedProblem } from "./types";

const TITLE = /^(\d+)\. (.+)$/;
const DIFFICULTY = new Set(["Easy", "Medium", "Hard"]);
const CHIPS = new Set(["Topics", "Companies", "Hint", "premium lock icon"]);
const LEVEL_CHIPS = new Set(["Junior", "Mid Level", "Senior", ...DIFFICULTY]);
const EXAMPLE = /^Example \d+:$/;
const HINT = /^Hint \d+$/;
const CONSTRAINTS = "Constraints:";
const ACCEPTED = "Accepted";
const isFollowUp = (line: string): boolean => /^follow[- ]?up\b/i.test(line);
const endsTags = (line: string): boolean => line === "Companies" || line.endsWith("icon") || HINT.test(line) || line === "Similar Questions" || line.startsWith("Discussion");
const endsHint = (line: string): boolean => HINT.test(line) || line === "Similar Questions" || line.startsWith("Discussion");

/**
 * Copy flattens superscripts: "10^4" arrives as "104", "-10^9 <= x" as "-109 <= x".
 * ponytail: only 10^1..10^18 as a standalone token is repaired, so a genuine 105 in a
 * constraints line becomes 10^5, and 2^31 ("231") stays flat. Upgrade path: the model.
 */
export function repairExponents(line: string): string {
  return line.replace(/\b10(1[0-8]|[1-9])\b/g, "10^$1");
}

export function slugUrl(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://leetcode.com/problems/${slug}/`;
}

/** Warnings and confidence for a problem from either source. */
export function assess(problem: Problem): Pick<ParsedProblem, "confidence" | "warnings"> {
  const warnings: string[] = [];
  if (problem.title === "") warnings.push("No title found. The page should start with a numbered title like \"1. Two Sum\".");
  if (problem.statement === "") warnings.push("No statement found. Copy from the problem's Description tab.");
  if (problem.examples === "") warnings.push("No examples found.");
  if (problem.constraints === "") warnings.push("No constraints found. The Warden's panel is empty.");
  if (problem.tags.length === 0) warnings.push("Topics were collapsed on the page, so no tags. Open Topics before copying.");
  if (problem.hints.length === 0) warnings.push("No hints found. Open every Hint before copying (some problems have none).");
  const missing = problem.title === "" || problem.statement === "" || problem.constraints === "";
  return { confidence: missing ? "low" : "high", warnings };
}

/** `over` with every empty field replaced by `base`'s: the model's answer on top of what the parser already found. */
export function fillEmpty(base: Problem, over: Problem): Problem {
  return {
    title: over.title === "" ? base.title : over.title,
    url: over.title === "" ? base.url : over.url,
    statement: over.statement === "" ? base.statement : over.statement,
    examples: over.examples === "" ? base.examples : over.examples,
    tags: over.tags.length === 0 ? base.tags : over.tags,
    hints: over.hints.length === 0 ? base.hints : over.hints,
    constraints: over.constraints === "" ? base.constraints : over.constraints,
  };
}

const isBlank = (line: string): boolean => line === "";

/** Index of the first line at or after `from` for which `test` holds, or -1. */
function find(lines: string[], from: number, test: (line: string) => boolean): number {
  return lines.findIndex((line, i) => i >= from && test(line));
}

/** Non-blank lines from `from` until `stop` holds (exclusive) or the input ends. */
function collect(lines: string[], from: number, stop: (line: string) => boolean): string[] {
  const out: string[] = [];
  for (const line of lines.slice(from)) {
    if (stop(line)) break;
    if (!isBlank(line)) out.push(line);
  }
  return out;
}

/** Paragraphs (blank-line separated) from `from` until `stop` holds. */
function paragraphs(lines: string[], from: number, stop: (line: string) => boolean): string[] {
  const out: string[] = [];
  let current: string[] = [];
  for (const line of lines.slice(from)) {
    if (stop(line)) break;
    if (isBlank(line)) {
      if (current.length > 0) out.push(current.join("\n"));
      current = [];
    } else current.push(line);
  }
  if (current.length > 0) out.push(current.join("\n"));
  return out;
}

/** Title: the first "<n>. Title" line; failing that, the line right above the first difficulty chip. */
function findTitle(lines: string[]): { index: number; title: string } {
  let previous = "";
  let fallback = { index: -1, title: "" };
  for (const [i, line] of lines.entries()) {
    if (TITLE.test(line)) return { index: i, title: line.replace(TITLE, "$2").trim() };
    if (fallback.index < 0 && DIFFICULTY.has(line)) fallback = { index: i - 1, title: previous };
    previous = line;
  }
  return fallback;
}

/** The page from its title line to the Discussion header: what the model needs, without the menus, editor and comments. */
export function trimPage(text: string): string {
  const lines = text.split(/\r?\n/);
  const start = Math.max(findTitle(lines.map((l) => l.trim())).index, 0);
  const end = find(lines, start, (l) => l.trim().startsWith("Discussion"));
  return lines.slice(start, end < 0 ? lines.length : end).join("\n");
}

/**
 * Split a whole-page LeetCode copy (select all, copy) into the problem's parts.
 * Line-based and linear; no regex runs across the whole text.
 */
export function parseLeetCodePaste(text: string): ParsedProblem {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const { index: titleAt, title } = findTitle(lines);
  const url = title === "" ? "" : slugUrl(title);

  // Statement: after the difficulty and chip lines, up to the first example (or the constraints).
  const orEnd = (i: number): number => (i < 0 ? lines.length : i);
  const bodyAt = orEnd(find(lines, titleAt + 1, (l) => !(isBlank(l) || DIFFICULTY.has(l) || CHIPS.has(l))));
  const isSectionEnd = (l: string): boolean => EXAMPLE.test(l) || l === CONSTRAINTS || l === ACCEPTED;
  const statementParts = titleAt < 0 ? [] : paragraphs(lines, bodyAt, isSectionEnd);

  const exampleAt = find(lines, bodyAt, (l) => EXAMPLE.test(l));
  const constraintsAt = find(lines, bodyAt, (l) => l === CONSTRAINTS);
  const exampleLines = exampleAt < 0 ? [] : collect(lines, exampleAt, (l) => l === CONSTRAINTS || l === ACCEPTED);
  const examples = exampleLines.map((l, i) => (i > 0 && EXAMPLE.test(l) ? `\n${l}` : l)).join("\n");

  const constraintsFrom = constraintsAt < 0 ? lines.length : orEnd(find(lines, constraintsAt + 1, (l) => !isBlank(l)));
  const constraintLines = collect(lines, constraintsFrom, (l) => isBlank(l) || isFollowUp(l) || l === ACCEPTED).map(repairExponents);
  const afterConstraints = constraintsAt < 0 ? bodyAt : constraintsFrom + constraintLines.length;
  const acceptedAt = find(lines, afterConstraints, (l) => l === ACCEPTED);
  const followUp = lines.slice(afterConstraints, acceptedAt < 0 ? lines.length : acceptedAt).find(isFollowUp);
  if (followUp !== undefined) statementParts.push(followUp);

  // Tags: chips under the "Topics" header past the stats block (the chip row under the title is the first "Topics").
  const firstTopics = find(lines, titleAt + 1, (l) => l === "Topics");
  const topicsAt = firstTopics < 0 ? -1 : find(lines, (acceptedAt < 0 ? firstTopics : acceptedAt) + 1, (l) => l === "Topics");
  const tags = topicsAt < 0 ? [] : collect(lines, topicsAt + 1, endsTags).filter((l) => !LEVEL_CHIPS.has(l));

  const hints: string[] = [];
  for (let i = find(lines, titleAt + 1, (l) => HINT.test(l)); i >= 0; i = find(lines, i + 1, (l) => HINT.test(l))) {
    const body = collect(lines, i + 1, endsHint).join("\n");
    if (body !== "") hints.push(body);
  }

  const problem: Problem = {
    title,
    url,
    statement: statementParts.join("\n\n"),
    examples,
    tags,
    hints,
    constraints: constraintLines.join("\n"),
  };
  return { problem, ...assess(problem), source: "parser" };
}
