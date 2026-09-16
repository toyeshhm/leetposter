import { z } from "zod";

/** Topic tags allowed in the bank (Codeforces-style, lowercase). */
export const BANK_TAGS = [
  "implementation", "math", "greedy", "sorting", "binary-search", "two-pointers", "prefix-sums",
  "hashing", "strings", "stack", "queue", "heap", "linked-list", "trees", "graphs", "bfs", "dfs",
  "shortest-paths", "dsu", "dp", "bitmasks", "number-theory", "combinatorics", "geometry",
  "sliding-window", "intervals", "simulation", "constructive", "brute-force", "recursion",
  "backtracking", "matrices", "games", "probability", "segment-tree", "fenwick", "trie",
] as const;

export const bankTag = z.enum(BANK_TAGS);

const io = z.object({ input: z.string().min(1), output: z.string().min(1) });

/**
 * One bank problem. Statements are plain text with line breaks; examples are inside the statement
 * as "Example k:" blocks (Input / Output / Explanation), exactly like a LeetCode paste, so the game
 * renders them the same way. The hidden tests live apart, in src/problems/tests (what the Judge in
 * the Hall runs) and src/problems/stress (the full max-constraint set, local, for the checker): a
 * static import of the stress set is 800 MB and neither a bundle nor a test worker survives it.
 */
export interface BankIo {
  input: string;
  output: string;
}

export interface BankCode {
  language: "python";
  code: string;
}

export interface BankProblem {
  id: string;
  title: string;
  lore: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  tags: (typeof BANK_TAGS)[number][];
  hints: string[];
  difficulty: "easy" | "medium" | "hard";
  rating: number;
  timeLimitMs: number;
  samples: BankIo[];
  solution: BankCode;
  brute: BankCode;
  cluster: string;
}

/** A problem's hidden tests, held in its own file and read only when the Judge asks for them. */
export const bankTests: z.ZodType<{ id: string; tests: BankIo[] }> = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,60}$/),
  tests: z.array(io).min(8),
});

export const bankProblem: z.ZodType<BankProblem> = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,60}$/),
  title: z.string().min(3).max(80),
  /** One or two sentences from the lore bible. */
  lore: z.string().min(10).max(400),
  statement: z.string().min(80).max(8000),
  inputFormat: z.string().min(10).max(2000),
  outputFormat: z.string().min(5).max(1000),
  /** One bound per line, e.g. "1 <= n <= 10^5". */
  constraints: z.string().min(5).max(2000),
  tags: z.array(bankTag).min(1).max(5),
  hints: z.array(z.string().min(10).max(500)).min(2).max(4),
  difficulty: z.enum(["easy", "medium", "hard"]),
  /** Leetposter rating, 800..3500 (see README "Ratings"). */
  rating: z.number().int().min(800).max(3500),
  /** Time limit for the in-browser judge (Pyodide is 3 to 5x slower than CPython). */
  timeLimitMs: z.number().int().min(1000).max(20000),
  samples: z.array(io).min(1).max(3),
  solution: z.object({ language: z.literal("python"), code: z.string().min(20) }),
  /** An independent, deliberately simple solution used only to cross-check the tests. */
  brute: z.object({ language: z.literal("python"), code: z.string().min(20) }),
  /** Which themed cluster this belongs to (see the authoring brief). */
  cluster: z.string().min(2).max(40),
});
