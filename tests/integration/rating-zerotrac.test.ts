import { describe, expect, it, vi } from "vitest";
import { lookupLeetCode } from "@/server/lookup/leetcode";
import { lookupZerotrac } from "@/server/rating/zerotrac";

/** Every test here reads zerotrac's real list off GitHub; the last two read leetcode.com as well. */
const NETWORK = { timeout: 40_000 };
const GONE = "https://raw.githubusercontent.com/zerotrac/leetcode_problem_rating/main/no-such-file.txt";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("lookupZerotrac", () => {
  it("rates 1147 by id and by slug, and knows nothing of a problem that was never in a contest", NETWORK, async () => {
    expect(await lookupZerotrac("1147")).toBe(1912);
    expect(await lookupZerotrac(" Longest-Chunked-Palindrome-Decomposition ")).toBe(1912);
    expect(await lookupZerotrac("two-sum")).toBeNull();
  });

  it("answers the second caller from memory and re-reads the list only once the day is up", NETWORK, async () => {
    expect(await lookupZerotrac("1147")).toBe(1912);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + DAY_MS + 1000);
    expect(await lookupZerotrac("1147")).toBe(1912);
    vi.useRealTimers();
  });
});

describe("a looked-up problem carries a rating", () => {
  it("takes 1147's straight from the list", NETWORK, async () => {
    const { problem } = await lookupLeetCode("1147");
    expect(problem.rating).toBe(1912);
    expect(problem.rating).toBeGreaterThan(1800);
    expect(problem.rating).toBeLessThan(2600);
  });

  it("estimates one the list never rated", NETWORK, async () => {
    const { problem } = await lookupLeetCode("two sum");
    const rating = problem.rating ?? 0;
    // Easy, a little over half of all submissions accepted and no heavy tag: the bottom of the scale, wherever its acceptance drifts.
    expect(rating).toBeGreaterThanOrEqual(800);
    expect(rating).toBeLessThan(1200);
    expect(rating % 10).toBe(0);
  });
});

describe("a list that cannot be read", () => {
  // A fresh copy of the module: the give-up is per process, and the tests above want a working one.
  it("logs, answers null, and does not ask again for the rest of the process", NETWORK, async () => {
    vi.resetModules();
    const { lookupZerotrac: fresh } = await import("@/server/rating/zerotrac");
    expect(await fresh("1147", GONE)).toBeNull();
    expect(await fresh("1147")).toBeNull();
  });
});
