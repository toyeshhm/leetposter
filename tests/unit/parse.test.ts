import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assess, fillEmpty, parseLeetCodePaste, repairExponents, slugUrl, trimPage } from "@/server/parse/leetcode";

const twoSum = readFileSync("tests/fixtures/leetcode-two-sum.txt", "utf8");
const median = readFileSync("tests/fixtures/leetcode-median-collapsed.txt", "utf8");
const chunked = readFileSync("tests/fixtures/leetcode-chunked-palindrome-partial.txt", "utf8");

describe("parseLeetCodePaste: two sum (Topics and Hints expanded)", () => {
  const { problem, confidence, warnings, source } = parseLeetCodePaste(twoSum);

  it("finds the title and builds the url", () => {
    expect(problem.title).toBe("Two Sum");
    expect(problem.url).toBe("https://leetcode.com/problems/two-sum/");
    expect(source).toBe("parser");
  });

  it("keeps the three statement paragraphs, then the three example blocks verbatim, then the follow-up", () => {
    expect(problem.statement).toBe(
      [
        "You are given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
        "You may assume that each input would have exactly one solution, and you may not use the same element twice.",
        "You can return the answer in any order.",
        [
          "Example 1:",
          "Input: nums = [2,7,11,15], target = 9",
          "Output: [0,1]",
          "Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].",
          "",
          "Example 2:",
          "Input: nums = [3,2,4], target = 6",
          "Output: [1,2]",
          "",
          "Example 3:",
          "Input: nums = [3,3], target = 6",
          "Output: [0,1]",
        ].join("\n"),
        "Follow-up: Can you come up with an algorithm that is less than O(n2) time complexity?",
      ].join("\n\n"),
    );
  });

  it("restores the exponents in the constraints", () => {
    expect(problem.constraints).toBe(
      ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "-10^9 <= target <= 10^9", "Only one valid answer exists."].join("\n"),
    );
  });

  it("takes the tags from the second Topics block and drops the level chip", () => {
    expect(problem.tags).toEqual(["Array", "Hash Table"]);
  });

  it("takes the three hints verbatim", () => {
    expect(problem.hints).toEqual([
      "A really brute force way would be to search for all possible pairs of numbers but that would be too slow. Again, it's best to try out brute force solutions just for completeness. It is from these brute force solutions that you can come up with optimizations.",
      "So, if we fix one of the numbers, say x, we have to scan the entire array to find the next number y which is value - x where value is the input parameter. Can we change our array somehow so that this search becomes faster?",
      "The second train of thought is, without changing the array, can we use additional space somehow? Like maybe a hash map to speed up the search?",
    ]);
  });

  it("is confident with no warnings", () => {
    expect(confidence).toBe("high");
    expect(warnings).toEqual([]);
  });
});

describe("parseLeetCodePaste: median (Topics collapsed, no hints)", () => {
  const { problem, confidence, warnings } = parseLeetCodePaste(median);

  it("finds the title and url", () => {
    expect(problem.title).toBe("Median of Two Sorted Arrays");
    expect(problem.url).toBe("https://leetcode.com/problems/median-of-two-sorted-arrays/");
  });

  it("keeps the statement and both examples", () => {
    expect(problem.statement.startsWith(
      "Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.\n\nThe overall run time complexity should be O(log (m+n)).\n\nExample 1:\n",
    )).toBe(true);
    expect(problem.statement.split("\n").filter((l) => l.startsWith("Example"))).toEqual(["Example 1:", "Example 2:"]);
    expect(problem.statement.endsWith("Explanation: merged array = [1,2,3,4] and median is (2 + 3) / 2 = 2.5.")).toBe(true);
    expect(problem.statement).not.toContain("Constraints");
  });

  it("keeps the constraints intact, with 1000 and 2000 untouched", () => {
    expect(problem.constraints).toBe(
      ["nums1.length == m", "nums2.length == n", "0 <= m <= 1000", "0 <= n <= 1000", "1 <= m + n <= 2000", "-10^6 <= nums1[i], nums2[i] <= 10^6"].join("\n"),
    );
  });

  it("has no tags and no hints, warns about Topics, and stays confident", () => {
    expect(problem.tags).toEqual([]);
    expect(problem.hints).toEqual([]);
    expect(warnings.some((w) => w.includes("Topics were collapsed"))).toBe(true);
    expect(warnings.some((w) => w.includes("No hints"))).toBe(true);
    expect(confidence).toBe("high");
  });
});

describe("parseLeetCodePaste: chunked palindrome (Solved status line, Hint chip, no constraints)", () => {
  const { problem, confidence, warnings } = parseLeetCodePaste(chunked);

  it("finds the title past the status line and builds the url", () => {
    expect(problem.title).toBe("Longest Chunked Palindrome Decomposition");
    expect(problem.url).toBe("https://leetcode.com/problems/longest-chunked-palindrome-decomposition/");
  });

  it("starts the statement at the prose and carries all three examples to the last explanation", () => {
    expect(problem.statement.startsWith("You are given a string text. You should split it to k substrings")).toBe(true);
    expect(problem.statement.split("\n").filter((l) => l.startsWith("Example"))).toEqual(["Example 1:", "Example 2:", "Example 3:"]);
    expect(problem.statement.endsWith('Explanation: We can split the string on "(a)(nt)(a)(pre)(za)(tep)(za)(pre)(a)(nt)(a)".')).toBe(true);
    expect(problem.statement).not.toContain("Solved");
  });

  it("has no constraints, so confidence is low and the warnings say so", () => {
    expect(problem.constraints).toBe("");
    expect(problem.tags).toEqual([]);
    expect(problem.hints).toEqual([]);
    expect(confidence).toBe("low");
    expect(warnings.some((w) => w.startsWith("No constraints found"))).toBe(true);
  });

  it("skips an Attempted status line the same way", () => {
    const { problem: attempted } = parseLeetCodePaste(chunked.replace("\nSolved\n", "\nAttempted\n"));
    expect(attempted.statement).toBe(problem.statement);
  });
});

describe("parseLeetCodePaste: edge cases", () => {
  it("empty input is low confidence with everything missing", () => {
    const { problem, confidence, warnings } = parseLeetCodePaste("");
    expect(problem).toEqual({ title: "", url: "", statement: "", tags: [], hints: [], constraints: "" });
    expect(confidence).toBe("low");
    expect(warnings).toHaveLength(5);
  });

  it("garbage input finds nothing", () => {
    const { problem, confidence } = parseLeetCodePaste("lorem ipsum\n\ndolor sit amet\nConstraints are not here");
    expect(problem.title).toBe("");
    expect(problem.statement).toBe("");
    expect(problem.constraints).toBe("");
    expect(confidence).toBe("low");
  });

  it("a title without a number is the line above the difficulty", () => {
    const text = ["Reverse Linked List", "Easy", "Topics", "Companies", "", "Given the head of a list, reverse it.", "", "Example 1:", "Input: head = [1,2]", "Output: [2,1]", "", "Constraints:", "", "1 <= n <= 5000", "", "Accepted", "Easy"].join("\n");
    const { problem, confidence } = parseLeetCodePaste(text);
    expect(problem.title).toBe("Reverse Linked List");
    expect(problem.url).toBe("https://leetcode.com/problems/reverse-linked-list/");
    expect(problem.statement).toBe("Given the head of a list, reverse it.\n\nExample 1:\nInput: head = [1,2]\nOutput: [2,1]");
    expect(problem.constraints).toBe("1 <= n <= 5000");
    expect(confidence).toBe("high");
  });

  it("a page whose text ends inside the hints still yields them", () => {
    const text = ["7. Foo", "Easy", "Foo bar.", "Constraints:", "1 <= n <= 109", "Accepted", "Topics", "Senior", "Math", "icon", "Hint 1", "Think.", "Hint 2", "", "Hint 3", "Harder."].join("\n");
    const { problem } = parseLeetCodePaste(text);
    expect(problem.tags).toEqual(["Math"]);
    expect(problem.hints).toEqual(["Think.", "Harder."]);
    expect(problem.statement).toBe("Foo bar.");
    expect(problem.constraints).toBe("1 <= n <= 10^9");
  });

  it("a page without an Accepted line still stops the constraints and finds the follow-up", () => {
    const text = ["8. Bar", "Medium", "Bar baz.", "", "Constraints:", "n == 104", "", "Follow up: can you do it in O(1)?", "Topics", "Math"].join("\n");
    const { problem } = parseLeetCodePaste(text);
    expect(problem.constraints).toBe("n == 10^4");
    expect(problem.statement).toBe("Bar baz.\n\nFollow up: can you do it in O(1)?");
    expect(problem.tags).toEqual([]);
  });

  it("a title with nothing after it, or a Constraints header with nothing under it, yields empty parts", () => {
    const bare = parseLeetCodePaste("1. Foo\nEasy\nTopics");
    expect(bare.problem).toEqual({ title: "Foo", url: "https://leetcode.com/problems/foo/", statement: "", tags: [], hints: [], constraints: "" });
    const headerOnly = parseLeetCodePaste("1. Foo\nFoo bar.\nConstraints:\n\n");
    expect(headerOnly.problem.statement).toBe("Foo bar.");
    expect(headerOnly.problem.constraints).toBe("");
    expect(headerOnly.confidence).toBe("low");
  });

  it("does not run out of time on a large paste", () => {
    const big = `${twoSum}\n${"x".repeat(1000)}\n`.repeat(200);
    expect(big.length).toBeGreaterThan(200_000);
    const started = Date.now();
    expect(parseLeetCodePaste(big).problem.title).toBe("Two Sum");
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("repairExponents", () => {
  it.each([
    ["2 <= nums.length <= 104", "2 <= nums.length <= 10^4"],
    ["-109 <= x <= 109", "-10^9 <= x <= 10^9"],
    ["2 * 104", "2 * 10^4"],
    ["1 <= n <= 1010", "1 <= n <= 10^10"],
    ["n <= 1018", "n <= 10^18"],
    ["n <= 1019", "n <= 1019"],
    ["n <= 1000", "n <= 1000"],
    ["n <= 2000", "n <= 2000"],
    ["n <= 100", "n <= 100"],
    ["n <= 10", "n <= 10"],
    ["n <= 10^4", "n <= 10^4"],
    ["x1049 <= 1041", "x1049 <= 1041"],
  ])("%s -> %s", (input, expected) => {
    expect(repairExponents(input)).toBe(expected);
  });
});

describe("slugUrl", () => {
  it("lowercases, hyphenates and trims", () => {
    expect(slugUrl("  Best Time to Buy & Sell Stock II! ")).toBe("https://leetcode.com/problems/best-time-to-buy-sell-stock-ii/");
  });
});

describe("assess", () => {
  it("is high only when title, statement and constraints exist", () => {
    const full = { title: "t", url: "u", statement: "s", tags: [], hints: [], constraints: "c" };
    expect(assess(full).confidence).toBe("high");
    expect(assess(full).warnings).toHaveLength(2);
    expect(assess({ ...full, statement: "" }).confidence).toBe("low");
  });
});

describe("fillEmpty", () => {
  const base = { title: "T", url: "https://leetcode.com/problems/t/", statement: "S", tags: ["a"], hints: ["h"], constraints: "C" };
  const empty = { title: "", url: "", statement: "", tags: [], hints: [], constraints: "" };
  const full = { title: "T2", url: "https://x.test/", statement: "S2", tags: ["b"], hints: ["h2"], constraints: "C2" };

  it("keeps every base field the overlay leaves empty", () => {
    expect(fillEmpty(base, empty)).toEqual(base);
  });

  it("takes every overlay field that is filled", () => {
    expect(fillEmpty(base, full)).toEqual(full);
  });
});

describe("trimPage", () => {
  it("keeps the title through the last hint and drops the menus, discussion and editor", () => {
    const trimmed = trimPage(twoSum);
    expect(trimmed.startsWith("1. Two Sum\n")).toBe(true);
    expect(trimmed.endsWith("Similar Questions")).toBe(true);
    expect(trimmed).not.toContain("class Solution");
  });

  it("keeps everything when there is no title or Discussion line", () => {
    expect(trimPage("just\nsome text")).toBe("just\nsome text");
  });
});
