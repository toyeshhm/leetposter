import { describe, expect, it } from "vitest";
import { statementRuns } from "@/components/game/statement";

describe("statementRuns", () => {
  it("splits prose from example blocks and keeps blank lines inside a run", () => {
    const statement = ["Given nums, return indices.", "", "Any order.", "", "Example 1:", "Input: nums = [2,7]", "Output: [0,1]", "Explanation: 2 + 7.", "", "Example 2:", "Input: nums = [3,3]", "Output: [0,1]", "", "Follow-up: faster?"].join("\n");
    expect(statementRuns(statement)).toEqual([
      { kind: "prose", text: "Given nums, return indices.\n\nAny order." },
      { kind: "example", text: "Example 1:\nInput: nums = [2,7]\nOutput: [0,1]\nExplanation: 2 + 7.\n\nExample 2:\nInput: nums = [3,3]\nOutput: [0,1]" },
      { kind: "prose", text: "Follow-up: faster?" },
    ]);
  });

  it("is one prose run for a statement without examples, and empty for an empty statement", () => {
    expect(statementRuns("Just words.")).toEqual([{ kind: "prose", text: "Just words." }]);
    expect(statementRuns("\n\n")).toEqual([]);
  });
});
