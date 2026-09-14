import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseWithGroq } from "@/server/parse/groq";

const median = readFileSync("tests/fixtures/leetcode-median-collapsed.txt", "utf8");

describe("parseWithGroq against the real API", () => {
  it("sorts the median page without inventing hints", { timeout: 30_000 }, async () => {
    const { problem, source } = await parseWithGroq(median);
    expect(source).toBe("llm");
    expect(problem.title).toBe("Median of Two Sorted Arrays");
    expect(problem.url).toMatch(/^https?:\/\//);
    expect(problem.statement).toContain("median of the two sorted arrays");
    expect(problem.constraints).not.toBe("");
    expect(problem.constraints).toContain("2000");
    expect(problem.hints).toEqual([]);
  });
});
