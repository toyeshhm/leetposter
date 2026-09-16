import { describe, expect, it } from "vitest";
import { acRateFrom, estimateRating, type RatingInputs } from "@/server/rating/estimate";

/** Nothing known: the unknown base, untouched. */
const NOTHING: RatingInputs = { difficulty: null, acRate: null, tags: [], constraints: "" };
const rate = (over: Partial<RatingInputs>): number => estimateRating({ ...NOTHING, ...over });

describe("estimateRating: the base", () => {
  it("reads the difficulty word in any case, with the spaces the paste left on it", () => {
    expect(rate({ difficulty: "Easy" })).toBe(1000);
    expect(rate({ difficulty: "medium" })).toBe(1500);
    expect(rate({ difficulty: " HARD " })).toBe(2000);
  });

  it("sits at 1500 when the difficulty is missing or is not a difficulty", () => {
    expect(rate({})).toBe(1500);
    expect(rate({ difficulty: "Impossible" })).toBe(1500);
  });
});

describe("estimateRating: the acceptance rate", () => {
  it("adds 8 a point below 50 and subtracts 8 a point above", () => {
    expect(rate({ difficulty: "Easy", acRate: 25 })).toBe(1200);
    expect(rate({ difficulty: "Hard", acRate: 60 })).toBe(1920);
  });

  it("caps the swing at 300 either way", () => {
    expect(rate({ difficulty: "Medium", acRate: 0 })).toBe(1800);
    expect(rate({ difficulty: "Medium", acRate: 100 })).toBe(1200);
  });

  it("moves nothing when no rate is known", () => {
    expect(rate({ difficulty: "Medium", acRate: null })).toBe(1500);
  });
});

describe("estimateRating: the tags", () => {
  it("weighs LeetCode's names and the bank's slugs the same", () => {
    expect(rate({ difficulty: "Medium", tags: ["Dynamic Programming"] })).toBe(1700);
    expect(rate({ difficulty: "Medium", tags: ["dp"] })).toBe(1700);
    expect(rate({ difficulty: "Medium", tags: ["Union Find"] })).toBe(1700);
    expect(rate({ difficulty: "Medium", tags: ["Binary Indexed Tree"] })).toBe(1900);
  });

  it("counts one idea once, however many names LeetCode files it under", () => {
    expect(rate({ difficulty: "Medium", tags: ["Bit Manipulation", "Bitmask", "bitmasks"] })).toBe(1700);
  });

  it("takes implementation and simulation back down, and shrugs at a tag it does not know", () => {
    expect(rate({ difficulty: "Medium", tags: ["implementation", "Simulation"] })).toBe(1300);
    expect(rate({ difficulty: "Medium", tags: ["Array", "Hash Table", "Two Pointers", "Prefix Sum"] })).toBe(1500);
  });

  it("caps the sum at 500, however many heavy tags a problem carries", () => {
    expect(rate({ difficulty: "Medium", tags: ["Segment Tree", "Binary Indexed Tree", "Trie", "Dynamic Programming"] })).toBe(2000);
  });

  it("adds the small ones: greedy, strings, math, number theory, graphs and shortest paths", () => {
    expect(rate({ difficulty: "Easy", tags: ["greedy", "strings"] })).toBe(1100);
    expect(rate({ difficulty: "Easy", tags: ["math", "number-theory"] })).toBe(1300);
    expect(rate({ difficulty: "Easy", tags: ["Graph", "Shortest Path"] })).toBe(1300);
  });
});

describe("estimateRating: the constraints", () => {
  it("ignores a small input and a line with no bound at all", () => {
    expect(rate({ difficulty: "Medium", constraints: "1 <= nums.length <= 10^4\ntext consists only of lowercase English characters." })).toBe(1500);
  });

  it("adds 150 once any bound reaches 10^5", () => {
    expect(rate({ difficulty: "Medium", constraints: "1 <= n <= 2 * 10^5\n1 <= a_i <= 10^9" })).toBe(1650);
  });

  it("adds 250 when the input's own size reaches 10^9 or 10^18, and only 150 when 10^9 bounds the values", () => {
    expect(rate({ difficulty: "Medium", constraints: "1 <= n <= 10^9" })).toBe(1750);
    expect(rate({ difficulty: "Medium", constraints: "1 <= nums.length <= 10^18" })).toBe(1750);
    expect(rate({ difficulty: "Medium", constraints: "1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9" })).toBe(1650);
  });
});

describe("estimateRating: the whole sum", () => {
  it("rounds to ten and never drops below 800", () => {
    expect(rate({ difficulty: "Easy", acRate: 44.4 })).toBe(1040);
    expect(rate({ difficulty: "Easy", acRate: 95, tags: ["implementation", "simulation"] })).toBe(800);
  });

  it("rates a hard dp problem on a big input where a human would", () => {
    expect(rate({ difficulty: "Hard", acRate: 40, tags: ["Dynamic Programming"], constraints: "1 <= n <= 10^5" })).toBe(2430);
  });
});

describe("acRateFrom", () => {
  it("digs the percentage out of the JSON string LeetCode buries it in", () => {
    expect(acRateFrom('{"totalAccepted": "33.2K", "acRate": "59.0%"}')).toBe(59);
  });

  it("is null when the blob carries no rate", () => {
    expect(acRateFrom('{"totalAccepted": "33.2K"}')).toBeNull();
  });
});
