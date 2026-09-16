/** Everything the heuristic can see. A field is null when the source gave nothing, never a stand-in value. */
export interface RatingInputs {
  /** "Easy" / "Medium" / "Hard", any case; null when no difficulty word was found. */
  difficulty: string | null;
  /** Acceptance rate in percent (59 for 59.0%); null when unknown. */
  acRate: number | null;
  /** Tag names in either spelling: LeetCode's ("Dynamic Programming") or the bank's ("dp"). */
  tags: string[];
  /** The constraints block, one bound per line, exponents written 10^k. */
  constraints: string;
}

const BASE = new Map<string, number>([
  ["easy", 1000],
  ["medium", 1500],
  ["hard", 2000],
]);
const UNKNOWN_BASE = 1500;
const AC_PIVOT = 50;
const AC_PER_POINT = 8;
const AC_CAP = 300;
const TAG_CAP = 500;

/** Weight per tag, on the bank's slugs. A tag that is not here moves nothing; the zeroes are the deliberate ones. */
const WEIGHTS = new Map<string, number>([
  ["dp", 200],
  ["graphs", 150],
  ["shortest-paths", 150],
  ["segment-tree", 400],
  ["fenwick", 400],
  ["trie", 250],
  ["bitmasks", 200],
  ["greedy", 50],
  ["hashing", 0],
  ["two-pointers", 0],
  ["prefix-sums", 0],
  ["implementation", -100],
  ["simulation", -100],
  ["math", 100],
  ["number-theory", 200],
  ["dsu", 200],
  ["strings", 50],
]);

/** LeetCode's names for the same ideas, hyphenated. Anything not listed already reads as its own slug. */
const ALIASES = new Map<string, string>([
  ["dynamic-programming", "dp"],
  ["graph", "graphs"],
  ["shortest-path", "shortest-paths"],
  ["binary-indexed-tree", "fenwick"],
  ["union-find", "dsu"],
  ["bit-manipulation", "bitmasks"],
  ["bitmask", "bitmasks"],
  ["hash-table", "hashing"],
  ["hash-function", "hashing"],
  ["rolling-hash", "hashing"],
  ["string", "strings"],
  ["string-matching", "strings"],
  ["two-pointer", "two-pointers"],
  ["prefix-sum", "prefix-sums"],
]);

/** A bound on the input's own size rather than on the values in it: 10^9 on n means an O(n) answer is already out. */
const SIZE_BOUND = /\b[nmkq]\b|\.(length|size)\b/i;
const POWER = /(?<=10\^)\d+/g;

const clamp = (n: number, low: number, high: number): number => Math.min(Math.max(n, low), high);

const canonical = (tag: string): string => {
  const slug = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ALIASES.get(slug) ?? slug;
};

/** Each point of acceptance below 50 adds 8, each point above subtracts 8, capped either way at 300. */
function acceptance(acRate: number | null): number {
  if (acRate === null) return 0;
  return clamp((AC_PIVOT - acRate) * AC_PER_POINT, -AC_CAP, AC_CAP);
}

/** Tag weights, deduplicated (LeetCode lists "Rolling Hash" and "Hash Function" for one idea) and capped at +500. */
function tagWeight(tags: string[]): number {
  let sum = 0;
  for (const tag of new Set(tags.map(canonical))) sum += WEIGHTS.get(tag) ?? 0;
  return Math.min(sum, TAG_CAP);
}

/** +150 once any bound reaches 10^5, +250 when the input's size itself reaches 10^9 or 10^18. The larger wins; they do not stack. */
function magnitude(constraints: string): number {
  let bonus = 0;
  for (const line of constraints.split("\n")) {
    const top = Math.max(0, ...(line.match(POWER) ?? []).map(Number));
    if (top >= 5) bonus = Math.max(bonus, 150);
    if (top >= 9 && SIZE_BOUND.test(line)) bonus = Math.max(bonus, 250);
  }
  return bonus;
}

/**
 * The heuristic of README "Ratings", for a problem zerotrac does not carry: base by difficulty,
 * moved by acceptance, by what the tags promise and by how big the input may get. 800..3500, rounded to 10.
 */
export function estimateRating(inputs: RatingInputs): number {
  const base = BASE.get((inputs.difficulty ?? "").trim().toLowerCase()) ?? UNKNOWN_BASE;
  const raw = base + acceptance(inputs.acRate) + tagWeight(inputs.tags) + magnitude(inputs.constraints);
  return clamp(Math.round(raw / 10) * 10, 800, 3500);
}

/** LeetCode hides the acceptance rate in a JSON string inside its JSON, a shape it does not promise; a blob without one is simply no rate. */
export function acRateFrom(stats: string): number | null {
  const found = /"acRate"\s*:\s*"([\d.]+)%"/.exec(stats)?.[1];
  return found === undefined ? null : Number(found);
}
