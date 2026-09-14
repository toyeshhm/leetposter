import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { htmlToText, splitContent } from "@/server/lookup/html";

/** The real GraphQL answer for 1147, saved by a one-off node fetch on 2026-09-13. */
const fixture = JSON.parse(readFileSync("tests/fixtures/leetcode-graphql-1147.json", "utf8")) as {
  data: { question: { content: string; hints: string[]; topicTags: { name: string }[] } };
};
const { content, hints, topicTags } = fixture.data.question;

describe("htmlToText on the real 1147 page", () => {
  const text = htmlToText(content);
  const { statement, constraints } = splitContent(text);

  it("turns <sub> into _ and keeps the prose paragraphs and list items on their own lines", () => {
    expect(statement.startsWith(
      [
        "You are given a string text. You should split it to k substrings (subtext_1, subtext_2, ..., subtext_k) such that:",
        "",
        "subtext_i is a non-empty string.",
        "The concatenation of all the substrings is equal to text (i.e., subtext_1 + subtext_2 + ... + subtext_k == text).",
        "subtext_i == subtext_k - i + 1 for all valid values of i (i.e., 1 <= i <= k).",
        "",
        "Return the largest possible value of k.",
        "",
        "Example 1:",
        'Input: text = "ghiabcdefhelloadamhelloabcdefghi"',
        "Output: 7",
        'Explanation: We can split the string on "(ghi)(abcdef)(hello)(adam)(hello)(abcdef)(ghi)".',
        "",
        "Example 2:",
      ].join("\n"),
    )).toBe(true);
  });

  it("keeps the three Example blocks verbatim and ends the statement with the last one", () => {
    expect(statement.split("\n").filter((l) => /^Example \d+:$/.test(l))).toEqual(["Example 1:", "Example 2:", "Example 3:"]);
    expect(statement.endsWith('Explanation: We can split the string on "(a)(nt)(a)(pre)(za)(tep)(za)(pre)(a)(nt)(a)".')).toBe(true);
    expect(statement).not.toContain("Constraints");
    expect(statement).not.toMatch(/<\/?[a-z]/);
  });

  it("splits the constraints list off (this problem's bound is a plain 1000)", () => {
    expect(constraints).toBe("1 <= text.length <= 1000\ntext consists only of lowercase English characters.");
  });

  it("converts both hints and reads the six tags", () => {
    expect(hints.map((h) => htmlToText(h))).toEqual([
      "Using a rolling hash, we can quickly check whether two strings are equal.",
      "Use that as the basis of a dp.",
    ]);
    expect(topicTags.map((t) => t.name)).toEqual(["Two Pointers", "String", "Dynamic Programming", "Greedy", "Rolling Hash", "Hash Function"]);
  });
});

describe("htmlToText details", () => {
  it("restores exponents from <sup>, decodes entities, and keeps <br> and headings as line breaks", () => {
    expect(htmlToText("<p>2 &lt;= n &lt;= 10<sup>4</sup> &amp; -10<sup>9</sup> &lt;= x<br/>&quot;a&quot; &#39;b&#39;&nbsp;c</p><h2>Note</h2><div>d</div>")).toBe(
      '2 <= n <= 10^4 & -10^9 <= x\n"a" \'b\' c\n\nNote\n\nd',
    );
  });

  it("handles a nested tag inside <sup> and a <pre> with attributes", () => {
    expect(htmlToText('<p>O(n<sup><em>2</em></sup>)</p><pre class="x">\na &lt; b\n\n  c\n</pre><p>after</p>')).toBe("O(n^2)\na < b\n\n  c\n\nafter");
  });

  it("collapses runs of blank lines to one", () => {
    expect(htmlToText("<p>a</p><p>&nbsp;</p><p>&nbsp;</p><p>b</p>")).toBe("a\n\nb");
  });
});

describe("splitContent", () => {
  it("puts a Follow-up after the constraints list back onto the statement, as the paste parser does", () => {
    const text = htmlToText(
      "<p>Given nums.</p><p>&nbsp;</p><p><strong>Constraints:</strong></p><ul><li><code>2 &lt;= nums.length &lt;= 10<sup>4</sup></code></li><li><strong>Only one valid answer exists.</strong></li></ul><p>&nbsp;</p><strong>Follow-up:&nbsp;</strong>Can you do it in less than <code>O(n<sup>2</sup>)</code> time?",
    );
    expect(splitContent(text)).toEqual({
      statement: "Given nums.\n\nFollow-up: Can you do it in less than O(n^2) time?",
      constraints: "2 <= nums.length <= 10^4\nOnly one valid answer exists.",
    });
  });

  it("leaves the constraints empty when the page has no Constraints heading", () => {
    expect(splitContent("Just prose.")).toEqual({ statement: "Just prose.", constraints: "" });
  });
});
