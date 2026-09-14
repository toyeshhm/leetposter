import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/parse/route";
import type { ParseResponse } from "@/server/parse/types";

/** Every "auto" call here reaches leetcode.com; the "llm" and low-confidence ones reach Groq too. */
const NETWORK = { timeout: 40_000 };
const twoSum = readFileSync("tests/fixtures/leetcode-two-sum.txt", "utf8");
const median = readFileSync("tests/fixtures/leetcode-median-collapsed.txt", "utf8");
/** The median page with its Constraints block cut out and a title LeetCode does not know: no lookup, and the parser cannot be confident. */
const unknownNoConstraints = median.replace("Constraints:", "").replace("4. Median of Two Sorted Arrays", "4. Zzzqqqxxx Median Sorted");
/** No title line at all, so nothing to look up. */
const untitled = twoSum.replace("1. Two Sum", "").replace(/^Easy$/m, "");

function post(body: unknown, raw = false): Request {
  return new Request("http://test/api/parse", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? String(body) : JSON.stringify(body),
  });
}

async function json<T>(res: Response, status = 200): Promise<T> {
  const body: unknown = await res.json();
  expect(res.status, JSON.stringify(body)).toBe(status);
  return body as T;
}

describe("POST /api/parse", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("auto: a short text is a lookup", NETWORK, async () => {
    const body = await json<ParseResponse>(await POST(post({ text: "1147" })));
    expect(body.source).toBe("leetcode");
    expect(body.number).toBe("1147");
    expect(body.confidence).toBe("high");
    expect(body.warnings).toEqual([]);
    expect(body.problem.title).toBe("Longest Chunked Palindrome Decomposition");
    expect(body.problem.statement).toContain("subtext_1");
    expect(body.problem.tags).toHaveLength(6);
    expect(body.problem.hints).toHaveLength(2);
  });

  it("auto: an unknown short text is 404 in the game's voice", NETWORK, async () => {
    const body = await json<{ code: string; message: string }>(await POST(post({ text: "zzzqqqxxx not a problem" })), 404);
    expect(body.code).toBe("not-found");
    expect(body.message).toBe("LeetCode has no problem called zzzqqqxxx not a problem.");
  });

  it("auto: a whole page is checked against LeetCode, whose fields win, and never touches the model", NETWORK, async () => {
    vi.stubEnv("GROQ_API_KEY", "bogus-key-would-fail");
    const body = await json<ParseResponse>(await POST(post({ text: twoSum.replace("Hash Table", "Hash Tablet") })));
    expect(body.source).toBe("leetcode");
    expect(body.confidence).toBe("high");
    expect(body.warnings).toEqual([]);
    expect(body.number).toBe("1");
    expect(body.llmAvailable).toBe(true);
    expect(body.problem.title).toBe("Two Sum");
    expect(body.problem.tags).toEqual(["Array", "Hash Table"]);
    expect(body.problem.constraints).toContain("2 <= nums.length <= 10^4");
  });

  it("auto: the parser fills what LeetCode leaves empty", NETWORK, async () => {
    // Median has no hints on LeetCode; a hint the host pasted under the page survives the check.
    const body = await json<ParseResponse>(await POST(post({ text: median.replace("Discussion (1K)", "Hint 1\nThink of a partition.\nDiscussion (1K)") })));
    expect(body.source).toBe("leetcode");
    expect(body.problem.tags).toEqual(["Array", "Binary Search", "Divide and Conquer"]);
    expect(body.problem.hints).toEqual(["Think of a partition."]);
  });

  it("auto: a page whose title LeetCode does not know falls back to the parser, then the model, and says so", NETWORK, async () => {
    const body = await json<ParseResponse>(await POST(post({ text: unknownNoConstraints, mode: "auto" })));
    expect(body.source).toBe("llm");
    expect(body.llmAvailable).toBe(true);
    expect(body.warnings[0]).toBe("LeetCode did not answer; used the pasted text.");
    expect(body.problem.statement).toContain("median of the two sorted arrays");
    expect(body.problem.hints).toEqual([]);
  });

  it("auto: without a key that fallback stops at the parser, with its warnings", NETWORK, async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const body = await json<ParseResponse>(await POST(post({ text: unknownNoConstraints })));
    expect(body.source).toBe("parser");
    expect(body.confidence).toBe("low");
    expect(body.llmAvailable).toBe(false);
    expect(body.warnings[0]).toBe("LeetCode did not answer; used the pasted text.");
    expect(body.warnings.some((w) => w.includes("No constraints"))).toBe(true);
  });

  it("auto: a page without a title is not looked up at all", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const body = await json<ParseResponse>(await POST(post({ text: untitled })));
    expect(body.source).toBe("parser");
    expect(body.number).toBeUndefined();
    expect(body.problem.title).toBe("");
    expect(body.warnings[0]).toContain("No title found");
  });

  it("llm: always asks the model", NETWORK, async () => {
    const body = await json<ParseResponse>(await POST(post({ text: twoSum, mode: "llm" })));
    expect(body.source).toBe("llm");
    expect(body.problem.title).toBe("Two Sum");
    expect(body.problem.constraints).toContain("10^4");
    expect(body.problem.hints).toHaveLength(3);
  });

  it("rejects a bad body with 400", async () => {
    await json(await POST(post({})), 400);
    await json(await POST(post({ text: "" })), 400);
    await json(await POST(post({ text: "x".repeat(200_001) })), 400);
    await json(await POST(post({ text: "x", mode: "magic" })), 400);
    await json(await POST(post("{not json", true)), 400);
  });

  it("answers 500 when the model cannot be reached", NETWORK, async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_not_a_real_key");
    const body = await json<{ code: string }>(await POST(post({ text: twoSum, mode: "llm" })), 500);
    expect(body.code).toBe("internal");
  });
});
