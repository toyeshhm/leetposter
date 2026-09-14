import { describe, expect, it } from "vitest";
import { GameError } from "@/game/errors";
import { respond } from "@/server/handlers";
import { lookupLeetCode } from "@/server/lookup/leetcode";

/** Every test here talks to leetcode.com itself. */
const NETWORK = { timeout: 40_000 };

async function failsWith(work: Promise<unknown>, code: string, message: RegExp): Promise<void> {
  const error = await work.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect((error as GameError).code).toBe(code);
  expect((error as GameError).message).toMatch(message);
}

describe("lookupLeetCode", () => {
  it("fetches 1147 by number", NETWORK, async () => {
    const { problem, number, source, confidence, warnings } = await lookupLeetCode(" 1147 ");
    expect(number).toBe("1147");
    expect(source).toBe("leetcode");
    expect(problem.title).toBe("Longest Chunked Palindrome Decomposition");
    expect(problem.url).toBe("https://leetcode.com/problems/longest-chunked-palindrome-decomposition/");
    expect(problem.statement).toContain("subtext_1");
    expect(problem.statement).toContain("Example 3:");
    expect(problem.constraints).toBe("1 <= text.length <= 1000\ntext consists only of lowercase English characters.");
    expect(problem.tags).toEqual(["Two Pointers", "String", "Dynamic Programming", "Greedy", "Rolling Hash", "Hash Function"]);
    expect(problem.hints).toHaveLength(2);
    expect(confidence).toBe("high");
    expect(warnings).toEqual([]);
  });

  it("fetches Two Sum by exact title, with exponents and the follow-up in place", NETWORK, async () => {
    const { problem } = await lookupLeetCode("two sum");
    expect(problem.title).toBe("Two Sum");
    expect(problem.constraints).toContain("2 <= nums.length <= 10^4");
    expect(problem.constraints).toContain("-10^9 <= nums[i] <= 10^9");
    expect(problem.statement).toMatch(/Follow-up: Can you come up with an algorithm that is less than O\(n\^2\)/);
    expect(problem.statement).not.toContain("Constraints:");
    expect(problem.tags).toEqual(["Array", "Hash Table"]);
    expect(problem.hints).toHaveLength(3);
  });

  it("takes a leetcode.com link straight to the slug", NETWORK, async () => {
    const { problem } = await lookupLeetCode("https://leetcode.com/problems/longest-chunked-palindrome-decomposition/description/");
    expect(problem.title).toBe("Longest Chunked Palindrome Decomposition");
  });

  it("takes the first hit that carries every word when no title matches exactly", NETWORK, async () => {
    const { problem } = await lookupLeetCode("longest chunked palindrome");
    expect(problem.title).toBe("Longest Chunked Palindrome Decomposition");
  });

  it("says not-found for a title the search only fuzzes at, an unknown number and an unknown slug", NETWORK, async () => {
    await failsWith(lookupLeetCode("zzzqqqxxx not a problem"), "not-found", /no problem called zzzqqqxxx not a problem\./);
    await failsWith(lookupLeetCode("999999"), "not-found", /no problem called 999999\./);
    await failsWith(lookupLeetCode("https://leetcode.com/problems/no-such-slug-xyz/"), "not-found", /no problem called/);
  });

  it("says not-found for a problem behind the paywall", NETWORK, async () => {
    await failsWith(lookupLeetCode("https://leetcode.com/problems/meeting-rooms/"), "not-found", /Meeting Rooms behind its paywall/);
  });

  it("says upstream when LeetCode answers with a Cloudflare page or not at all", NETWORK, async () => {
    await failsWith(lookupLeetCode("1147", "https://leetcode.com/graphql-nope"), "upstream", /LeetCode did not answer/);
    await failsWith(lookupLeetCode("1147", "http://127.0.0.1:1/graphql"), "upstream", /LeetCode did not answer/);
  });
});

describe("respond", () => {
  it("maps upstream to 502", async () => {
    const res = await respond(() => Promise.reject(new GameError("upstream", "LeetCode did not answer.")));
    expect(res.status).toBe(502);
    expect(((await res.json()) as { code: string }).code).toBe("upstream");
  });
});
