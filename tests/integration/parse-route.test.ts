import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/parse/route";
import type { ParseResponse } from "@/server/parse/types";

const twoSum = readFileSync("tests/fixtures/leetcode-two-sum.txt", "utf8");
const median = readFileSync("tests/fixtures/leetcode-median-collapsed.txt", "utf8");
/** The median page with its Constraints block cut out: the parser cannot be confident about it. */
const medianNoConstraints = median.replace("Constraints:", "");

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

  it("auto: a confident parse never touches the model", async () => {
    vi.stubEnv("GROQ_API_KEY", "bogus-key-would-fail");
    const body = await json<ParseResponse>(await POST(post({ text: twoSum })));
    expect(body.source).toBe("parser");
    expect(body.confidence).toBe("high");
    expect(body.llmAvailable).toBe(true);
    expect(body.problem.title).toBe("Two Sum");
    expect(body.problem.tags).toEqual(["Array", "Hash Table"]);
  });

  it("auto: a low-confidence parse falls back to the model and keeps what the parser found", { timeout: 30_000 }, async () => {
    const body = await json<ParseResponse>(await POST(post({ text: medianNoConstraints, mode: "auto" })));
    expect(body.source).toBe("llm");
    expect(body.llmAvailable).toBe(true);
    expect(body.problem.title).toBe("Median of Two Sorted Arrays");
    expect(body.problem.statement).toContain("median of the two sorted arrays");
    expect(body.problem.hints).toEqual([]);
  });

  it("auto: without a key a low-confidence parse comes back as is, with warnings", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const body = await json<ParseResponse>(await POST(post({ text: medianNoConstraints })));
    expect(body.source).toBe("parser");
    expect(body.confidence).toBe("low");
    expect(body.llmAvailable).toBe(false);
    expect(body.warnings.some((w) => w.includes("No constraints"))).toBe(true);
  });

  it("llm: always asks the model", { timeout: 30_000 }, async () => {
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

  it("answers 500 when the model cannot be reached", { timeout: 30_000 }, async () => {
    vi.stubEnv("GROQ_API_KEY", "gsk_not_a_real_key");
    const body = await json<{ code: string }>(await POST(post({ text: twoSum, mode: "llm" })), 500);
    expect(body.code).toBe("internal");
  });
});
